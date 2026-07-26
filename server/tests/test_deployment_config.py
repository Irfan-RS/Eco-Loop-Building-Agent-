import sys
import json
from pathlib import Path

# Add server and root directories to sys.path
SERVER_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = SERVER_DIR.parent
sys.path.insert(0, str(SERVER_DIR))

import pytest


def test_dockerfile_exists():
    dockerfile = ROOT_DIR / "Dockerfile"
    assert dockerfile.exists()
    content = dockerfile.read_text(encoding="utf-8")
    assert "FROM python" in content
    assert "server/api_server.py" in content


def test_render_yaml_exists():
    render_yaml = ROOT_DIR / "render.yaml"
    assert render_yaml.exists()
    content = render_yaml.read_text(encoding="utf-8")
    assert "ecoloop-building-agent" in content
    assert "buildCommand" in content
    assert "startCommand" in content


def test_vercel_json_exists():
    vercel_json = ROOT_DIR / "vercel.json"
    assert vercel_json.exists()
    content = vercel_json.read_text(encoding="utf-8")
    data = json.loads(content)
    assert data.get("version") == 2 or "buildCommand" in data
    assert "outputDirectory" in data


def test_requirements_txt_exists():
    req = SERVER_DIR / "requirements.txt"
    assert req.exists()
    content = req.read_text(encoding="utf-8")
    assert "fastapi" in content or "pandas" in content or "eppy" in content
