from typing import Dict, Any, List


def get_agent_tools_schema() -> List[Dict[str, Any]]:
    """
    Returns MCP-compliant JSON schema tool definitions for LLM tool-calling.
    Matches energyplus_bridge.py functions 1:1.
    """
    return [
        {
            "name": "get_zone_status",
            "description": "Fetch real-time sensor status (temperature, PMV comfort index, humidity, occupancy, power) for a specific thermal zone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "zone_name": {
                        "type": "string",
                        "description": "Target zone name (e.g., SPACE1-1, SPACE2-1, SPACE3-1)",
                    }
                },
                "required": ["zone_name"],
            },
        },
        {
            "name": "get_all_zones_status",
            "description": "Fetch real-time telemetry list across all thermal zones in the building.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "set_zone_setpoint",
            "description": "Override cooling and heating thermostat setpoint values in Celsius for the target zone / building.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cooling_setpoint": {
                        "type": "number",
                        "description": "Target cooling setpoint temperature in °C (recommended: 23.0 to 27.0 °C)",
                    },
                    "heating_setpoint": {
                        "type": "number",
                        "description": "Target heating setpoint temperature in °C (recommended: 17.0 to 21.0 °C)",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Rationale for the setpoint adjustment (e.g., peak load throttling, pre-cooling, unoccupied setback)",
                    },
                },
                "required": ["cooling_setpoint", "heating_setpoint", "reasoning"],
            },
        },
        {
            "name": "get_current_sim_time",
            "description": "Fetch current simulation clock time.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "parse_error_log",
            "description": "Parse EnergyPlus simulation error log (.err) and extract filtered warning or severe error messages.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    ]
