import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config.settings import (
    ENERGYPLUS_HOME,
    WEATHER_FILE,
    IDF_FILE,
    OUTPUT_DIR,
)

sys.path.insert(0, str(ENERGYPLUS_HOME))

from pyenergyplus.api import EnergyPlusAPI
from simulator.sensors import SensorManager
from simulator.actuators import ActuatorManager
from simulator.state import BuildingState


class EnergyPlusBridge:
    """
    EnergyPlus Python API Bridge.
    Wraps pyenergyplus.api.EnergyPlusAPI for real-time sensor reading and dynamic actuator setpoint overrides.
    """

    def __init__(self, api_instance=None):
        self.api = api_instance or EnergyPlusAPI()
        self.sensor_manager = SensorManager(self.api)
        self.actuator_manager = ActuatorManager(self.api)
        self.current_state: BuildingState = BuildingState()

    def update_state(self, ep_state) -> BuildingState:
        """Read continuous simulation telemetry into BuildingState."""
        self.current_state = self.sensor_manager.read(ep_state)
        return self.current_state

    def get_zone_status(self, zone_name: str) -> Dict[str, Any]:
        """
        Get sensor status for a specific thermal zone.
        Returns: {zone, temp_c, pmv, humidity, occupancy, heating_energy}
        """
        st = self.current_state
        temp = st.zone_temperatures.get(zone_name, st.avg_indoor_temp)
        pmv = st.pmv.get(zone_name, st.avg_pmv)
        hum = st.humidity.get(zone_name, 45.0)
        occ = st.occupancy.get(zone_name, 0.0)

        return {
            "zone_name": zone_name,
            "temperature_c": round(temp, 2),
            "pmv": round(pmv, 2),
            "humidity_pct": round(hum, 1),
            "occupancy": round(occ, 1),
            "electric_power_kw": round(st.electric_power_kw, 2),
        }

    def get_all_zones_status(self) -> List[Dict[str, Any]]:
        """Get status dictionary list for all building thermal zones."""
        st = self.current_state
        zones = self.sensor_manager.zones or ["SPACE1-1", "SPACE2-1", "SPACE3-1", "SPACE4-1", "SPACE5-1"]
        return [self.get_zone_status(z) for z in zones]

    def set_zone_setpoint(self, ep_state, cooling_sp: float, heating_sp: float, zone_name: Optional[str] = None) -> bool:
        """
        Write new cooling and heating setpoints into EnergyPlus dynamic actuators.
        """
        try:
            clg = max(22.0, min(28.0, float(cooling_sp)))
            htg = max(16.0, min(22.0, float(heating_sp)))
            if clg - htg < 1.0:
                clg = htg + 1.0

            self.actuator_manager.apply_setpoints(ep_state, clg, htg)
            return True
        except Exception as e:
            print(f"[!] EnergyPlusBridge setpoint write error: {e}")
            return False

    def get_current_sim_time(self) -> datetime:
        """Get current simulation timestamp as a Python datetime object."""
        st = self.current_state
        year = 2026
        month = 7
        day = max(1, min(31, st.day or 7))
        hour = max(0, min(23, st.hour or 12))
        minute = max(0, min(59, st.minute or 0))
        return datetime(year, month, day, hour, minute)

    @staticmethod
    def parse_error_log(path: Optional[Path] = None) -> List[str]:
        """
        Reads EnergyPlus .err log file and extracts filtered warning and error messages.
        Summarizes lengthy simulation logs before hitting the LLM context.
        """
        err_path = path or (OUTPUT_DIR / "eplusout.err")
        if not err_path.exists():
            return ["No EnergyPlus error log generated yet."]

        filtered_logs = []
        try:
            with open(err_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if "** Warning **" in line or "** Severe **" in line or "** Fatal **" in line:
                        filtered_logs.append(line.strip())
        except Exception as e:
            return [f"Error reading log file: {e}"]

        return filtered_logs[:10]  # Return top 10 filtered summaries
