#!/usr/bin/env python3
"""
Generiši bcrypt hash admin lozinke za .env (ADMIN_PASSWORD_HASH).

Usage:
    python scripts/generate_admin_password.py
"""

import getpass

import bcrypt

if __name__ == "__main__":
    pwd = getpass.getpass("Nova admin lozinka: ")
    confirm = getpass.getpass("Ponovi lozinku: ")
    if pwd != confirm:
        raise SystemExit("❌ Lozinke se ne poklapaju")
    if len(pwd) < 8:
        raise SystemExit("❌ Minimum 8 znakova")

    hashed = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    print("\nDodaj u .env:")
    print(f"ADMIN_PASSWORD_HASH={hashed}")
