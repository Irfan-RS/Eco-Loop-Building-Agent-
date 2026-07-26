import json
from pathlib import Path
from typing import Dict, Any, List
from config.settings import OUTPUT_DIR


class MCPServer:
    """
    Model Context Protocol (MCP) Server for EcoLoop Building Agents.
    Exposes standardized agent tools for telemetry inspection, dynamic setpoint adjustment,
    Energy Conservation Measure (ECM) reasoning, and simulation log diagnostics.
    """

    def __init__(self, actuator_manager=None):
        self.actuator_manager = actuator_manager
        self.current_cooling_sp: float = 24.0
        self.current_heating_sp: float = 21.0
        self.last_action_reason: str = "Baseline schedule initialized"

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Return MCP-compliant tool schema definitions for LLM tool calling."""
        return [
            {
                "name": "get_building_status",
                "description": "Fetch real-time building telemetry including zone temperatures, PMV comfort scores, occupancy, electric demand power, and weather.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                },
            },
            {
                "name": "adjust_thermostat_setpoints",
                "description": "Dynamically adjust building cooling and heating thermostat setpoints.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "cooling_setpoint": {
                            "type": "number",
                            "description": "Target cooling setpoint temperature in °C (recommended range: 23.0 to 27.0 °C)",
                        },
                        "heating_setpoint": {
                            "type": "number",
                            "description": "Target heating setpoint temperature in °C (recommended range: 19.0 to 21.0 °C)",
                        },
                        "reasoning": {
                            "type": "string",
                            "description": "Rationale for setpoint override (e.g., pre-cooling, peak demand reduction, unoccupied setback)",
                        },
                    },
                    "required": ["cooling_setpoint", "heating_setpoint", "reasoning"],
                },
            },
            {
                "name": "evaluate_ecm",
                "description": "Evaluate and select optimal Energy Conservation Measures (ECMs) based on occupancy, peak demand hours, and grid carbon intensity.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "hour": {"type": "integer", "description": "Current hour of the day (0-23)"},
                        "occupancy": {"type": "number", "description": "Current total occupant count"},
                        "pmv": {"type": "number", "description": "Average PMV comfort index"},
                    },
                    "required": ["hour", "occupancy", "pmv"],
                },
            },
            {
                "name": "parse_simulation_errors",
                "description": "Scan EnergyPlus simulation error logs (.err) for runtime warnings or fatal execution errors.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                },
            },
            {
                "name": "parse_idf_file",
                "description": "Parse an EnergyPlus IDF file to extract thermal zones, HVAC components, occupancy models, and schedules.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "idf_name": {
                            "type": "string",
                            "description": "IDF building model filename (e.g., '5ZoneAirCooled.idf' or 'ASHRAE901_OfficeMedium_STD2019_Denver.idf')",
                        },
                    },
                },
            },
            {
                "name": "extract_runtime_errors",
                "description": "Extract, analyze, and diagnose runtime simulation warnings, severe errors, and execution tracebacks.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "log_filename": {
                            "type": "string",
                            "description": "Error log filename to analyze (default: 'eplusout.err')",
                        },
                    },
                },
            },
            {
                "name": "execute_simulation_task",
                "description": "Autonomously execute a baseline vs AI-controlled physics simulation task.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "description": "Simulation mode: 'Comparative', 'Baseline', or 'AI-Controlled'",
                        },
                        "idf_name": {
                            "type": "string",
                            "description": "Building model IDF filename",
                        },
                        "weather_name": {
                            "type": "string",
                            "description": "Weather EPW filename",
                        },
                        "period": {
                            "type": "string",
                            "description": "Simulation period (e.g., '5days', '7days', 'full')",
                        },
                    },
                },
            },
        ]

    def execute_tool(self, tool_name: str, args: Dict[str, Any], state=None) -> Dict[str, Any]:
        """Execute an MCP tool request and return structured response payload."""
        if tool_name == "get_building_status":
            return self._handle_get_building_status(state)
        elif tool_name == "adjust_thermostat_setpoints":
            return self._handle_adjust_setpoints(args, state)
        elif tool_name == "evaluate_ecm":
            return self._handle_evaluate_ecm(args)
        elif tool_name in ["parse_simulation_errors", "extract_runtime_errors"]:
            return self._handle_parse_errors(args)
        elif tool_name == "parse_idf_file":
            return self._handle_parse_idf_file(args)
        elif tool_name == "execute_simulation_task":
            return self._handle_execute_simulation_task(args)
        else:
            return {"status": "error", "message": f"Unknown tool: {tool_name}"}

    def _handle_get_building_status(self, state) -> Dict[str, Any]:
        if state is None:
            return {"status": "error", "message": "State unavailable"}

        return {
            "status": "success",
            "telemetry": {
                "time": getattr(state, "current_time_str", "Day 01 00:00"),
                "outdoor_temp_c": round(getattr(state, "outdoor_temp", 20.0), 2),
                "avg_indoor_temp_c": round(getattr(state, "avg_indoor_temp", 22.0), 2),
                "avg_pmv": round(getattr(state, "avg_pmv", 0.0), 2),
                "total_occupancy": round(getattr(state, "total_occupancy", 0.0), 1),
                "electric_power_kw": round(getattr(state, "electric_power_kw", 15.0), 2),
                "cooling_setpoint_c": self.current_cooling_sp,
                "heating_setpoint_c": self.current_heating_sp,
                "last_reason": self.last_action_reason,
            },
        }

    def _handle_adjust_setpoints(self, args: Dict[str, Any], state) -> Dict[str, Any]:
        clg = float(args.get("cooling_setpoint", 24.0))
        htg = float(args.get("heating_setpoint", 21.0))
        reason = str(args.get("reasoning", "Autonomous setpoint update"))

        # Safety Boundaries Validation
        clg = max(22.0, min(28.0, clg))
        htg = max(16.0, min(22.0, htg))
        if clg - htg < 1.0:
            clg = htg + 1.0  # Maintain minimum deadband

        self.current_cooling_sp = clg
        self.current_heating_sp = htg
        self.last_action_reason = reason

        if self.actuator_manager and state is not None:
            self.actuator_manager.apply_setpoints(state, clg, htg)

        return {
            "status": "success",
            "applied_cooling_setpoint": clg,
            "applied_heating_setpoint": htg,
            "reasoning": reason,
        }

    def _handle_evaluate_ecm(self, args: Dict[str, Any]) -> Dict[str, Any]:
        hour = int(args.get("hour", 12))
        occ = float(args.get("occupancy", 0.0))
        pmv = float(args.get("pmv", 0.0))
        recommended_ecm = "Standard Occupied Comfort Guard"

        # Dynamic Strategy Selection Logic
        # 1. Unoccupied Hours (Night / Weekend) -> Setback
        if occ <= 0.5:
            recommended_ecm = "Unoccupied Night Setback"
            clg_sp = 27.0
            htg_sp = 17.0
            reason = "Building unoccupied; expanding setpoint deadband to minimize HVAC energy consumption."

        # 2. Peak Hours (14:00 - 18:00) -> Demand Throttling
        elif 14 <= hour <= 18:
            recommended_ecm = "Peak Demand Throttling"
            clg_sp = 25.5
            htg_sp = 20.0
            reason = "High peak grid electricity tariff/carbon period; shifting cooling setpoint up to 25.5°C within thermal comfort limit (PMV < +0.4)."

        # 3. Morning Pre-Cooling (06:00 - 08:00) -> Grid Optimization
        elif 6 <= hour < 9:
            recommended_ecm = "Pre-Cooling Optimization"
            clg_sp = 23.0
            htg_sp = 21.0
            reason = "Low grid carbon intensity; pre-cooling thermal mass prior to peak daytime occupancy."

        # 4. Standard Occupied Operating Hours -> Active Thermal Comfort Guard
        else:
            recommended_ecm = "Active Thermal Comfort Guard"
            if pmv > 0.4:
                clg_sp = 23.5
                htg_sp = 20.0
                reason = "Occupants slightly warm (PMV > 0.4); lowering cooling setpoint to restore comfort."
            elif pmv < -0.4:
                clg_sp = 25.0
                htg_sp = 21.5
                reason = "Occupants slightly cool (PMV < -0.4); raising heating setpoint to restore comfort."
            else:
                clg_sp = 24.5
                htg_sp = 20.5
                reason = "Thermal comfort optimal (-0.4 <= PMV <= 0.4); maintaining energy efficient setpoints."

        return {
            "status": "success",
            "ecm_name": recommended_ecm,
            "recommended_cooling_sp": clg_sp,
            "recommended_heating_sp": htg_sp,
            "reasoning": reason,
        }

    def _handle_parse_errors(self, args: Dict[str, Any] = None) -> Dict[str, Any]:
        filename = (args or {}).get("log_filename", "eplusout.err")
        err_file = OUTPUT_DIR / filename
        if not err_file.exists():
            sub_errs = list(OUTPUT_DIR.glob("run_*/eplusout.err")) + list((OUTPUT_DIR.parent.parent / "outputs").glob("run_*/energyplus_raw/eplusout.err"))
            if sub_errs:

                err_file = sorted(sub_errs, key=lambda p: p.stat().st_mtime, reverse=True)[0]
            else:
                return {
                    "status": "success",
                    "warnings_count": 0,
                    "fatal_count": 0,
                    "sample_issues": [],
                    "automated_mitigations": ["No active error log found. Run a simulation calculation first."],
                }


        warnings = 0
        fatals = 0
        sample_logs = []
        mitigations = []

        try:
            with open(err_file, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            for line in lines:
                line_str = line.strip()
                if "** Warning **" in line_str:
                    warnings += 1
                elif "** Severe **" in line_str or "** Fatal **" in line_str:
                    fatals += 1

                if len(sample_logs) < 15 and any(k in line_str for k in ["** Warning **", "** Severe **", "** Fatal **"]):
                    sample_logs.append(line_str)

            # Analyze root causes and recommend automated mitigations
            if fatals > 0:
                mitigations.append("Fatal error detected: Verify EnergyPlus IDD dictionary path and EPW weather file headers.")
            if warnings > 0:
                mitigations.append("Warnings detected: Ensure sensor/actuator handles match requested Output:Variable keys in IDF.")
            if fatals == 0 and warnings == 0:
                mitigations.append("Clean execution: Simulation completed with 0 fatal errors and 0 warnings.")

        except Exception as e:
            return {"status": "error", "message": f"Error parsing log file: {str(e)}"}

        return {
            "status": "success",
            "warnings_count": warnings,
            "fatal_count": fatals,
            "sample_issues": sample_logs,
            "automated_mitigations": mitigations,
        }

    def _handle_parse_idf_file(self, args: Dict[str, Any]) -> Dict[str, Any]:
        idf_name = args.get("idf_name", "5ZoneAirCooled.idf")
        try:
            from simulator.discovery import BuildingDiscovery
            bd = BuildingDiscovery(idf_name)
            zones = bd.get_zones()
            people = bd.get_people()
            hvac = bd.get_hvac()
            schedules = bd.get_schedules()

            return {
                "status": "success",
                "idf_name": idf_name,
                "zones_count": len(zones),
                "zones": zones,
                "people_count": len(people),
                "people": people,
                "hvac_summary": {k: len(v) for k, v in hvac.items()},
                "hvac_details": hvac,
                "schedules_count": len(schedules),
                "sample_schedules": schedules[:15],
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to parse IDF file '{idf_name}': {str(e)}"}

    def _handle_execute_simulation_task(self, args: Dict[str, Any]) -> Dict[str, Any]:
        mode = args.get("mode", "Comparative")
        idf_name = args.get("idf_name", "5ZoneAirCooled.idf")
        weather_name = args.get("weather_name", "USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw")
        period = args.get("period", "5days")

        try:
            if mode in ["Comparative", "all"]:
                from simulator.runner import run_comparative_simulations
                results = run_comparative_simulations(model_name=idf_name, weather_name=weather_name, period=period)
                return {
                    "status": "success",
                    "task": "Comparative Simulation Execution",
                    "mode": mode,
                    "model": idf_name,
                    "results_summary": results,
                }
            else:
                from simulator.runner import run_single_simulation_process
                results = run_single_simulation_process(mode=mode, idf_name=idf_name, weather_name=weather_name)
                return {
                    "status": "success",
                    "task": f"Single Simulation Process ({mode})",
                    "mode": mode,
                    "model": idf_name,
                    "results_summary": results,
                }
        except Exception as e:
            return {"status": "error", "message": f"Simulation task execution failed: {str(e)}"}

