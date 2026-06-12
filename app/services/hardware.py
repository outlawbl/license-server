"""
Hardware ID utilities.

Ovo je klijentska strana - bit će korišteno u Panconnect-u.
Doduše, server treba znati format za validaciju.
"""

import hashlib
import socket
import subprocess
import platform
import re
import uuid


def get_hardware_id() -> str:
    """
    Generiši jedinstveni hardware ID za mašinu.

    Koristi: CPU info + MAC adresa + (optionally) disk serial

    Returns: SHA256 hash (64 hex chars)
    """
    components = []

    # 1. CPU info
    try:
        if platform.system() == "Linux":
            result = subprocess.run(
                ["cat", "/proc/cpuinfo"],
                capture_output=True,
                text=True,
                timeout=5
            )
            cpu_info = result.stdout
            # Extract unique CPU identifier
            for line in cpu_info.split("\n"):
                if "model name" in line or "processor_id" in line:
                    components.append(line.strip())
                    break
        else:
            # macOS / Windows
            cpu_info = platform.processor() or "unknown"
            components.append(cpu_info)
    except Exception:
        components.append("cpu-unknown")

    # 2. MAC adresa (prva ne-loopback)
    try:
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff)
                        for i in range(0, 48, 8)][::-1])
        components.append(mac)
    except Exception:
        pass

    # 3. Hostname
    try:
        hostname = socket.gethostname()
        components.append(hostname)
    except Exception:
        pass

    # 4. Machine ID (Linux specific)
    try:
        if platform.system() == "Linux":
            with open("/etc/machine-id", "r") as f:
                components.append(f.read().strip())
    except Exception:
        pass

    # Combine i hash
    combined = "|".join(components)
    return hashlib.sha256(combined.encode()).hexdigest()


# Server-side helper za validaciju hardware ID formata
def is_valid_hardware_id(hardware_id: str) -> bool:
    """
    Provjeri da li je hardware_id validan SHA256 hash.
    """
    return bool(
        hardware_id and
        len(hardware_id) == 64 and
        re.match(r'^[a-f0-9]{64}$', hardware_id.lower())
    )


# Helper za normalizaciju (sve lowercase)
def normalize_hardware_id(hardware_id: str) -> str:
    return hardware_id.lower().strip()
