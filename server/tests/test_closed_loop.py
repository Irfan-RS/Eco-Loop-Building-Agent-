import pytest
from agent.mcp_server import MCPServer
from agent.cognitive_agent import CognitiveAgent

def test_mcp_server_tools():
    server = MCPServer()
    tools = server.get_tool_definitions()
    assert len(tools) >= 4
    tool_names = [t["name"] for t in tools]
    assert "get_building_status" in tool_names
    assert "adjust_thermostat_setpoints" in tool_names
    assert "evaluate_ecm" in tool_names
    assert "parse_simulation_errors" in tool_names
    assert "parse_idf_file" in tool_names
    assert "extract_runtime_errors" in tool_names
    assert "execute_simulation_task" in tool_names


def test_ecm_evaluation():
    server = MCPServer()
    # Test night setback (unoccupied)
    res_night = server.execute_tool("evaluate_ecm", {"hour": 2, "occupancy": 0.0, "pmv": 0.0})
    assert res_night["recommended_cooling_sp"] == 27.0
    assert res_night["recommended_heating_sp"] == 17.0

    # Test peak demand throttling
    res_peak = server.execute_tool("evaluate_ecm", {"hour": 15, "occupancy": 20.0, "pmv": 0.2})
    assert res_peak["recommended_cooling_sp"] == 25.5

    # Test morning pre-cooling
    res_precool = server.execute_tool("evaluate_ecm", {"hour": 7, "occupancy": 5.0, "pmv": 0.0})
    assert res_precool["recommended_cooling_sp"] == 23.0

def test_setpoint_boundary_safety():
    server = MCPServer()
    # Test bounds clamping
    res = server.execute_tool("adjust_thermostat_setpoints", {
        "cooling_setpoint": 35.0,  # exceeds upper safety limit
        "heating_setpoint": 10.0,  # below lower safety limit
        "reasoning": "Test bounds",
    })
    assert res["applied_cooling_setpoint"] == 28.0
    assert res["applied_heating_setpoint"] == 16.0
