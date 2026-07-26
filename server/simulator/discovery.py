from eppy.modeleditor import IDF

from config.settings import (
    IDF_FILE,
    IDD_FILE,
    resolve_idf_file,
)


class BuildingDiscovery:
    """
    Automatically discovers information from an EnergyPlus IDF.
    """

    def __init__(self, idf_path=None):

        IDF.setiddname(str(IDD_FILE))
        path = resolve_idf_file(idf_path) if idf_path else IDF_FILE
        self.idf = IDF(str(path))

    def get_zones(self):
        """Return all thermal zones."""

        zones = []

        for zone in self.idf.idfobjects["ZONE"]:
            zones.append(zone.Name)

        return zones
    @staticmethod
    def _get_field(obj, possible_fields, default=""):
        """Safely fetch field value across different EnergyPlus IDD field attribute names."""
        for field in possible_fields:
            try:
                val = getattr(obj, field, None)
                if val is not None and str(val).strip() != "":
                    return str(val).strip()
            except Exception:
                pass
        return default

    def get_people(self):
        """
        Discover all People objects in the building.
        """

        people = []

        zone_fields = [
            "Zone_or_ZoneList_or_Space_or_SpaceList_Name",
            "Zone_or_ZoneList_Name",
            "Zone_Name",
            "Space_Name",
        ]
        sched_fields = ["Number_of_People_Schedule_Name", "Schedule_Name"]
        method_fields = ["Number_of_People_Calculation_Method"]

        try:
            for person in self.idf.idfobjects["PEOPLE"]:
                people.append({
                    "name": person.Name,
                    "zone": self._get_field(person, zone_fields),
                    "schedule": self._get_field(person, sched_fields),
                    "method": self._get_field(person, method_fields),
                })
        except Exception:
            pass

        return people

    def get_hvac(self):
        """
        Discover HVAC equipment in the building.
        """

        hvac = {}

        objects_to_check = [
            "AIRLOOPHVAC",
            "FAN:VARIABLEVOLUME",
            "FAN:CONSTANTVOLUME",
            "FAN:ONOFF",
            "COIL:COOLING:WATER",
            "COIL:COOLING:DX:SINGLESPEED",
            "COIL:COOLING:DX:TWOSTAGEWITHHUMIDITYCONTROL",
            "COIL:HEATING:WATER",
            "COIL:HEATING:ELECTRIC",
            "COIL:HEATING:GAS",
            "COIL:HEATING:DX:SINGLESPEED",
            "ZONEHVAC:EQUIPMENTLIST",
            "ZONEHVAC:IDEALLOADSAIRSYSTEM",
            "ZONEHVAC:PACKAGEDTERMINALAIRCONDITIONER",
            "AIRCONDITIONER:VARIABLEREFRIGERANTFLOW",
        ]

        for obj in objects_to_check:

            try:
                hvac[obj] = []

                if obj in self.idf.idfobjects:
                    for item in self.idf.idfobjects[obj]:
                        if hasattr(item, "Name") and item.Name:
                            hvac[obj].append(item.Name)

            except Exception:
                hvac[obj] = []

        return hvac

    def get_thermostats(self):
        """
        Discover all thermostat objects in the building.
        """

        thermostats = {}

        objects = [
            "THERMOSTATSETPOINT:DUALSETPOINT",
            "THERMOSTATSETPOINT:SINGLEHEATING",
            "THERMOSTATSETPOINT:SINGLECOOLING",
            "ZONECONTROL:THERMOSTAT",
        ]

        for obj in objects:

            thermostats[obj] = []

            try:
                if obj in self.idf.idfobjects:
                    for item in self.idf.idfobjects[obj]:
                        if hasattr(item, "Name") and item.Name:
                            thermostats[obj].append(item.Name)

            except Exception:
                pass

        return thermostats

    def get_schedules(self):
        """
        Discover all schedules.
        """

        schedules = []

        schedule_types = [
            "SCHEDULE:COMPACT",
            "SCHEDULE:CONSTANT",
            "SCHEDULE:YEAR",
            "SCHEDULE:DAY:HOURLY",
            "SCHEDULE:FILE",
            "SCHEDULE:WEEK:DAILY",
        ]

        for schedule_type in schedule_types:

            try:
                if schedule_type in self.idf.idfobjects:
                    for schedule in self.idf.idfobjects[schedule_type]:
                        if hasattr(schedule, "Name") and schedule.Name:
                            schedules.append(schedule.Name)

            except Exception:
                pass

        return schedules

    def get_lights(self):
        """
        Discover all lighting objects.
        """

        lights = []

        zone_fields = [
            "Zone_or_ZoneList_or_Space_or_SpaceList_Name",
            "Zone_or_ZoneList_Name",
            "Zone_Name",
            "Space_Name",
        ]
        sched_fields = ["Schedule_Name"]

        try:
            if "LIGHTS" in self.idf.idfobjects:
                for light in self.idf.idfobjects["LIGHTS"]:

                    lights.append({
                        "name": light.Name,
                        "zone": self._get_field(light, zone_fields),
                        "schedule": self._get_field(light, sched_fields),
                    })

        except Exception:
            pass

        return lights

    def get_output_variables(self):
        """Return all Output:Variable objects."""

        variables = []

        try:
            if "OUTPUT:VARIABLE" in self.idf.idfobjects:
                for obj in self.idf.idfobjects["OUTPUT:VARIABLE"]:

                    variables.append({
                        "key": getattr(obj, "Key_Value", "*"),
                        "variable": getattr(obj, "Variable_Name", ""),
                    })
        except Exception:
            pass

        return variables