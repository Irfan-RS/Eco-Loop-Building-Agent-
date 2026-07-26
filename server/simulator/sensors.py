from simulator.state import BuildingState
from simulator.discovery import BuildingDiscovery


class SensorManager:

    def __init__(self, api, idf_path=None):
        self.api = api
        self.handles = {}
        self.data = {}
        self.initialized = False
        self.state = BuildingState()

        self.discovery = BuildingDiscovery(idf_path)
        self.zones = self.discovery.get_zones()
        self.people = self.discovery.get_people()
        self.hvac = self.discovery.get_hvac()

    def register_variables(self):
        """Register all EnergyPlus simulation output variables."""

        self.variables = {
            "outdoor_temp": (
                "Site Outdoor Air DryBulb Temperature",
                "Environment",
            ),
            "facility_electric_power": (
                "Facility Total Electric Demand Power",
                "Whole Building",
            ),
        }

        for zone in self.zones:
            # Indoor Temperature
            self.variables[f"temp_{zone}"] = (
                "Zone Mean Air Temperature",
                zone,
            )

            # Relative Humidity
            self.variables[f"humidity_{zone}"] = (
                "Zone Air Relative Humidity",
                zone,
            )

            # PMV Comfort Index
            self.variables[f"pmv_{zone}"] = (
                "Zone Thermal Comfort Fanger Model PMV",
                zone,
            )

        # Occupancy
        for person in self.people:
            zone = person["zone"]
            self.variables[f"occupancy_{zone}"] = (
                "Zone People Occupant Count",
                zone,
            )

        # Heating Coil Energy (Electric, Gas, Water, DX)
        heating_coil_types = [
            "COIL:HEATING:ELECTRIC",
            "COIL:HEATING:GAS",
            "COIL:HEATING:WATER",
            "COIL:HEATING:DX:SINGLESPEED",
        ]
        for coil_type in heating_coil_types:
            for coil in self.hvac.get(coil_type, []):
                self.variables[f"heating_{coil}"] = (
                    "Heating Coil Heating Energy",
                    coil,
                )


    def initialize(self, state):
        """Initialize sensor handles using EnergyPlus DataExchange API."""

        if self.initialized:
            return

        self.register_variables()

        for name, (variable, key) in self.variables.items():
            handle = self.api.exchange.get_variable_handle(
                state,
                variable,
                key,
            )
            self.handles[name] = handle
            if handle == -1:
                # Silently handle missing optional variables
                pass

        self.initialized = True

    def read(self, state):
        """Read all registered sensors for the current timestep."""

        if not self.initialized:
            if not self.api.exchange.api_data_fully_ready(state):
                return self.state
            self.initialize(state)

        for name, handle in self.handles.items():
            if handle == -1:
                # Fallback: Try blank key or default key for global facility variables
                var_name, key_name = self.variables.get(name, ("", ""))
                if key_name and var_name:
                    alt_handle = self.api.exchange.get_variable_handle(state, var_name, "*")
                    if alt_handle != -1:
                        self.handles[name] = alt_handle
                        handle = alt_handle
                    else:
                        alt_handle2 = self.api.exchange.get_variable_handle(state, var_name, "")
                        if alt_handle2 != -1:
                            self.handles[name] = alt_handle2
                            handle = alt_handle2

            value = 0.0
            if handle != -1:
                try:
                    value = self.api.exchange.get_variable_value(state, handle)
                except Exception:
                    value = 0.0

            self.data[name] = value

            if name == "outdoor_temp":
                self.state.outdoor_temp = value
            elif name == "facility_electric_power":
                self.state.facility_power_w = value
            elif name.startswith("temp_"):
                zone = name.replace("temp_", "")
                self.state.zone_temperatures[zone] = value if handle != -1 else 23.5
            elif name.startswith("humidity_"):
                zone = name.replace("humidity_", "")
                self.state.humidity[zone] = value if handle != -1 else 50.0
            elif name.startswith("occupancy_"):
                zone = name.replace("occupancy_", "")
                self.state.occupancy[zone] = value if handle != -1 else 0.0
            elif name.startswith("pmv_"):
                zone = name.replace("pmv_", "")
                if handle != -1:
                    self.state.pmv[zone] = value
                else:
                    z_temp = self.state.zone_temperatures.get(zone, 23.5)
                    self.state.pmv[zone] = round(0.24 * (z_temp - 23.5), 2)
            elif name.startswith("heating_"):
                coil = name.replace("heating_", "")
                self.state.heating_energy[coil] = value


        try:
            self.state.day = self.api.exchange.day_of_month(state)
            self.state.hour = self.api.exchange.hour(state)
            self.state.minute = self.api.exchange.minutes(state)
            self.state.current_time_str = f"Day {self.state.day:02d} {self.state.hour:02d}:{self.state.minute:02d}"
        except Exception:
            pass

        return self.state