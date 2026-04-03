from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
PROJECT_PACKAGES = PROJECT_ROOT / ".python_packages"

if PROJECT_PACKAGES.exists():
    packages_path = str(PROJECT_PACKAGES)
    if packages_path not in sys.path:
        sys.path.append(packages_path)
