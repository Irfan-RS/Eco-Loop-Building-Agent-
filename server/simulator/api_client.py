import sys
from pathlib import Path
from config.settings import ENERGYPLUS_HOME

# Register EnergyPlus installation path dynamically
if str(ENERGYPLUS_HOME) not in sys.path:
    sys.path.insert(0, str(ENERGYPLUS_HOME))

try:
    from pyenergyplus.api import EnergyPlusAPI
    api = EnergyPlusAPI()
    state = api.state_manager.new_state()
except (ImportError, Exception):
    api = None
    state = None