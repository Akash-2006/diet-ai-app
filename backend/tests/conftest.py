"""Environment for tests."""

from __future__ import annotations

import os

os.environ.setdefault("ENCRYPTION_SECRET", "test-shared-secret-for-pytest-only!!")
os.environ.setdefault("APP_PASSWORD", "test-app-password")
