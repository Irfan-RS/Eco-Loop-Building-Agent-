# EcoLoop Building Agent — Physical AI PoC

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![EnergyPlus](https://img.shields.io/badge/EnergyPlus-26.1.0-green.svg)](https://energyplus.net/)
[![PyEnergyPlus C API](https://img.shields.io/badge/PyEnergyPlus-C--API--Bridge-00E5FF.svg)](https://energyplus.net/)
[![eppy Model Editor](https://img.shields.io/badge/eppy-IDF--Model--Editor-FF6B6B.svg)](https://eppy.readthedocs.io/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Standard--Tool--Calling-purple.svg)](https://modelcontextprotocol.io/)
[![Open-Source LLM](https://img.shields.io/badge/LLM-Llama--3.1--8B-orange.svg)](https://ollama.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://react.dev/)

**EcoLoop** is an autonomous closed-loop building energy control system establishing a Physical AI pipeline. It pairs **EnergyPlus** (physics-based building energy simulator) with a local **Open-Source LLM** (Llama 3.1 8B via Ollama / self-hosted OSS API) acting as an autonomous control agent.

The agent reads simulation telemetry every 15-minute timestep, evaluates energy/comfort tradeoffs against ASHRAE 55 thermal comfort boundaries ($\text{PMV} \pm 0.5$), and injects setpoint overrides back into EnergyPlus memory handles — with **zero human intervention** during the loop.

---

## 🏛️ Three Technical Pillars

```
+-----------------------------------------------------------------------------------+
|                        1. SIMULATION ENGINE (ENERGYPLUS)                          |
|                                                                                   |
|  EnergyPlus V26.1 Engine  <=======>  PyEnergyPlus C API  <=======>  eppy IDD Engine |
|  (Digital Twin Physics)             (Sensors & Actuators)          (.idf Models)  |
+-----------------------------------------------------------------------------------+
                                         ||
                              15-min Timestep Telemetry
                                         ||
                                         \/
+-----------------------------------------------------------------------------------+
|                     2. COGNITIVE ENGINE (OSS LLM + MCP PROTOCOL)                  |
|                                                                                   |
|  Local Llama 3.1 8B LLM   <=======>  MCP Server (7 Tools)  <=======>  Watchdog    |
|  (Autonomous Reasoning)             (Standard Tool Calling)        (3-Strike Safety) |
+-----------------------------------------------------------------------------------+
                                         ||
                              Forward Setpoint Overrides
                                         ||
                                         \/
+-----------------------------------------------------------------------------------+
|                       3. CLOSED-LOOP CONTROL FRAMEWORK                            |
|                                                                                   |
|  [Feedback Stream]  ==>  [LLM Reasoning]  ==>  [Control Action]  ==>  [Memory Injection]
|  (Zone Temps, PMV)       (ASHRAE 55 Check)     (ECMs & Setpoints)     (set_actuator_value)
+-----------------------------------------------------------------------------------+
```

### 1. Simulation Engine — EnergyPlus
- Serves as the **physics-based "digital twin"** of commercial building structures.
- Integrated into Python using **PyEnergyPlus C API callbacks** (`callback_begin_zone_timestep_after_init_heat_balance`) and **`eppy`** IDF object manipulation.
- Processes `.idf` building model files (`5ZoneAirCooled.idf`, `ASHRAE901_OfficeMedium.idf`) and `.epw` weather data streams (Chicago, San Francisco TMY3).

### 2. Cognitive Engine — Open-Source LLM + MCP Protocol
- Deploys a local/self-hosted open-source LLM (**Llama 3.1 8B** via Ollama / local OSS server API).
- Exposes capabilities through a standardized **Model Context Protocol (MCP) Server** with 7 tools:
  - `get_building_status`: Queries live telemetry metrics.
  - `adjust_thermostat_setpoints`: Validates deadband safety and injects setpoints.
  - `evaluate_ecm`: Selects optimal Energy Conservation Measure strategies.
  - `parse_idf_file`: Discovers zones, HVAC loops, and schedule limits.
  - `extract_runtime_errors`: Diagnoses `eplusout.err` log warnings & severe errors.
  - `execute_simulation_task`: Executes baseline vs AI simulation runs.
  - `parse_simulation_errors`: Error log parser.
- Autonomously reads files, catches runtime errors, and takes actions without requiring humans to rewrite code.

### 3. Closed-Loop Control Framework
- **Feedback**: EnergyPlus streams sub-hourly metrics → indoor temperatures, occupancy, electric demand power (kW), and Fanger PMV comfort index.
- **Reasoning**: LLM compares telemetry against core targets (ASHRAE 55 comfort bounds $-0.5 \le \text{PMV} \le +0.5$, peak demand throttling 14:00–18:00, grid carbon pre-cooling 06:00–08:00).
- **Control Action**: LLM computes optimal Energy Conservation Measures (Unoccupied Night Setback, Peak Throttling, Pre-Cooling, PMV Guard) and target setpoints.
- **Forward Injection**: Setpoints are injected directly into active PyEnergyPlus C memory handles (`api.exchange.set_actuator_value`) before heat balance calculations complete — closing the control loop automatically.

---

## 🏆 Quantitative Savings Deliverable (5-Day Run Period)

Executed across **480 sub-hourly timesteps** (July 7–12, 15-min timesteps) on `5ZoneAirCooled.idf` with Chicago TMY3 Weather:

| Performance Metric | Baseline Rule-Based Mode | AI-Controlled Closed-Loop | Quantitative Improvement |
| :--- | :--- | :--- | :--- |
| **Building Model** | `5ZoneAirCooled.idf` | `5ZoneAirCooled.idf` | **Bundled Building Model** |
| **Weather Profile** | Chicago O'Hare TMY3 | Chicago O'Hare TMY3 | **Zone 5A Cold / Hot** |
| **Simulated Timesteps** | 480 (15-min intervals) | 480 (15-min intervals) | **5 Simulated Days** |
| **Total Energy Consumed** | 2,660.65 kWh | 2,062.48 kWh | **⚡ 598.17 kWh Saved (22.5% Savings)** |
| **Peak Demand Load (kW)** | 43.27 kW | 22.96 kW | **📉 20.31 kW Peak Cut (46.9% Cut)** |
| **CO2 Carbon Emissions** | 1,117.47 kg CO2e | 866.24 kg CO2e | **🌱 251.23 kg CO2e Avoided** |
| **ASHRAE 55 Compliance** | 100.0% | 100.0% | **🛋️ 100.0% Compliance** |

---

## ✨ Full Feature Overview

- 🎛️ **Per-Zone Closed-Loop Analytics Inspector**: Sub-header zone selector buttons (`SPACE1-1` to `PLENUM-1`) displaying the 4 closed-loop steps side-by-side (Baseline vs AI).
- 📊 **Executive KPI Cards**: Real-time energy savings (kWh), peak kW load cut, avoided $\text{CO}_2$ emissions, and ASHRAE 55 PMV compliance percentage.
- 📈 **Interactive Time-Series Charts**: Plotly downsampled comparative graphs for energy demand, indoor temps, setpoints, and PMV comfort.
- 🗺️ **Architectural Thermal Zone Floorplan Diagrams**: 2D SVG spatial floorplan diagrams with multi-floor level switcher (Level 3 Top, Level 2 Mid, Level 1 Ground), zone simulation triggers, and JSON report exports.
- 📋 **Live Telemetry Data Logs**: Sub-hourly 15-minute timestep records.
- 🏗️ **IDF Model Inspector**: Thermal zones, occupant loads, HVAC equipment, and schedule limits inspector.
- 📝 **Setpoint Audit Logger**: Automatic CSV (`setpoint_change_log.csv`) and JSON (`setpoint_change_log.json`) logging of every AI setpoint decision.
- ⚙️ **Eppy Modified IDF Generator**: Automatically updates schedule objects and exports a submittable `modified_building.idf` artifact at the end of each run.
- 📁 **Per-Calculation Timestamped Output Directories**: Every run saves a dedicated folder `outputs/run_YYYYMMDD_HHMMSS/` containing all 6 output files and `energyplus_raw/`.
- 🌐 **Single-Port 24/7 Deployment**: FastAPI (`api_server.py`) serves BOTH the REST API and the React web app (`frontend/dist/`) on a single port (8000) for instant reviewer access.

---

## 🛠️ Tech Stack & Tools

- **Physics Simulator**: EnergyPlus V26.1.0, PyEnergyPlus C API, eppy
- **Cognitive AI & Protocol**: Llama 3.1 8B, Model Context Protocol (MCP), PyTest
- **Backend Service**: Python 3.11+, FastAPI, Uvicorn, Pandas, RegEx Error Diagnostic
- **Frontend Dashboard**: React 18, Vite 6, Vanilla CSS, Lucide Icons, Plotly.js
- **Cloud Deployment**: Docker, Render Blueprint, Vercel Manifest, HuggingFace Spaces

---

## 🚀 Execution Instructions

### 1. Git Repository Setup
```bash
git remote add origin https://github.com/Irfan-RS/Eco-Loop-Building-Agent-.git
```

### 2. Run Comparative Simulation Pipeline
```powershell
.venv\Scripts\python.exe run_comparison.py
```

### 3. Launch REST Server & React Web Dashboard (Single Port 8000)
```powershell
# Serves REST API + Built React Web App at http://localhost:8000
.venv\Scripts\python.exe api_server.py
```

### 4. Run Automated Test Suite
```powershell
.venv\Scripts\python.exe -m pytest tests/
```

---

## 🌐 1-Click Cloud Deployment Guide

### Option A: Render.com (1-Click Blueprint)
1. Push repository to GitHub.
2. Go to [render.com](https://render.com) $\rightarrow$ **New Web Service** $\rightarrow$ Connect GitHub Repo.
3. Render automatically detects [render.yaml](file:///e:/Projects/EcoLoop-Building-Agent/render.yaml).
4. Click **Apply**. It deploys a live 24/7 HTTPS URL (e.g., `https://ecoloop-agent.onrender.com`).

### Option B: HuggingFace Spaces (24/7 Free Docker Container)
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) $\rightarrow$ **Create New Space**.
2. Select **Docker** environment.
3. Upload project repository containing [Dockerfile](file:///e:/Projects/EcoLoop-Building-Agent/Dockerfile).
4. HuggingFace hosts the app 24/7 on free 2 vCPU / 16 GB RAM hardware.
