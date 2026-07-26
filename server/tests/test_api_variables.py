import sys
from pathlib import Path

ENERGYPLUS_HOME = Path(r"C:\EnergyPlusV26-1-0")
sys.path.insert(0, str(ENERGYPLUS_HOME))
sys.path.insert(0, str(Path(__file__).parent.parent))


from pyenergyplus.api import EnergyPlusAPI

api = EnergyPlusAPI()
state = api.state_manager.new_state()

try:
    variables = api.exchange.get_api_data(state)
    for item in variables:
        if "Humidity" in item.name or "humidity" in item.name:
            print(item)
finally:
    api.state_manager.delete_state(state)