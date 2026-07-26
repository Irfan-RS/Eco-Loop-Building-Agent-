import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from agent.mcp_server import MCPServer
from agent.cognitive_agent import CognitiveAgent


def test_mcp_server_tool_definitions():
    mcp = MCPServer()
    tools = mcp.get_tool_definitions()
    tool_names = [t["name"] for t in tools]

    assert "get_building_status" in tool_names
    assert "adjust_thermostat_setpoints" in tool_names
    assert "evaluate_ecm" in tool_names
    assert "parse_simulation_errors" in tool_names
    assert "parse_idf_file" in tool_names
    assert "extract_runtime_errors" in tool_names
    assert "execute_simulation_task" in tool_names


def test_mcp_parse_idf_file_tool():
    mcp = MCPServer()
    res = mcp.execute_tool("parse_idf_file", {"idf_name": "5ZoneAirCooled.idf"})
    assert res["status"] == "success"
    assert res["zones_count"] == 6
    assert "SPACE1-1" in res["zones"]
    assert "hvac_summary" in res


def test_mcp_extract_runtime_errors_tool():
    mcp = MCPServer()
    res = mcp.execute_tool("extract_runtime_errors", {})
    assert res["status"] == "success"
    assert "warnings_count" in res
    assert "fatal_count" in res
    assert "automated_mitigations" in res


def test_cognitive_agent_mcp_integration():
    agent = CognitiveAgent()
    idf_info = agent.parse_idf_model("5ZoneAirCooled.idf")
    assert idf_info["status"] == "success"
    assert idf_info["zones_count"] == 6

    diag = agent.diagnose_runtime_errors()
    assert diag["status"] == "success"
