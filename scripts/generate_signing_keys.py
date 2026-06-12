#!/usr/bin/env python3
"""
Generiši RSA keypair za RS256 potpisivanje license tokena.

- private_key.pem ostaje SAMO na license serveru (JWT_PRIVATE_KEY_FILE u .env)
- public_key.pem se ugrađuje u Panconnect binary pri buildu
  (scripts/build_windows.ps1 -PublicKeyFile public_key.pem)

Usage:
    python scripts/generate_signing_keys.py [output_dir]
"""

import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("keys")
    out_dir.mkdir(parents=True, exist_ok=True)

    private_path = out_dir / "private_key.pem"
    public_path = out_dir / "public_key.pem"

    if private_path.exists():
        print(f"❌ {private_path} već postoji — obriši ga ručno ako želiš novi keypair.")
        print("   PAŽNJA: novi keypair invalidira sve postojeće klijentske buildove!")
        sys.exit(1)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    private_path.write_bytes(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ))
    private_path.chmod(0o600)

    public_path.write_bytes(key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ))

    print(f"✅ Privatni ključ: {private_path} (čuvaj samo na license serveru!)")
    print(f"✅ Javni ključ:    {public_path} (ide u Panconnect build)")
    print()
    print("Dodaj u license-server .env:")
    print(f"  JWT_PRIVATE_KEY_FILE={private_path}")
    print(f"  JWT_PUBLIC_KEY_FILE={public_path}")


if __name__ == "__main__":
    main()
