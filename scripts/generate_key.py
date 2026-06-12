#!/usr/bin/env python3
"""
Generiši novi license key.

Usage:
    python scripts/generate_key.py
"""

import secrets


def generate_license_key() -> str:
    """Generiši unique license key"""
    return f"PC-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"


if __name__ == "__main__":
    print(generate_license_key())
