from typing import Dict, List

class ActuatorManager:
    """
    Manages EnergyPlus dynamic actuators for closed-loop control.
    Interfaces with PyEnergyPlus DataExchange API to override thermostat setpoints in real-time.
    """

    def __init__(self, api, idf_path=None):
        self.api = api
        self.handles: Dict[str, int] = {}
        self.cooling_schedules: List[str] = []
        self.heating_schedules: List[str] = []
        self.initialized = False

        self.schedules = [
            "Clg-SetP-Sch",
            "Htg-SetP-Sch",
            "PlenumClg-SetP-Sch",
            "PlenumHtg-SetP-Sch",
            "CLGSETP_SCH_YES_OPTIMUM",
            "HTGSETP_SCH_YES_OPTIMUM",
            "CLGSETP_SCH",
            "HTGSETP_SCH",
        ]

        # Discover schedules from IDF
        try:
            from simulator.discovery import BuildingDiscovery
            bd = BuildingDiscovery(idf_path)
            discovered_schedules = bd.get_schedules()
            for sch in discovered_schedules:
                if sch not in self.schedules:
                    sch_lower = sch.lower()
                    if any(k in sch_lower for k in ["clg", "cool", "htg", "heat", "setp", "temp"]):
                        self.schedules.append(sch)
        except Exception:
            pass

        # Categorize schedules into cooling vs heating
        for sch in self.schedules:
            sch_lower = sch.lower()
            if any(k in sch_lower for k in ["clg", "cool", "cooling", "clgsetp"]):
                if sch not in self.cooling_schedules:
                    self.cooling_schedules.append(sch)
            elif any(k in sch_lower for k in ["htg", "heat", "heating", "htgsetp"]):
                if sch not in self.heating_schedules:
                    self.heating_schedules.append(sch)

    def initialize(self, state):
        """Discover and store actuator handles for thermostat setpoint schedules."""
        if self.initialized:
            return

        sch_types = ["Schedule:Compact", "Schedule:Constant", "Schedule:Year", "Schedule:File"]
        for sch in self.schedules:
            handle = -1
            for stype in sch_types:
                handle = self.api.exchange.get_actuator_handle(
                    state,
                    stype,
                    "Schedule Value",
                    sch,
                )
                if handle != -1:
                    break
            
            self.handles[sch] = handle
            if handle != -1:
                print(f"[+] Actuator registered: {sch} -> Handle {handle}")

        self.initialized = True

    def set_cooling_setpoint(self, state, temp_c: float):
        """Override cooling setpoints to the given temperature in Celsius."""
        if not self.initialized:
            self.initialize(state)

        for sch in self.cooling_schedules:
            handle = self.handles.get(sch, -1)
            if handle != -1:
                self.api.exchange.set_actuator_value(state, handle, float(temp_c))

    def set_heating_setpoint(self, state, temp_c: float):
        """Override heating setpoints to the given temperature in Celsius."""
        if not self.initialized:
            self.initialize(state)

        for sch in self.heating_schedules:
            handle = self.handles.get(sch, -1)
            if handle != -1:
                self.api.exchange.set_actuator_value(state, handle, float(temp_c))

    def apply_setpoints(self, state, cooling_temp: float, heating_temp: float):
        """Apply both cooling and heating setpoint overrides."""
        self.set_cooling_setpoint(state, cooling_temp)
        self.set_heating_setpoint(state, heating_temp)

