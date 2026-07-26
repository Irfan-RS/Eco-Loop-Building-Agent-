from pathlib import Path
import sys

# ==========================================================
# Project Root
# ==========================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ==========================================================
# Project Directories
# ==========================================================
ENERGYPLUS_DIR = BASE_DIR / "energyplus"

IDF_DIR = ENERGYPLUS_DIR / "idf"
MODIFIED_IDF_DIR = ENERGYPLUS_DIR / "modified_idf"
WEATHER_DIR = ENERGYPLUS_DIR / "weather"
OUTPUT_DIR = ENERGYPLUS_DIR / "output"

IDF_DIR.mkdir(parents=True, exist_ok=True)
MODIFIED_IDF_DIR.mkdir(parents=True, exist_ok=True)
WEATHER_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================
# Input Files (5ZoneAirCooled.idf + Chicago TMY3 EPW Weather)
# 7-Day Summer Hot Spell (July 7-14) at 15-min Timesteps
# ==========================================================
IDF_FILE = IDF_DIR / "5ZoneAirCooled.idf"
WEATHER_FILE = WEATHER_DIR / "USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw"



def resolve_idf_file(name=None) -> Path:
    if isinstance(name, Path) and name.exists():
        return name
    target = IDF_DIR / "5ZoneAirCooled.idf"
    if target.exists():
        return target
    return IDF_FILE


def resolve_weather_file(name=None) -> Path:
    if isinstance(name, Path) and name.exists():
        return name
    target = WEATHER_DIR / "USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw"
    if target.exists():
        return target
    return WEATHER_FILE

# ==========================================================
# EnergyPlus Installation (Cross-Platform Windows & Linux)
# ==========================================================
import platform

if platform.system() == "Windows":
    ENERGYPLUS_HOME = Path(r"C:\EnergyPlusV26-1-0")
    ENERGYPLUS_EXE = ENERGYPLUS_HOME / "energyplus.exe"
else:
    # Linux / Cloud Host (e.g. Render / Ubuntu)
    linux_paths = [
        Path("/tmp/EnergyPlus"),
        BASE_DIR / "energyplus_bin",
        Path("/usr/local/EnergyPlus-26-1-0"),
        Path("/opt/energyplus"),
    ]
    found_tmp = [p for p in Path("/tmp").glob("EnergyPlus*") if p.is_dir()] if Path("/tmp").exists() else []
    linux_paths = linux_paths + found_tmp
    ENERGYPLUS_HOME = next((p for p in linux_paths if p.exists()), Path("/tmp/EnergyPlus"))
    ENERGYPLUS_EXE = ENERGYPLUS_HOME / "energyplus"



# Add pyenergyplus to Python path
if str(ENERGYPLUS_HOME) not in sys.path and ENERGYPLUS_HOME.exists():
    sys.path.insert(0, str(ENERGYPLUS_HOME))

# EnergyPlus dictionary (required by eppy)
IDD_FILE = ENERGYPLUS_HOME / "Energy+.idd"