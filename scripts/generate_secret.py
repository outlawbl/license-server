#!/usr/bin/env python3
"""
Generiši JWT secret za .env file.

Usage:
    python scripts/generate_secret.py
"""

import secrets


if __name__ == "__main__":
    print(f"JWT_SECRET_KEY={secrets.token_urlsafe(32)}")
