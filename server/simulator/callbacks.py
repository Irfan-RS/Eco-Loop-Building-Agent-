import sys
from pathlib import Path

from simulator.sensors import SensorManager
from simulator.actuators import ActuatorManager
from simulator.logger import SimulationLogger
from agent.cognitive_agent import CognitiveAgent

# Instances managed per simulation run
api_instance = None
sensor_manager = None
actuator_manager = None
cognitive_agent = None
simulation_logger = None
active_mode = "Baseline"

def reset_callback_state(active_api, mode: str = "Baseline", idf_path=None):
    """Reset managers and logger with the active EnergyPlus API instance for a new run."""
    global api_instance, sensor_manager, actuator_manager, cognitive_agent, simulation_logger, active_mode
    api_instance = active_api
    active_mode = mode
    sensor_manager = SensorManager(active_api, idf_path=idf_path)
    actuator_manager = ActuatorManager(active_api, idf_path=idf_path)
    cognitive_agent = CognitiveAgent(actuator_manager=actuator_manager)
    simulation_logger = SimulationLogger(run_mode=mode, zones=sensor_manager.zones)



def on_zone_timestep(state):
    """EnergyPlus API callback triggered at each zone timestep after heat balance."""
    global api_instance, sensor_manager, actuator_manager, cognitive_agent, simulation_logger, active_mode

    if api_instance is None or not api_instance.exchange.api_data_fully_ready(state):
        return

    # Ignore sizing warmup timesteps
    if api_instance.exchange.warmup_flag(state):
        return

    # Guarantee instances are initialized
    if sensor_manager is None:
        reset_callback_state(api_instance, mode=active_mode)

    # Read current building telemetry
    bld_state = sensor_manager.read(state)


    if simulation_logger.run_mode == "AI-Controlled":
        # Closed-loop AI dynamic setpoint optimization
        clg_sp, htg_sp, reasoning = cognitive_agent.evaluate_timestep(state, bld_state)
    else:
        # Baseline mode: Standard static setpoints (23°C cooling, 20°C heating)
        clg_sp = 23.0
        htg_sp = 20.0
        actuator_manager.apply_setpoints(state, clg_sp, htg_sp)

    # Log metrics for time-series CSV export & KPI calculation
    simulation_logger.log_timestep(bld_state, clg_sp, htg_sp)