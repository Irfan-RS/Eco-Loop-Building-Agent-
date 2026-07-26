import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from simulator.building import Building

building = Building()

zones = building.discover_zones()

print(zones)