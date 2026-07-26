import re
from pathlib import Path
from config.settings import IDF_FILE, resolve_idf_file


class Building:

    def __init__(self, idf_path=None):
        self.idf_file = resolve_idf_file(idf_path) if idf_path else IDF_FILE
        self.zones = []

    def discover_zones(self, idf_path=None):
        """Discover all zones from the IDF file."""
        if idf_path:
            self.idf_file = resolve_idf_file(idf_path)

        self.zones = []

        # 1. Try BuildingDiscovery (eppy) first
        try:
            from simulator.discovery import BuildingDiscovery
            discovery = BuildingDiscovery(self.idf_file)
            discovered = discovery.get_zones()
            if discovered:
                self.zones = discovered
                return self.zones
        except Exception:
            pass

        # 2. Robust text fallback parser (handles case-insensitive ZONE, inline fields, comments)
        try:
            if not Path(self.idf_file).exists():
                return self.zones

            with open(self.idf_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Remove comments (from ! to end of line)
            clean_lines = []
            for line in content.splitlines():
                comment_idx = line.find("!")
                if comment_idx != -1:
                    line = line[:comment_idx]
                clean_lines.append(line)

            clean_text = "\n".join(clean_lines)

            # Match Zone object pattern: ZONE, \n space/name or ZONE, name, ...
            pattern = re.compile(r"(?i)\bZONE\s*,\s*([^;,]+)")
            matches = pattern.findall(clean_text)
            for m in matches:
                zone_name = m.strip()
                if zone_name and zone_name not in self.zones:
                    self.zones.append(zone_name)
        except Exception:
            pass

        return self.zones