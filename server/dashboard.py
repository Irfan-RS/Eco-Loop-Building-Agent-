import sys
import json
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
outputs_folder = BASE_DIR / "outputs"


def generate_static_dashboard():
    """Generate static comparative dashboard charts saved to outputs/dashboard_summary.png."""
    base_file = outputs_folder / "baseline_metrics.csv"
    ai_file = outputs_folder / "aicontrolled_metrics.csv"

    if not base_file.exists() or not ai_file.exists():
        print("[!] CSV metrics files not found in outputs/ folder. Run run_comparison.py first!")
        return

    df_base = pd.read_csv(base_file)
    df_ai = pd.read_csv(ai_file)

    base_kwh = df_base["cumulative_kwh"].iloc[-1]
    ai_kwh = df_ai["cumulative_kwh"].iloc[-1]
    pct_saved = ((base_kwh - ai_kwh) / base_kwh) * 100.0

    plt.style.use("dark_background")
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(12, 12), sharex=True)
    fig.suptitle(f"EcoLoop Building Agent — Quantitative Energy Savings ({pct_saved:.1f}% kWh Saved)", fontsize=16, fontweight="bold", color="#00E676")

    # Subplot 1: Electric Demand Power (kW)
    ax1.plot(df_base["electric_power_kw"], label="Baseline Power (kW)", color="#FF5252", linestyle="--", linewidth=1.5)
    ax1.plot(df_ai["electric_power_kw"], label="AI-Controlled Power (kW)", color="#00E676", linewidth=2)
    ax1.set_ylabel("Demand (kW)", fontsize=11)
    ax1.set_title("Building Electric Demand Power Over 5-Day Run Period", fontsize=12)
    ax1.legend(loc="upper right")
    ax1.grid(True, alpha=0.15)

    # Subplot 2: Cumulative Energy (kWh)
    ax2.plot(df_base["cumulative_kwh"], label="Baseline Cumulative kWh", color="#FF7043", linestyle="--", linewidth=1.5)
    ax2.plot(df_ai["cumulative_kwh"], label="AI-Controlled Cumulative kWh", color="#00E5FF", linewidth=2)
    ax2.set_ylabel("Cumulative kWh", fontsize=11)
    ax2.set_title(f"Total Consumption Comparison ({base_kwh:,.1f} kWh vs {ai_kwh:,.1f} kWh)", fontsize=12)
    ax2.legend(loc="upper left")
    ax2.grid(True, alpha=0.15)

    # Subplot 3: Zone Temp (°C) & PMV Comfort Index
    ax3.plot(df_ai["avg_indoor_temp"], label="Indoor Temp (°C)", color="#FFEB3B", linewidth=1.5)
    ax3.plot(df_ai["cooling_setpoint"], label="AI Cooling Setpoint (°C)", color="#00E5FF", linestyle=":", linewidth=1.5)
    ax3.plot(df_ai["heating_setpoint"], label="AI Heating Setpoint (°C)", color="#FF9100", linestyle=":", linewidth=1.5)
    ax3.axhline(0.5, color="#FF5252", linestyle="--", alpha=0.5, label="PMV Comfort Limit (±0.5)")
    ax3.axhline(-0.5, color="#FF5252", linestyle="--", alpha=0.5)
    ax3.set_xlabel("15-Minute Control Timesteps", fontsize=11)
    ax3.set_ylabel("Temp (°C) / PMV", fontsize=11)
    ax3.set_title("Zone Temperature Trajectories & ASHRAE 55 PMV Comfort Band Adherence", fontsize=12)
    ax3.legend(loc="upper right")
    ax3.grid(True, alpha=0.15)

    plt.tight_layout()
    chart_path = outputs_folder / "dashboard_summary.png"
    plt.savefig(chart_path, dpi=200)
    plt.close()

    print(f"📊 Dashboard summary charts saved to {chart_path}")


if __name__ == "__main__":
    generate_static_dashboard()
