import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from simulator.discovery import BuildingDiscovery

building = BuildingDiscovery()


variables = building.get_output_variables()

print("=" * 60)
print("OUTPUT VARIABLES")
print("=" * 60)

for v in variables:
    print(v)