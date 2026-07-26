import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from simulator.logger import SimulationLogger
from simulator.idf_generator import generate_modified_idf
from config.settings import OUTPUT_DIR, IDF_DIR


def test_simulation_logger_setpoint_audit_log(tmp_path):
    logger = SimulationLogger(run_mode="AI-Controlled")
    logger.log_setpoint_change(
        time_str="Day 02 14:15",
        zone="SPACE1-1",
        old_clg=23.0,
        new_clg=25.5,
        old_htg=20.0,
        new_htg=20.0,
        reasoning="Peak demand throttling",
    )

    csv_file = tmp_path / "setpoint_change_log.csv"
    json_file = tmp_path / "setpoint_change_log.json"

    logger.save_setpoint_log(csv_file, json_file)

    assert csv_file.exists()
    assert json_file.exists()

    content_csv = csv_file.read_text(encoding="utf-8")
    assert "Day 02 14:15" in content_csv
    assert "Peak demand throttling" in content_csv


def test_generate_modified_idf():
    records = [
        {"hour": 2, "cooling_setpoint": 27.0, "heating_setpoint": 17.0},
        {"hour": 14, "cooling_setpoint": 25.5, "heating_setpoint": 20.0},
        {"hour": 8, "cooling_setpoint": 23.0, "heating_setpoint": 21.0},
    ]

    mod_path = generate_modified_idf(
        baseline_idf_name="5ZoneAirCooled.idf",
        setpoint_records=records,
        output_filename="test_modified_building.idf",
    )

    assert mod_path.exists()
    content = mod_path.read_text(encoding="utf-8", errors="ignore")
    assert "CLGSETP_SCH" in content or "Clg-SetP-Sch" in content or "Schedule:Compact" in content
