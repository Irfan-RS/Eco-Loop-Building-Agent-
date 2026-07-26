import sys
import shutil
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from run_comparison import main as run_comparison_main
from api_server import list_runs, outputs_folder


def test_timestamped_run_folders():
    # Execute comparison pipeline
    res = run_comparison_main()
    assert "summary" in res

    # Verify timestamped run folder creation
    run_folders = [d for d in outputs_folder.glob("run_*") if d.is_dir()]
    assert len(run_folders) > 0

    latest_run = sorted(run_folders, key=lambda p: p.name, reverse=True)[0]

    
    # Check that all output files exist inside the timestamped run folder
    expected_files = [
        "baseline_metrics.csv",
        "aicontrolled_metrics.csv",
        "setpoint_change_log.csv",
        "setpoint_change_log.json",
        "comparison_summary.json",
        "modified_building.idf",
    ]
    for fn in expected_files:
        assert (latest_run / fn).exists(), f"Missing {fn} in run folder {latest_run}"

    # Verify energyplus_raw subfolder exists and contains eplusout logs
    raw_ep_dir = latest_run / "energyplus_raw"
    assert raw_ep_dir.exists()
    assert (raw_ep_dir / "eplusout.err").exists()
    assert (raw_ep_dir / "eplustbl.htm").exists()

    # Verify API runs endpoint
    runs_resp = list_runs()
    assert runs_resp["status"] == "success"
    assert runs_resp["total_runs"] > 0

