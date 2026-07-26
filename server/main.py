import sys
import io
from pathlib import Path

# Force UTF-8 stdout encoding for Windows console compatibility
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from simulator.runner import run_comparative_simulations


def main():
    print("=" * 70)
    print("EcoLoop: Autonomous Smart Building Control Platform")
    print("Physics-Based EnergyPlus Simulation & MCP Cognitive Agent")
    print("=" * 70)

    results = run_comparative_simulations()

    print("\nVisual Dashboard Launch Command:")
    print("   .venv\\Scripts\\streamlit.exe run dashboard\\app.py\n")


if __name__ == "__main__":
    main()