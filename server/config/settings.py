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
    if isinstance(name, Path):
        if name.exists():
            return name
        name = name.name

    if not name or name == "5ZoneAirCooled.idf":
        return IDF_DIR / "5ZoneAirCooled.idf"

    name_str = str(name)
    if "OfficeMedium" in name_str or "ASHRAE" in name_str:
        target = IDF_DIR / "ASHRAE901_OfficeMedium_STD2019_Denver.idf"
        if target.exists():
            return target

    target = IDF_DIR / name_str
    if target.exists():
        return target

    return IDF_DIR / "5ZoneAirCooled.idf"


def resolve_weather_file(name=None) -> Path:
    if isinstance(name, Path):
        if name.exists():
            return name
        name = name.name

    if not name or "Chicago" in str(name):
        return WEATHER_DIR / "USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw"

    name_str = str(name)
    if any(loc in name_str for loc in ["San_Francisco", "San.Francisco", "San Francisco"]):
        target = WEATHER_DIR / "USA_CA_San.Francisco.Intl.AP.724940_TMY3.epw"
        if target.exists():
            return target

    target = WEATHER_DIR / name_str
    if target.exists():
        return target

    return WEATHER_DIR / "USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw"

# ==========================================================
# EnergyPlus Installation (Cross-Platform Windows & Linux)
# ==========================================================
import platform

if platform.system() == "Windows":
    ENERGYPLUS_HOME = Path(r"C:\EnergyPlusV26-1-0")
    ENERGYPLUS_EXE = ENERGYPLUS_HOME / "energyplus.exe"
else:
    # Linux / Cloud Host (e.g. Render / Ubuntu)
    found_tmp = list(Path("/tmp").glob("EnergyPlus*")) if Path("/tmp").exists() else []
    linux_paths = found_tmp + [
        BASE_DIR / "energyplus_bin",
        Path("/usr/local/EnergyPlus-26-1-0"),
        Path("/opt/energyplus"),
    ]
    ENERGYPLUS_HOME = next((p for p in linux_paths if p.exists()), BASE_DIR / "energyplus_bin")
    ENERGYPLUS_EXE = ENERGYPLUS_HOME / "energyplus"


# Add pyenergyplus to Python path
if str(ENERGYPLUS_HOME) not in sys.path and ENERGYPLUS_HOME.exists():
    sys.path.insert(0, str(ENERGYPLUS_HOME))

# EnergyPlus dictionary (required by eppy)
IDD_FILE = ENERGYPLUS_HOME / "Energy+.idd"