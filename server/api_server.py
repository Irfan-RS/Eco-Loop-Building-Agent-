import sys
import os
from pathlib import Path
from typing import Dict, Any, List

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import pandas as pd
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config.settings import IDF_FILE, WEATHER_FILE, OUTPUT_DIR
from simulator.discovery import BuildingDiscovery
from simulator.runner import run_comparative_simulations
from agent.mcp_server import MCPServer

app = FastAPI(
    title="EcoLoop Building Agent API",
    description="REST API for EnergyPlus simulation metrics, dynamic MCP agent controls, and model inspection",
    version="1.0.0",
)

# Enable CORS for React frontend (localhost:5173 / localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


outputs_folder = BASE_DIR / "outputs"

active_config = {
    "model": "5ZoneAirCooled.idf",
    "weather": "Chicago_OHare_TMY3.epw",
    "period": "5days",
}


def get_location_metadata(weather_name: str = None) -> dict:
    from config.settings import resolve_weather_file
    epw_path = resolve_weather_file(weather_name or active_config["weather"])
    try:
        with open(epw_path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline().strip()
            if first_line.startswith("LOCATION"):
                parts = first_line.split(",")
                city = parts[1].strip() if len(parts) > 1 else "Unknown"
                state = parts[2].strip() if len(parts) > 2 else ""
                country = parts[3].strip() if len(parts) > 3 else "USA"
                lat = float(parts[6]) if len(parts) > 6 else 0.0
                lon = float(parts[7]) if len(parts) > 7 else 0.0
                elev = float(parts[9]) if len(parts) > 9 else 0.0
                climate = "Zone 5A (Cold / Hot Summer Swings)" if ("Chicago" in city or "IL" in state) else "Zone 3C (Mild Coastal Mediterranean)"
                return {
                    "city": city,
                    "state": state,
                    "country": country,
                    "display_name": f"{city}, {state}, {country}",
                    "latitude": lat,
                    "longitude": lon,
                    "elevation_m": elev,
                    "climate_zone": climate,
                }
    except Exception:
        pass
    return {
        "city": "Chicago Ohare Intl Ap",
        "state": "IL",
        "country": "USA",
        "display_name": "Chicago Ohare Intl Ap, IL, USA",
        "latitude": 41.98,
        "longitude": -87.92,
        "elevation_m": 201.0,
        "climate_zone": "Zone 5A (Cold / Hot Summer Swings)",
    }


@app.get("/api/status")
def get_status():
    """Return backend operational status and building model info."""
    loc = get_location_metadata(active_config["weather"])
    return {
        "status": "online",
        "building_model": active_config["model"],
        "weather_file": active_config["weather"],
        "location": loc,
        "baseline_data_exists": (outputs_folder / "baseline_metrics.csv").exists(),
        "aicontrolled_data_exists": (outputs_folder / "aicontrolled_metrics.csv").exists(),
    }


@app.get("/api/runs")
def list_runs():
    """List all timestamped build calculation run directories in outputs/."""
    runs = []
    if outputs_folder.exists():
        for item in sorted(outputs_folder.glob("run_*"), reverse=True):
            if item.is_dir():
                files = [f.name for f in item.glob("*")]
                runs.append({
                    "folder": item.name,
                    "path": str(item),
                    "created_time": item.stat().st_mtime,
                    "files_count": len(files),
                    "files": files,
                })
    return {"status": "success", "total_runs": len(runs), "runs": runs}



@app.get("/api/metrics")
def get_metrics():
    """Return time-series metrics and summary KPIs for Baseline vs AI-Controlled runs."""
    base_file = outputs_folder / "baseline_metrics.csv"
    ai_file = outputs_folder / "aicontrolled_metrics.csv"

    if not base_file.exists() or not ai_file.exists():
        # Auto-run simulation if CSV metrics don't exist yet
        try:
            run_comparative_simulations(
                model_name=active_config["model"],
                weather_name=active_config["weather"],
                period=active_config["period"]
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

    df_base = pd.read_csv(base_file)
    df_ai = pd.read_csv(ai_file)

    base_kwh = float(df_base["cumulative_kwh"].iloc[-1]) if not df_base.empty else 0.0
    ai_kwh = float(df_ai["cumulative_kwh"].iloc[-1]) if not df_ai.empty else 0.0
    kwh_saved = base_kwh - ai_kwh
    pct_saved = (kwh_saved / base_kwh * 100.0) if base_kwh > 0 else 0.0

    base_peak_kw = float(df_base["electric_power_kw"].max()) if not df_base.empty else 0.0
    ai_peak_kw = float(df_ai["electric_power_kw"].max()) if not df_ai.empty else 0.0
    peak_cut_kw = base_peak_kw - ai_peak_kw
    peak_pct_cut = (peak_cut_kw / base_peak_kw * 100.0) if base_peak_kw > 0 else 0.0

    co2_saved_kg = kwh_saved * 0.42

    occupied_ai = df_ai[df_ai["total_occupancy"] > 0]
    compliance_rate = (1.0 - float(occupied_ai["comfort_violated"].mean())) * 100.0 if not occupied_ai.empty else 100.0

    summary = {
        "baseline_kwh": round(base_kwh, 2),
        "ai_controlled_kwh": round(ai_kwh, 2),
        "kwh_saved": round(kwh_saved, 2),
        "energy_savings_pct": round(pct_saved, 1),
        "baseline_peak_kw": round(base_peak_kw, 2),
        "ai_peak_kw": round(ai_peak_kw, 2),
        "peak_kw_reduction": round(peak_cut_kw, 2),
        "peak_pct_cut": round(peak_pct_cut, 1),
        "co2_saved_kg": round(co2_saved_kg, 2),
        "comfort_compliance_pct": round(compliance_rate, 1),
        "total_timesteps": len(df_ai),
    }

    # Downsample time-series records for optimal React charting performance (~200 points)
    step = max(1, len(df_ai) // 200)
    baseline_series = df_base.iloc[::step].to_dict(orient="records")
    ai_series = df_ai.iloc[::step].to_dict(orient="records")

    loc = get_location_metadata(active_config["weather"])
    return {
        "status": "success",
        "active_config": active_config,
        "location": loc,
        "summary": summary,
        "baseline_series": baseline_series,
        "ai_series": ai_series,
    }


@app.post("/api/run-simulation")
def trigger_simulation(payload: Dict[str, Any] = None):
    """Trigger baseline vs AI-controlled comparative physics simulation."""
    global active_config
    try:
        print(f"[*] Simulation trigger payload received: {payload}")
        if payload:
            if payload.get("model"):
                active_config["model"] = payload.get("model")
            if payload.get("weather"):
                active_config["weather"] = payload.get("weather")
            if payload.get("period"):
                active_config["period"] = payload.get("period")

        results = run_comparative_simulations(
            model_name=active_config["model"],
            weather_name=active_config["weather"],
            period=active_config["period"]
        )
        return {
            "status": "success",
            "message": "Simulation completed successfully",
            "active_config": active_config,
            "results": results
        }
    except Exception as e:
        print(f"[!] Simulation execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/building-model")
def get_building_model():
    """Return IDF building discovery info (thermal zones, HVAC equipment, schedules)."""
    try:
        bd = BuildingDiscovery(active_config["model"])
        zones = bd.get_zones()
        people = bd.get_people()
        hvac = bd.get_hvac()
        schedules = bd.get_schedules()
        return {
            "status": "success",
            "zones_count": len(zones),
            "zones": zones,
            "people": people,
            "hvac": hvac,
            "schedules_count": len(schedules),
            "schedules": schedules[:20],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/agent-tools")
def get_agent_tools():
    """Return MCP server agentic tool definitions and system protocol specification."""
    mcp = MCPServer()
    return {
        "status": "success",
        "mcp_version": "1.0.0",
        "tools": mcp.get_tool_definitions(),
    }


# Mount built React frontend static files for 24/7 reviewer web deployment
frontend_dist = BASE_DIR.parent / "frontend" / "dist"
if frontend_dist.exists():

    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

