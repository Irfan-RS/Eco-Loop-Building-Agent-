import sys
from pathlib import Path
from typing import Tuple

class BaselineController:
    """
    Rule-Based Baseline Thermostat Controller.
    Applies standard fixed time-of-day setpoint schedules (no AI optimization)
    to generate the baseline 'before' dataset for quantitative savings comparison.
    """

    def __init__(self, bridge=None):
        self.bridge = bridge

    def decide_and_act(self, ep_state, bld_state) -> Tuple[float, float, str]:
        """
        Baseline control step:
        Applies standard scheduled setpoints (23.0°C cooling, 20.0°C heating during day; 27.0°C / 17.0°C night).
        """
        hour = bld_state.hour
        # Standard commercial office schedule: 07:00 to 22:00 daytime setpoints
        if 7 <= hour < 22:
            clg = 23.0
            htg = 20.0
            reason = "[Baseline Rule-Based] Standard daytime scheduled setpoint"
        else:
            clg = 27.0
            htg = 17.0
            reason = "[Baseline Rule-Based] Standard nighttime scheduled setback"

        if self.bridge:
            self.bridge.set_zone_setpoint(ep_state, clg, htg)

        return clg, htg, reason
