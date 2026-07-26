from dataclasses import dataclass, field
from typing import Dict


@dataclass
class BuildingState:
    # Environmental
    outdoor_temp: float = 0.0
    zone_temperatures: Dict[str, float] = field(default_factory=dict)
    humidity: Dict[str, float] = field(default_factory=dict)

    # Occupancy
    occupancy: Dict[str, float] = field(default_factory=dict)

    # Thermal Comfort (PMV Fanger Model)
    pmv: Dict[str, float] = field(default_factory=dict)

    # HVAC & Electric Power
    cooling_energy: Dict[str, float] = field(default_factory=dict)
    heating_energy: Dict[str, float] = field(default_factory=dict)
    facility_power_w: float = 0.0

    # Simulation Clock
    day: int = 0
    hour: int = 0
    minute: int = 0
    current_time_str: str = "Day 01 00:00"

    @property
    def avg_indoor_temp(self) -> float:
        valid_temps = [t for t in self.zone_temperatures.values() if t is not None and t > -50]
        return sum(valid_temps) / len(valid_temps) if valid_temps else 22.0

    @property
    def total_occupancy(self) -> float:
        return sum(self.occupancy.values()) if self.occupancy else 0.0

    @property
    def avg_pmv(self) -> float:
        valid_pmv = [p for p in self.pmv.values() if p is not None and -5.0 <= p <= 5.0]
        return sum(valid_pmv) / len(valid_pmv) if valid_pmv else 0.0

    @property
    def electric_power_kw(self) -> float:
        # Convert W to kW (if facility_power_w is <= 0, estimate from zone temperatures / HVAC state)
        if self.facility_power_w > 0:
            return self.facility_power_w / 1000.0
        # Realistic power model estimation for standard office medium when building runs
        base_load = 15.0  # Base plug & lighting kW
        occupancy_load = self.total_occupancy * 0.1  # kW per person
        cooling_delta = max(0.0, self.avg_indoor_temp - 22.0)
        hvac_load = cooling_delta * 12.5 if self.hour >= 6 and self.hour <= 20 else cooling_delta * 3.0
        return base_load + occupancy_load + hvac_load