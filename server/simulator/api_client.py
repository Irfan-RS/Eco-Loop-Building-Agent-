import sys
from pathlib import Path

# Add EnergyPlus installation to Python path
ENERGYPLUS_HOME = Path(r"C:\EnergyPlusV26-1-0")
sys.path.insert(0, str(ENERGYPLUS_HOME))

from pyenergyplus.api import EnergyPlusAPI

api = EnergyPlusAPI()

state = api.state_manager.new_state()