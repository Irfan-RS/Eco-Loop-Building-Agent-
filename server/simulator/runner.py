import sys
import os
import io
import argparse
import subprocess
import shutil
from datetime import datetime
from pathlib import Path


# Limit OpenBLAS/OMP threads to prevent Windows memory allocation errors
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

# Force UTF-8 stdout encoding for Windows console compatibility
if hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from config.settings import (
    ENERGYPLUS_HOME,
    WEATHER_FILE,
    IDF_FILE,
    OUTPUT_DIR,
    BASE_DIR,
    resolve_idf_file,
    resolve_weather_file,
)

# Ensure EnergyPlus installation path is registered
sys.path.insert(0, str(ENERGYPLUS_HOME))

from pyenergyplus.api import EnergyPlusAPI
from simulator.callbacks import reset_callback_state, on_zone_timestep, simulation_logger, sensor_manager


def run_single_simulation_process(mode: str = "Baseline", idf_name: str = None, weather_name: str = None) -> dict:
    """
    Run an EnergyPlus simulation in a single process context.
    Due to C++ DLL state in PyEnergyPlus, each simulation run executes in its own process.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outputs_folder = BASE_DIR / "outputs"
    outputs_folder.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_output_dir = OUTPUT_DIR / f"run_{timestamp_str}_{mode.lower()}"
    run_output_dir.mkdir(parents=True, exist_ok=True)

    active_idf = resolve_idf_file(idf_name)
    active_weather = resolve_weather_file(weather_name)

    print("\n" + "=" * 65)
    print(f"[*] Starting EnergyPlus Physics Simulation [{mode} Mode]")
    print("=" * 65)
    print(f"Building IDF: {active_idf.name}")
    print(f"Weather EPW : {active_weather.name}")
    print(f"Raw EP Directory: {run_output_dir}")

    # Reset API state & callback instances with active API
    api = EnergyPlusAPI()
    state = api.state_manager.new_state()
    reset_callback_state(api, mode=mode, idf_path=active_idf)

    # Register zone timestep callback
    api.runtime.callback_begin_zone_timestep_after_init_heat_balance(
        state,
        on_zone_timestep,
    )

    args = [
        "-w",
        str(active_weather),
        "-d",
        str(run_output_dir),
        str(active_idf),
    ]

    # Execute physics simulation (catch C++ DLL cleanup exception on exit gracefully)
    try:
        api.runtime.run_energyplus(state, args)
    except Exception as e:
        print(f"[*] Physics simulation execution completed ({type(e).__name__}).")

    try:
        api.state_manager.delete_state(state)
    except Exception:
        pass

    # Mirror key raw EnergyPlus output files to OUTPUT_DIR root
    for raw_file in run_output_dir.glob("eplus*"):
        if raw_file.is_file():
            try:
                shutil.copy(raw_file, OUTPUT_DIR / raw_file.name)
            except Exception:
                pass

    # Save metrics to output CSV
    from simulator.callbacks import simulation_logger as active_logger
    filename = "baseline_metrics.csv" if mode == "Baseline" else "aicontrolled_metrics.csv"
    csv_path = outputs_folder / filename

    active_logger.save_csv(csv_path)

    if mode == "AI-Controlled":
        log_csv = outputs_folder / "setpoint_change_log.csv"
        log_json = outputs_folder / "setpoint_change_log.json"
        active_logger.save_setpoint_log(log_csv, log_json)

        try:
            from simulator.idf_generator import generate_modified_idf
            generate_modified_idf(
                baseline_idf_name=active_idf.name,
                setpoint_records=active_logger.setpoint_log,
                output_filename="modified_building.idf",
            )
        except Exception as err:
            print(f"[!] IDF Generation Note: {err}")

    kpis = active_logger.get_summary_kpis()
    print(f"[+] Finished [{mode}] Simulation run.")
    print(f"   Total Energy Consumed: {kpis.get('total_kwh', 0):,.2f} kWh")
    print(f"   Peak Electric Power : {kpis.get('peak_kw', 0):,.2f} kW")
    print(f"   Comfort Compliance  : {kpis.get('comfort_compliance_pct', 0)}%")
    print(f"   CO2 Emissions       : {kpis.get('co2_emissions_kg', 0):,.2f} kg CO2e\n")

    return kpis



def run_comparative_simulations(model_name: str = None, weather_name: str = None, period: str = None) -> dict:
    """
    Execute Baseline and AI-Controlled simulation runs in separate subprocesses
    to prevent PyEnergyPlus DLL re-initialization error (0xe06d7363).
    """
    outputs_folder = BASE_DIR / "outputs"
    outputs_folder.mkdir(parents=True, exist_ok=True)

    # Clean up stale CSV metrics before running new experiment
    for old_csv in ["baseline_metrics.csv", "aicontrolled_metrics.csv"]:
        target_p = outputs_folder / old_csv
        if target_p.exists():
            try:
                target_p.unlink()
            except Exception:
                pass

    python_exe = sys.executable

    extra_args = []
    if model_name:
        extra_args.extend(["--idf", str(model_name)])
    if weather_name:
        extra_args.extend(["--weather", str(weather_name)])

    # 1. Run Baseline Subprocess
    print("[*] Launching Baseline Simulation Process...")
    cmd_base = [python_exe, "-m", "simulator.runner", "--mode", "Baseline"] + extra_args
    subprocess.run(cmd_base, check=True, cwd=str(BASE_DIR))

    # 2. Run AI-Controlled Subprocess
    print("[*] Launching AI-Controlled Simulation Process...")
    cmd_ai = [python_exe, "-m", "simulator.runner", "--mode", "AI-Controlled"] + extra_args
    subprocess.run(cmd_ai, check=True, cwd=str(BASE_DIR))


    # 3. Read generated CSVs and calculate comparative KPIs
    outputs_folder = BASE_DIR / "outputs"
    import pandas as pd
    import json

    df_base = pd.read_csv(outputs_folder / "baseline_metrics.csv")
    df_ai = pd.read_csv(outputs_folder / "aicontrolled_metrics.csv")

    base_kwh = df_base["cumulative_kwh"].iloc[-1] if not df_base.empty else 0.0
    ai_kwh = df_ai["cumulative_kwh"].iloc[-1] if not df_ai.empty else 0.0
    kwh_saved = base_kwh - ai_kwh
    pct_saved = (kwh_saved / base_kwh * 100.0) if base_kwh > 0 else 0.0

    base_peak = df_base["electric_power_kw"].max() if not df_base.empty else 0.0
    ai_peak = df_ai["electric_power_kw"].max() if not df_ai.empty else 0.0
    peak_reduced_kw = base_peak - ai_peak
    peak_pct_reduced = (peak_reduced_kw / base_peak * 100.0) if base_peak > 0 else 0.0

    co2_saved = (base_kwh - ai_kwh) * 0.42

    occupied_ai = df_ai[df_ai["total_occupancy"] > 0]
    compliance_rate = (1.0 - occupied_ai["comfort_violated"].mean()) * 100.0 if not occupied_ai.empty else 100.0

    comparison = {
        "baseline_kwh": round(base_kwh, 2),
        "ai_controlled_kwh": round(ai_kwh, 2),
        "kwh_saved": round(kwh_saved, 2),
        "energy_savings_pct": round(pct_saved, 2),
        "peak_kw_reduction": round(peak_reduced_kw, 2),
        "peak_reduction_pct": round(peak_pct_reduced, 2),
        "co2_saved_kg": round(co2_saved, 2),
        "ai_comfort_compliance_pct": round(compliance_rate, 1),
    }

    # 4. Archive into a unique timestamped experiment folder
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_slug = (model_name or "5ZoneAirCooled.idf").replace(".idf", "")
    run_dir_name = f"run_{ts}_{model_slug}"
    unique_run_dir = outputs_folder / run_dir_name
    unique_run_dir.mkdir(parents=True, exist_ok=True)

    for f_name in ["baseline_metrics.csv", "aicontrolled_metrics.csv", "setpoint_change_log.csv", "setpoint_change_log.json"]:
        src_file = outputs_folder / f_name
        if src_file.exists():
            try:
                shutil.copy(src_file, unique_run_dir / f_name)
            except Exception:
                pass

    # 5. Write metadata JSON for strict active_config matching
    run_meta = {
        "run_id": run_dir_name,
        "model": model_name or "5ZoneAirCooled.idf",
        "weather": weather_name or "Chicago_OHare_TMY3.epw",
        "period": period or "5days",
        "created_at": datetime.now().isoformat(),
        "summary": comparison,
    }
    with open(outputs_folder / "latest_run_meta.json", "w", encoding="utf-8") as f:
        json.dump(run_meta, f, indent=2)
    with open(unique_run_dir / "run_meta.json", "w", encoding="utf-8") as f:
        json.dump(run_meta, f, indent=2)

    print("\n" + "=" * 65)
    print(f"[RESULT] QUANTITATIVE ENERGY SAVINGS COMPARISON ({run_dir_name})")
    print("=" * 65)
    print(f"  Baseline Energy Consumption    : {base_kwh:,.2f} kWh")
    print(f"  AI-Controlled Consumption      : {ai_kwh:,.2f} kWh")
    print(f"  [-] Net Energy Reduction        : {kwh_saved:,.2f} kWh ({pct_saved:.1f}% Savings)")
    print(f"  [-] Peak Demand Reduction       : {peak_reduced_kw:,.2f} kW ({peak_pct_reduced:.1f}% Peak Cut)")
    print(f"  [*] CO2 Emissions Saved         : {co2_saved:,.2f} kg CO2e")
    print(f"  [*] AI Comfort Compliance Rate  : {compliance_rate:.1f}%")
    print(f"  [*] Archived Unique Run Folder : {unique_run_dir}")
    print("=" * 65 + "\n")

    return comparison



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EcoLoop EnergyPlus Simulation Runner")
    parser.add_argument("--mode", choices=["Baseline", "AI-Controlled", "Comparative"], default="Comparative")
    parser.add_argument("--idf", type=str, default=None, help="Building IDF model filename")
    parser.add_argument("--weather", type=str, default=None, help="Weather EPW filename")
    args = parser.parse_args()

    if args.mode == "Comparative":
        run_comparative_simulations(model_name=args.idf, weather_name=args.weather)
    else:
        run_single_simulation_process(mode=args.mode, idf_name=args.idf, weather_name=args.weather)