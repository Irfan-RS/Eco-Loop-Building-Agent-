import sys
import os
import json
import time
import queue
import threading
import asyncio
from pathlib import Path
from typing import Dict, Any, List

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import pandas as pd
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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
    # Don't add no-cache to SSE endpoint — it breaks streaming
    if "/api/simulation-logs" not in str(request.url):
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

# ─── Global simulation state ─────────────────────────────────────────────────
# Thread-safe log queue: all SSE subscribers drain from this shared queue
_log_queue: queue.Queue = queue.Queue()
_sim_state: Dict[str, Any] = {
    "running": False,
    "phase": "idle",       # idle | baseline | ai | complete | error
    "results": None,
    "error": None,
}
_sim_subscribers: List[queue.Queue] = []   # one queue per connected SSE client
_sim_lock = threading.Lock()


def _broadcast(msg: str):
    """Push a log line to all connected SSE subscribers."""
    with _sim_lock:
        dead = []
        for q in _sim_subscribers:
            try:
                q.put_nowait(msg)
            except Exception:
                dead.append(q)
        for q in dead:
            _sim_subscribers.remove(q)


def _run_simulation_thread(model_name, weather_name, period):
    """Background thread: stream subprocess output and update global state."""
    global _sim_state
    import subprocess
    python_exe = sys.executable

    try:
        _sim_state["running"] = True
        _sim_state["error"] = None
        _sim_state["results"] = None

        outputs_folder.mkdir(parents=True, exist_ok=True)
        # Clean stale CSVs and metadata before running
        for f in ["baseline_metrics.csv", "aicontrolled_metrics.csv", "latest_run_meta.json"]:
            p = outputs_folder / f
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

        # Write running metadata
        run_meta_init = {
            "model": model_name,
            "weather": weather_name,
            "period": period,
            "status": "running",
            "started_at": time.time(),
        }
        with open(outputs_folder / "latest_run_meta.json", "w", encoding="utf-8") as f:
            json.dump(run_meta_init, f, indent=2)

        extra_args = []
        if model_name:
            extra_args.extend(["--idf", str(model_name)])
        if weather_name:
            extra_args.extend(["--weather", str(weather_name)])

        def _stream_proc(cmd, phase_label):
            _sim_state["phase"] = phase_label
            _broadcast(f"[PHASE] {phase_label}")
            _broadcast(f"[CMD] {' '.join(cmd)}")
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(BASE_DIR),
                bufsize=1,
            )
            for line in proc.stdout:
                line = line.rstrip("\n")
                if line.strip():
                    print(line)          # Still log to server console
                    _broadcast(line)     # Stream to all SSE clients
            proc.wait()
            if proc.returncode != 0:
                raise RuntimeError(f"{phase_label} subprocess exited with code {proc.returncode}")

        # Phase 1: Baseline
        cmd_base = [python_exe, "-m", "simulator.runner", "--mode", "Baseline"] + extra_args
        _stream_proc(cmd_base, "baseline")

        # Phase 2: AI-Controlled
        cmd_ai = [python_exe, "-m", "simulator.runner", "--mode", "AI-Controlled"] + extra_args
        _stream_proc(cmd_ai, "ai")

        # Phase 3: Calculate comparative KPIs from CSVs
        _sim_state["phase"] = "complete"
        df_base = pd.read_csv(outputs_folder / "baseline_metrics.csv")
        df_ai = pd.read_csv(outputs_folder / "aicontrolled_metrics.csv")

        base_kwh = float(df_base["cumulative_kwh"].iloc[-1]) if not df_base.empty else 0.0
        ai_kwh = float(df_ai["cumulative_kwh"].iloc[-1]) if not df_ai.empty else 0.0
        kwh_saved = base_kwh - ai_kwh
        pct_saved = (kwh_saved / base_kwh * 100.0) if base_kwh > 0 else 0.0
        base_peak = float(df_base["electric_power_kw"].max()) if not df_base.empty else 0.0
        ai_peak = float(df_ai["electric_power_kw"].max()) if not df_ai.empty else 0.0
        peak_cut = base_peak - ai_peak
        peak_pct = (peak_cut / base_peak * 100.0) if base_peak > 0 else 0.0
        co2_saved = kwh_saved * 0.42
        occ_col = "total_occupancy" if "total_occupancy" in df_ai.columns else ("occupant_count" if "occupant_count" in df_ai.columns else None)
        if occ_col:
            occupied_ai = df_ai[df_ai[occ_col] > 0]
        else:
            occupied_ai = df_ai

        if "comfort_violated" in occupied_ai.columns and not occupied_ai.empty:
            compliance = (1.0 - float(occupied_ai["comfort_violated"].mean())) * 100.0
        else:
            compliance = 100.0


        results = {
            "baseline_kwh": round(base_kwh, 2),
            "ai_controlled_kwh": round(ai_kwh, 2),
            "kwh_saved": round(kwh_saved, 2),
            "energy_savings_pct": round(pct_saved, 1),
            "baseline_peak_kw": round(base_peak, 2),
            "ai_peak_kw": round(ai_peak, 2),
            "peak_kw_reduction": round(peak_cut, 2),
            "peak_pct_cut": round(peak_pct, 1),
            "co2_saved_kg": round(co2_saved, 2),
            "ai_comfort_compliance_pct": round(compliance, 1),
        }
        _sim_state["results"] = results

        # Write completed metadata
        run_meta_completed = {
            "model": model_name,
            "weather": weather_name,
            "period": period,
            "status": "completed",
            "completed_at": time.time(),
            "results": results,
        }
        with open(outputs_folder / "latest_run_meta.json", "w", encoding="utf-8") as f:
            json.dump(run_meta_completed, f, indent=2)

        # Broadcast final results summary
        _broadcast(f"[RESULTS] {json.dumps(results)}")
        _broadcast("[DONE]")


    except Exception as e:
        _sim_state["phase"] = "error"
        _sim_state["error"] = str(e)
        _broadcast(f"[ERROR] {e}")
    finally:
        _sim_state["running"] = False


def _climate_zone_from_lat(lat: float, city: str = "", state: str = "") -> str:
    """Derive ASHRAE climate zone from EPW LOCATION data (latitude + city/state hints)."""
    city_l = city.lower()
    state_l = state.upper()
    # Known exact overrides
    if "chicago" in city_l or state_l == "IL": return "Zone 5A (Cold / Hot Summer Swings)"
    if "san francisco" in city_l or "san.francisco" in city_l: return "Zone 3C (Mild Coastal Mediterranean)"
    if "denver" in city_l or state_l == "CO": return "Zone 5B (Cold Semi-Arid / High Altitude)"
    if "dulles" in city_l or "sterling" in city_l or "washington" in city_l or state_l == "VA": return "Zone 4A (Mixed Humid Continental)"
    if "phoenix" in city_l or state_l == "AZ": return "Zone 2B (Hot Dry Desert)"
    if "miami" in city_l or state_l == "FL": return "Zone 1A (Hot Humid Tropical)"
    if "minneapolis" in city_l or "boston" in city_l: return "Zone 6A (Cold / Very Cold)"
    # Latitude-based fallback
    abs_lat = abs(lat)
    if abs_lat >= 50: return "Zone 7/8 (Very Cold / Subarctic)"
    if abs_lat >= 45: return "Zone 6A (Cold)"
    if abs_lat >= 40: return "Zone 5A (Cold / Hot Summer)"
    if abs_lat >= 35: return "Zone 4A (Mixed Humid)"
    if abs_lat >= 30: return "Zone 3A/3B (Warm Mixed)"
    if abs_lat >= 25: return "Zone 2A/2B (Hot)"
    return "Zone 1A (Hot Humid)"


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
                climate = _climate_zone_from_lat(lat, city, state)
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
def get_metrics(model: str = None, weather: str = None):
    """Return time-series metrics and summary KPIs for Baseline vs AI-Controlled runs."""
    target_model = model or active_config["model"]
    target_weather = weather or active_config["weather"]

    # While simulation is actively running, don't serve partial/stale data
    if _sim_state.get("running"):
        return {
            "status": "running",
            "message": "Simulation in progress — data will be available once complete.",
            "active_config": active_config,
        }

    base_file = outputs_folder / "baseline_metrics.csv"
    ai_file = outputs_folder / "aicontrolled_metrics.csv"

    if not base_file.exists() or not ai_file.exists():
        return {
            "status": "no_data",
            "message": "No simulation data found. Click Calculate to run EnergyPlus simulation.",
            "active_config": active_config,
        }

    try:
        df_base = pd.read_csv(base_file)
        df_ai = pd.read_csv(ai_file)
    except Exception as err:
        return {
            "status": "no_data",
            "message": f"Error reading simulation CSV metrics: {err}",
            "active_config": active_config,
        }




    base_kwh = float(df_base["cumulative_kwh"].iloc[-1]) if not df_base.empty else 0.0
    ai_kwh = float(df_ai["cumulative_kwh"].iloc[-1]) if not df_ai.empty else 0.0
    kwh_saved = base_kwh - ai_kwh
    pct_saved = (kwh_saved / base_kwh * 100.0) if base_kwh > 0 else 0.0

    base_peak_kw = float(df_base["electric_power_kw"].max()) if not df_base.empty else 0.0
    ai_peak_kw = float(df_ai["electric_power_kw"].max()) if not df_ai.empty else 0.0
    peak_cut_kw = base_peak_kw - ai_peak_kw
    peak_pct_cut = (peak_cut_kw / base_peak_kw * 100.0) if base_peak_kw > 0 else 0.0

    co2_saved_kg = kwh_saved * 0.42

    occ_col = "total_occupancy" if "total_occupancy" in df_ai.columns else ("occupant_count" if "occupant_count" in df_ai.columns else None)
    if occ_col:
        occupied_ai = df_ai[df_ai[occ_col] > 0]
    else:
        occupied_ai = df_ai

    if "comfort_violated" in occupied_ai.columns and not occupied_ai.empty:
        compliance_rate = (1.0 - float(occupied_ai["comfort_violated"].mean())) * 100.0
    else:
        compliance_rate = 100.0


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
        "data_model": target_model,          # Which model this data belongs to
        "data_weather": target_weather,       # Which weather file this data belongs to
        "active_config": active_config,
        "location": loc,
        "summary": summary,
        "baseline_series": baseline_series,
        "ai_series": ai_series,
    }


@app.get("/api/simulation-logs")
async def simulation_logs():
    """SSE endpoint: stream live EnergyPlus subprocess output to the browser."""
    client_q: queue.Queue = queue.Queue(maxsize=2000)
    with _sim_lock:
        _sim_subscribers.append(client_q)

    async def event_stream():
        try:
            while True:
                try:
                    line = client_q.get(timeout=1.0)
                    yield f"data: {line}\n\n"
                    # Stop streaming once done or errored
                    if line in ("[DONE]",) or line.startswith("[ERROR]"):
                        break
                except queue.Empty:
                    # Keep-alive ping so connection doesn't time out
                    yield ": ping\n\n"
                    # If simulation finished and queue is empty, stop
                    if not _sim_state["running"] and _sim_state["phase"] in ("complete", "error", "idle"):
                        break
        finally:
            with _sim_lock:
                if client_q in _sim_subscribers:
                    _sim_subscribers.remove(client_q)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/api/simulation-status")
def simulation_status():
    """Return current simulation state and results if complete."""
    return {
        "status": "success",
        "running": _sim_state["running"],
        "phase": _sim_state["phase"],
        "results": _sim_state["results"],
        "error": _sim_state["error"],
    }


@app.post("/api/run-simulation")
def trigger_simulation(payload: Dict[str, Any] = None):
    """Kick off baseline vs AI-controlled simulation in a background thread.
    Real-time logs are streamed via GET /api/simulation-logs (SSE).
    """
    global active_config
    if _sim_state["running"]:
        return {"status": "already_running", "message": "Simulation already in progress"}

    print(f"[*] Simulation trigger payload received: {payload}")
    if payload:
        if payload.get("model"):
            active_config["model"] = payload["model"]
        if payload.get("weather"):
            active_config["weather"] = payload["weather"]
        if payload.get("period"):
            active_config["period"] = payload["period"]

    t = threading.Thread(
        target=_run_simulation_thread,
        args=(active_config["model"], active_config["weather"], active_config.get("period", "5days")),
        daemon=True,
    )
    t.start()

    return {
        "status": "started",
        "message": "Simulation started. Connect to /api/simulation-logs for live output.",
        "active_config": active_config,
    }




@app.get("/api/available-files")
def get_available_files():
    """Return all available .idf building models and .epw weather profiles in the repository."""
    from config.settings import IDF_DIR, WEATHER_DIR
    idf_files = sorted([f.name for f in IDF_DIR.glob("*.idf") if "modified" not in f.name.lower()]) if IDF_DIR.exists() else []
    epw_files = sorted([f.name for f in WEATHER_DIR.glob("*.epw")]) if WEATHER_DIR.exists() else []
    return {
        "status": "success",
        "models": idf_files,
        "weather_files": epw_files,
    }



@app.get("/api/building-model")
def get_building_model(model: str = None):
    """Return IDF building discovery info (thermal zones, HVAC equipment, schedules).
    Optional ?model= query param to inspect a specific building without changing active config.
    """
    try:
        target_model = model or active_config["model"]
        bd = BuildingDiscovery(target_model)
        zones = bd.get_zones()
        people = bd.get_people()
        hvac = bd.get_hvac()
        schedules = bd.get_schedules()
        return {
            "status": "success",
            "model": target_model,
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
    import socket

    port = int(os.environ.get("PORT", 8000))

    def is_port_available(p):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', p)) != 0

    if not is_port_available(port):
        print(f"[!] Port {port} is currently in use or TIME_WAIT. Switching to port {port + 1}...")
        port = port + 1

    print(f"🚀 EcoLoop Server starting at http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)


