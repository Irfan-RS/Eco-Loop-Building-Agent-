import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from simulator.discovery import BuildingDiscovery
from simulator.building import Building
from simulator.actuators import ActuatorManager
from simulator.sensors import SensorManager


def test_building_discovery_default():
    bd = BuildingDiscovery("5ZoneAirCooled.idf")
    zones = bd.get_zones()
    assert len(zones) == 6
    assert "SPACE1-1" in zones
    assert "PLENUM-1" in zones

    people = bd.get_people()
    assert len(people) > 0
    assert "zone" in people[0]

    hvac = bd.get_hvac()
    assert isinstance(hvac, dict)
    assert "COIL:HEATING:ELECTRIC" in hvac

    schedules = bd.get_schedules()
    assert len(schedules) > 0


def test_building_class_zone_discovery():
    b1 = Building("5ZoneAirCooled.idf")
    zones1 = b1.discover_zones()
    assert len(zones1) == 6
    assert "SPACE1-1" in zones1


class DummyAPI:
    class DummyExchange:
        def get_actuator_handle(self, state, stype, key, sch):
            return 42 if "setp" in sch.lower() or "clg" in sch.lower() or "htg" in sch.lower() else -1

        def set_actuator_value(self, state, handle, val):
            pass

    def __init__(self):
        self.exchange = self.DummyExchange()


def test_actuator_manager_dynamic_schedules():
    api = DummyAPI()
    mgr = ActuatorManager(api, idf_path="5ZoneAirCooled.idf")
    assert len(mgr.cooling_schedules) > 0
    assert len(mgr.heating_schedules) > 0

    mgr.set_cooling_setpoint(state=None, temp_c=24.0)
    mgr.set_heating_setpoint(state=None, temp_c=20.0)


def test_sensor_manager_initialization():
    api = DummyAPI()
    sm = SensorManager(api, idf_path="5ZoneAirCooled.idf")
    sm.register_variables()
    assert len(sm.variables) > 0
    assert "outdoor_temp" in sm.variables
