import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from pathlib import Path
import sys

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from simulator.discovery import BuildingDiscovery
from simulator.runner import run_comparative_simulations

# ==========================================================
# Page Configuration & CSS Theme
# ==========================================================
st.set_page_config(
    page_title="EcoLoop - Autonomous Smart Building Agent",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    .metric-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        backdrop-filter: blur(10px);
        margin-bottom: 15px;
    }
    .metric-value {
        font-size: 2.2rem;
        font-weight: 700;
        margin-top: 5px;
        color: #00E676;
    }
    .metric-label {
        font-size: 0.9rem;
        color: #90A4AE;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .metric-delta {
        font-size: 0.85rem;
        color: #64FFDA;
        font-weight: 600;
    }
    .stButton>button {
        background: linear-gradient(90deg, #00C853 0%, #00E676 100%);
        color: #000000;
        font-weight: 700;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        transition: all 0.3s ease;
    }
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 230, 118, 0.4);
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Header Section
st.title("🏢 EcoLoop: Autonomous Building Optimization Agent")
st.caption("Physics-Based EnergyPlus Simulation & MCP Agent Dynamic Closed-Loop Control")

# Sidebar Configuration
st.sidebar.image("https://img.icons8.com/isometric/96/000000/eco-energy.png", width=70)
st.sidebar.header("⚙️ Agent Controls & Simulation")

run_mode_select = st.sidebar.selectbox(
    "Simulation Execution Mode",
    ["View Saved Simulation Results", "Run Live Baseline vs AI Comparison"],
)

st.sidebar.subheader("🎯 Agent Targets & Constraints")
target_pmv_min = st.sidebar.slider("PMV Thermal Comfort Min", -1.0, 0.0, -0.5, 0.1)
target_pmv_max = st.sidebar.slider("PMV Thermal Comfort Max", 0.0, 1.0, 0.5, 0.1)
peak_tariff_start = st.sidebar.slider("Peak Tariff Start Hour", 10, 16, 14)
peak_tariff_end = st.sidebar.slider("Peak Tariff End Hour", 16, 21, 18)

# Output Paths
outputs_dir = BASE_DIR / "outputs"
baseline_csv = outputs_dir / "baseline_metrics.csv"
ai_csv = outputs_dir / "aicontrolled_metrics.csv"

if run_mode_select == "Run Live Baseline vs AI Comparison" or st.sidebar.button("🚀 Run Closed-Loop Simulation"):
    with st.spinner("⚡ Running physics-based EnergyPlus Baseline & AI-Controlled simulations..."):
        run_comparative_simulations()
        st.success("🎉 Simulation pipeline completed successfully!")

# Load Data
df_base = None
df_ai = None

if baseline_csv.exists() and ai_csv.exists():
    df_base = pd.read_csv(baseline_csv)
    df_ai = pd.read_csv(ai_csv)

if df_base is None or df_ai is None:
    st.info("💡 No simulation records found. Click 'Run Live Baseline vs AI Comparison' in the sidebar to generate data!")
else:
    # Compute Comparative Metrics
    base_total_kwh = df_base["cumulative_kwh"].iloc[-1] if not df_base.empty else 0.0
    ai_total_kwh = df_ai["cumulative_kwh"].iloc[-1] if not df_ai.empty else 0.0
    kwh_saved = base_total_kwh - ai_total_kwh
    pct_saved = (kwh_saved / base_total_kwh * 100.0) if base_total_kwh > 0 else 0.0

    base_peak_kw = df_base["electric_power_kw"].max()
    ai_peak_kw = df_ai["electric_power_kw"].max()
    peak_cut_kw = base_peak_kw - ai_peak_kw
    peak_pct_cut = (peak_cut_kw / base_peak_kw * 100.0) if base_peak_kw > 0 else 0.0

    co2_saved_kg = kwh_saved * 0.42

    occupied_ai = df_ai[df_ai["total_occupancy"] > 0]
    compliance_rate = (1.0 - occupied_ai["comfort_violated"].mean()) * 100.0 if not occupied_ai.empty else 100.0

    # ==========================================================
    # Top KPI Cards
    # ==========================================================
    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Energy Reduction</div>
                <div class="metric-value">{pct_saved:.1f}%</div>
                <div class="metric-delta">⚡ {kwh_saved:,.1f} kWh Saved</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col2:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Peak Demand Reduction</div>
                <div class="metric-value">{peak_pct_cut:.1f}%</div>
                <div class="metric-delta">📉 {peak_cut_kw:,.1f} kW Peak Cut</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col3:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">CO2 Carbon Saved</div>
                <div class="metric-value">{co2_saved_kg:,.1f}</div>
                <div class="metric-delta">🌱 kg CO2e Avoided</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col4:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Thermal Comfort Rate</div>
                <div class="metric-value">{compliance_rate:.1f}%</div>
                <div class="metric-delta">🛋️ ASHRAE 55 Compliant</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col5:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">AI Control Actions</div>
                <div class="metric-value">{len(df_ai)}</div>
                <div class="metric-delta">🔄 Closed-Loop Timesteps</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # ==========================================================
    # Tabs Layout
    # ==========================================================
    tab1, tab2, tab3 = st.tabs(["📊 Performance & Savings Charts", "🤖 Agent Closed-Loop Telemetry", "🏗️ Building Model Inspector"])

    with tab1:
        st.subheader("⚡ Electricity Demand Power (kW) & Cumulative Consumption (kWh)")

        fig = make_subplots(
            rows=2, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.1,
            subplot_titles=("Building Electric Demand Power (kW)", "Cumulative Energy Consumption (kWh)"),
        )

        # Electric Power Chart
        fig.add_trace(
            go.Scatter(
                y=df_base["electric_power_kw"],
                name="Baseline Power (kW)",
                line=dict(color="#FF5252", width=2, dash="dash"),
            ),
            row=1, col=1,
        )
        fig.add_trace(
            go.Scatter(
                y=df_ai["electric_power_kw"],
                name="AI-Controlled Power (kW)",
                line=dict(color="#00E676", width=2.5),
            ),
            row=1, col=1,
        )

        # Cumulative Energy Chart
        fig.add_trace(
            go.Scatter(
                y=df_base["cumulative_kwh"],
                name="Baseline Total kWh",
                line=dict(color="#FF7043", width=2, dash="dash"),
            ),
            row=2, col=1,
        )
        fig.add_trace(
            go.Scatter(
                y=df_ai["cumulative_kwh"],
                name="AI-Controlled Total kWh",
                line=dict(color="#29B6F6", width=2.5),
            ),
            row=2, col=1,
        )

        fig.update_layout(
            height=600,
            template="plotly_dark",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0.2)",
            legend=dict(orientation="h", y=1.1),
        )
        st.plotly_chart(fig, use_container_width=True)

        st.subheader("🛋️ Zone Temperature (°C) & PMV Thermal Comfort Index")
        fig_temp = make_subplots(
            rows=2, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.12,
            subplot_titles=("Average Indoor Temperature vs Thermostat Setpoints", "PMV Fanger Comfort Index (-0.5 to +0.5 Boundary)"),
        )

        fig_temp.add_trace(
            go.Scatter(
                y=df_ai["avg_indoor_temp"],
                name="Indoor Temp (°C)",
                line=dict(color="#FFEB3B", width=2),
            ),
            row=1, col=1,
        )
        fig_temp.add_trace(
            go.Scatter(
                y=df_ai["cooling_setpoint"],
                name="Cooling Setpoint (°C)",
                line=dict(color="#00E5FF", width=2, dash="dot"),
            ),
            row=1, col=1,
        )
        fig_temp.add_trace(
            go.Scatter(
                y=df_ai["heating_setpoint"],
                name="Heating Setpoint (°C)",
                line=dict(color="#FF9100", width=2, dash="dot"),
            ),
            row=1, col=1,
        )

        # PMV Chart
        fig_temp.add_trace(
            go.Scatter(
                y=df_ai["avg_pmv"],
                name="AI PMV Index",
                line=dict(color="#E040FB", width=2),
            ),
            row=2, col=1,
        )
        fig_temp.add_hline(y=0.5, line=dict(color="#FF5252", dash="dash"), row=2, col=1, annotation_text="PMV Upper Limit (+0.5)")
        fig_temp.add_hline(y=-0.5, line=dict(color="#FF5252", dash="dash"), row=2, col=1, annotation_text="PMV Lower Limit (-0.5)")

        fig_temp.update_layout(
            height=550,
            template="plotly_dark",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0.2)",
            legend=dict(orientation="h", y=1.1),
        )
        st.plotly_chart(fig_temp, use_container_width=True)

    with tab2:
        st.subheader("📋 Closed-Loop Agent Reasoning & Tool Calls")
        st.dataframe(
            df_ai[[
                "time_str", "outdoor_temp", "avg_indoor_temp", "avg_pmv",
                "total_occupancy", "electric_power_kw", "cooling_setpoint",
                "heating_setpoint", "comfort_violated"
            ]],
            use_container_width=True,
        )

    with tab3:
        st.subheader("🏗️ Building Model Inspector (IDF Analysis)")
        discovery = BuildingDiscovery()
        zones = discovery.get_zones()
        people = discovery.get_people()
        hvac = discovery.get_hvac()

        col_z, col_h = st.columns(2)
        with col_z:
            st.markdown(f"**Thermal Zones ({len(zones)}):**")
            st.json(zones)
        with col_h:
            st.markdown("**HVAC System Equipment:**")
            st.json(hvac)
