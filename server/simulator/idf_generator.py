import sys
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional

from config.settings import (
    IDF_DIR,
    MODIFIED_IDF_DIR,
    IDD_FILE,
    IDF_FILE,
    OUTPUT_DIR,
    resolve_idf_file,
)


def generate_modified_idf(
    baseline_idf_name: str = "5ZoneAirCooled.idf",
    setpoint_records: Optional[List[Dict[str, Any]]] = None,
    output_filename: str = "modified_building.idf",
) -> Path:
    """
    Generate a final modified .idf file using eppy.
    Loads the baseline .idf and updates the thermostat setpoint schedule objects
    with the AI agent's actual dynamic values derived from simulation run telemetry.
    """
    baseline_path = resolve_idf_file(baseline_idf_name)
    output_idf_path = MODIFIED_IDF_DIR / output_filename
    output_csv_idf_path = OUTPUT_DIR / output_filename
    root_outputs_idf_path = Path(__file__).resolve().parent.parent / "outputs" / output_filename



    # Default fallback setpoint profile if records are empty
    daytime_cooling = 24.5
    nighttime_cooling = 27.0
    daytime_heating = 20.5
    nighttime_heating = 17.0

    if setpoint_records and len(setpoint_records) > 0:
        try:
            # Derive representative daytime & nighttime setpoints from actual AI log
            day_records = [r for r in setpoint_records if 7 <= r.get("hour", 12) <= 18]
            night_records = [r for r in setpoint_records if r.get("hour", 12) < 7 or r.get("hour", 12) > 18]

            if day_records:
                daytime_cooling = sum(r.get("cooling_setpoint", 24.5) for r in day_records) / len(day_records)
                daytime_heating = sum(r.get("heating_setpoint", 20.5) for r in day_records) / len(day_records)
            if night_records:
                nighttime_cooling = sum(r.get("cooling_setpoint", 27.0) for r in night_records) / len(night_records)
                nighttime_heating = sum(r.get("heating_setpoint", 17.0) for r in night_records) / len(night_records)
        except Exception:
            pass

    # Try modifying baseline IDF using eppy
    try:
        from eppy.modeleditor import IDF
        IDF.setiddname(str(IDD_FILE))
        idf = IDF(str(baseline_path))

        # 1. Update cooling setpoint schedules
        target_clg_schedules = ["CLGSETP_SCH_YES_OPTIMUM", "Clg-SetP-Sch", "CLGSETP_SCH"]
        for stype in ["SCHEDULE:COMPACT", "SCHEDULE:CONSTANT"]:
            if stype in idf.idfobjects:
                for sch in idf.idfobjects[stype]:
                    if hasattr(sch, "Name") and any(k in sch.Name for k in target_clg_schedules):
                        if stype == "SCHEDULE:COMPACT":
                            sch.Field_1 = "Temperature"
                            sch.Field_2 = "Through: 12/31"
                            sch.Field_3 = "For: AllDays"
                            sch.Field_4 = "Until: 07:00"
                            sch.Field_5 = round(nighttime_cooling, 2)
                            sch.Field_6 = "Until: 19:00"
                            sch.Field_7 = round(daytime_cooling, 2)
                            sch.Field_8 = "Until: 24:00"
                            sch.Field_9 = round(nighttime_cooling, 2)

        # 2. Update heating setpoint schedules
        target_htg_schedules = ["HTGSETP_SCH_YES_OPTIMUM", "Htg-SetP-Sch", "HTGSETP_SCH"]
        for stype in ["SCHEDULE:COMPACT", "SCHEDULE:CONSTANT"]:
            if stype in idf.idfobjects:
                for sch in idf.idfobjects[stype]:
                    if hasattr(sch, "Name") and any(k in sch.Name for k in target_htg_schedules):
                        if stype == "SCHEDULE:COMPACT":
                            sch.Field_1 = "Temperature"
                            sch.Field_2 = "Through: 12/31"
                            sch.Field_3 = "For: AllDays"
                            sch.Field_4 = "Until: 07:00"
                            sch.Field_5 = round(nighttime_heating, 2)
                            sch.Field_6 = "Until: 19:00"
                            sch.Field_7 = round(daytime_heating, 2)
                            sch.Field_8 = "Until: 24:00"
                            sch.Field_9 = round(nighttime_heating, 2)

        idf.saveas(str(output_idf_path))
        try:
            shutil.copy(output_idf_path, output_csv_idf_path)
            root_outputs_idf_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(output_idf_path, root_outputs_idf_path)
        except Exception:
            pass
        print(f"[+] Successfully generated modified IDF artifact via eppy: {output_idf_path}")
        return output_idf_path

    except Exception as e:
        print(f"[!] Eppy IDF modification fallback: {e}")

        # Text-based fallback to copy and append AI schedule object
        try:
            with open(baseline_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            ai_schedule_text = f"""

! ==========================================================
! EcoLoop AI Agent Dynamic Setpoint Overrides
! Generated at end of simulation run
! ==========================================================
Schedule:Compact,
    CLGSETP_SCH_YES_OPTIMUM, !- Name
    Temperature,             !- Schedule Type Limits Name
    Through: 12/31,          !- Field 1
    For: AllDays,            !- Field 2
    Until: 07:00,{nighttime_cooling:.2f}, !- Field 3, 4
    Until: 19:00,{daytime_cooling:.2f}, !- Field 5, 6
    Until: 24:00,{nighttime_cooling:.2f}; !- Field 7, 8

Schedule:Compact,
    HTGSETP_SCH_YES_OPTIMUM, !- Name
    Temperature,             !- Schedule Type Limits Name
    Through: 12/31,          !- Field 1
    For: AllDays,            !- Field 2
    Until: 07:00,{nighttime_heating:.2f}, !- Field 3, 4
    Until: 19:00,{daytime_heating:.2f}, !- Field 5, 6
    Until: 24:00,{nighttime_heating:.2f}; !- Field 7, 8
"""
            modified_content = content + ai_schedule_text
            with open(output_idf_path, "w", encoding="utf-8") as f:
                f.write(modified_content)

            try:
                shutil.copy(output_idf_path, output_csv_idf_path)
                root_outputs_idf_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(output_idf_path, root_outputs_idf_path)
            except Exception:
                pass
            print(f"[+] Generated modified IDF via text schedule injection: {output_idf_path}")
            return output_idf_path


        except Exception as err:
            print(f"[!] IDF file generation failed: {err}")
            return baseline_path
