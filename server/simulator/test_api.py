import sys
from pathlib import Path

ENERGYPLUS_HOME = Path(r"C:\EnergyPlusV26-1-0")

sys.path.insert(0, str(ENERGYPLUS_HOME))

from pyenergyplus.api import EnergyPlusAPI

api = EnergyPlusAPI()

print("✅ EnergyPlus API Loaded Successfully")