import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from simulator.discovery import BuildingDiscovery

building = BuildingDiscovery()

# ==========================
# ZONES
# ==========================
print("=" * 60)
print("ZONES")
print("=" * 60)

zones = building.get_zones()

print(f"Found {len(zones)} Zones\n")

for zone in zones:
    print(zone)

# ==========================
# PEOPLE
# ==========================
print("\n")
print("=" * 60)
print("PEOPLE")
print("=" * 60)

people = building.get_people()

print(f"Found {len(people)} People Objects\n")

for person in people:
    print(person)

# ==========================
# HVAC
# ==========================
print("\n")
print("=" * 60)
print("HVAC")
print("=" * 60)

hvac = building.get_hvac()

for obj, equipment in hvac.items():

    print(f"\n{obj}")

    if equipment:
        for item in equipment:
            print(f"   - {item}")
    else:
        print("   None")

# ==========================
# THERMOSTATS
# ==========================
print("\n")
print("=" * 60)
print("THERMOSTATS")
print("=" * 60)

thermostats = building.get_thermostats()

for obj, items in thermostats.items():

    print(f"\n{obj}")

    if items:
        for item in items:
            print(f"   - {item}")
    else:
        print("   None")
# ==========================
# LIGHTS
# ==========================
print("\n")
print("=" * 60)
print("LIGHTS")
print("=" * 60)

lights = building.get_lights()

print(f"Found {len(lights)} Lights\n")

if lights:
    for light in lights:
        print(light)
else:
    print("No Lights Found.")
# ==========================
# SCHEDULES
# ==========================
print("\n")
print("=" * 60)
print("SCHEDULES")
print("=" * 60)

for schedule in building.get_schedules():
    print(schedule)