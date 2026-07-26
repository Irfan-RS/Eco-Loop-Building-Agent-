import sys
import io
import json
import subprocess
import pandas as pd
from pathlib import Path

# Force UTF-8 stdout encoding for Windows console compatibility
if hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import shutil
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
outputs_folder = BASE_DIR / "outputs"


def execute_run(mode: str) -> dict:
    """Execute a single simulation mode in an isolated Python process."""
    python_exe = sys.executable
    print(f"[*] Launching {mode} Simulation Subprocess...")
    cmd = [python_exe, "-m", "simulator.runner", "--mode", mode]
    subprocess.run(cmd, check=True, cwd=str(BASE_DIR))


    filename = "baseline_metrics.csv" if mode == "Baseline" else "aicontrolled_metrics.csv"
    csv_path = outputs_folder / filename
    df = pd.read_csv(csv_path)

    total_kwh = float(df["cumulative_kwh"].iloc[-1]) if not df.empty else 0.0
    peak_kw = float(df["electric_power_kw"].max()) if not df.empty else 0.0
    
    occupied_df = df[df["total_occupancy"] > 0]
    violation_timesteps = len(occupied_df[occupied_df["comfort_violated"] == True]) if not occupied_df.empty else 0
    violation_minutes = violation_timesteps * 15  # 15-minute timesteps
    compliance_rate = (1.0 - float(occupied_df["comfort_violated"].mean())) * 100.0 if not occupied_df.empty else 100.0

    return {
        "mode": mode,
        "total_kwh": round(total_kwh, 2),
        "peak_demand_kw": round(peak_kw, 2),
        "comfort_violation_minutes": violation_minutes,
        "comfort_compliance_pct": round(compliance_rate, 1),
        "co2_emissions_kg": round(total_kwh * 0.42, 2),
        "total_timesteps": len(df),
    }


def main():
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = outputs_folder / f"run_{timestamp_str}"
    run_folder.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(f"🏢 EcoLoop: Orchestrating Baseline vs. AI Closed-Loop Comparison [{timestamp_str}]")
    print(f"📁 Timestamped Run Folder: {run_folder}")
    print("=" * 70)

    # 1. Run Baseline Mode
    base_kpis = execute_run("Baseline")

    # 2. Run AI-Controlled Mode
    ai_kpis = execute_run("AI-Controlled")

    # 3. Calculate Savings Metrics
    base_kwh = base_kpis["total_kwh"]
    ai_kwh = ai_kpis["total_kwh"]
    kwh_saved = base_kwh - ai_kwh
    pct_saved = (kwh_saved / base_kwh * 100.0) if base_kwh > 0 else 0.0

    base_peak = base_kpis["peak_demand_kw"]
    ai_peak = ai_kpis["peak_demand_kw"]
    peak_cut = base_peak - ai_peak
    peak_pct_cut = (peak_cut / base_peak * 100.0) if base_peak > 0 else 0.0

    co2_saved = base_kpis["co2_emissions_kg"] - ai_kpis["co2_emissions_kg"]

    comparison_results = {
        "timestamp": timestamp_str,
        "run_folder": run_folder.name,
        "baseline": base_kpis,
        "ai_controlled": ai_kpis,
        "summary": {
            "total_kwh_saved": round(kwh_saved, 2),
            "energy_reduction_pct": round(pct_saved, 1),
            "peak_kw_reduction": round(peak_cut, 2),
            "peak_reduction_pct": round(peak_pct_cut, 1),
            "co2_emissions_saved_kg": round(co2_saved, 2),
        },
    }

    # Save summary JSON to outputs root and timestamped run folder
    summary_json_path = outputs_folder / "comparison_summary.json"
    run_summary_json_path = run_folder / "comparison_summary.json"

    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(comparison_results, f, indent=2)

    with open(run_summary_json_path, "w", encoding="utf-8") as f:
        json.dump(comparison_results, f, indent=2)

    # Copy all output files into timestamped run folder
    files_to_copy = [
        "baseline_metrics.csv",
        "aicontrolled_metrics.csv",
        "setpoint_change_log.csv",
        "setpoint_change_log.json",
        "modified_building.idf",
    ]
    for fn in files_to_copy:
        src = outputs_folder / fn
        if src.exists():
            shutil.copy(src, run_folder / fn)

    # Copy raw EnergyPlus logs into energyplus_raw subfolder
    ep_output_dir = BASE_DIR / "energyplus" / "output"
    if ep_output_dir.exists():
        raw_ep_folder = run_folder / "energyplus_raw"
        raw_ep_folder.mkdir(parents=True, exist_ok=True)
        for ep_file in ep_output_dir.glob("eplus*"):
            if ep_file.is_file():
                try:
                    shutil.copy(ep_file, raw_ep_folder / ep_file.name)
                except Exception:
                    pass


    print("\n" + "=" * 70)
    print("🏆 QUANTITATIVE SAVINGS DASHBOARD DELIVERABLE SUMMARY")
    print("=" * 70)
    print(f"  Baseline Energy Consumption    : {base_kwh:,.2f} kWh")
    print(f"  AI-Controlled Consumption      : {ai_kwh:,.2f} kWh")
    print(f"  ⚡ Net Energy Reduction        : {kwh_saved:,.2f} kWh ({pct_saved:.1f}% Savings)")
    print(f"  📉 Peak Demand Reduction       : {peak_cut:,.2f} kW ({peak_pct_cut:.1f}% Peak Cut)")
    print(f"  🌱 CO2 Emissions Avoided       : {co2_saved:,.2f} kg CO2e")
    print(f"  🛋️ AI Comfort Compliance Rate  : {ai_kpis['comfort_compliance_pct']}%")
    print(f"  📁 Timestamped Run Directory   : {run_folder}")
    print("=" * 70 + "\n")

    return comparison_results


if __name__ == "__main__":
    main()

