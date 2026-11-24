"""Compatibility launcher for the shared handbook server."""
from pathlib import Path
from runpy import run_path
import sys

if __name__ == '__main__':
    frontend = Path(__file__).resolve().parents[1] / 'frontend'
    sys.path.insert(0, str(frontend))
    run_path(str(frontend / 'server.py'), run_name='__main__')
