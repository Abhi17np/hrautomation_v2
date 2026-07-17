"""
Run this on a PC/laptop connected to the SAME network (Wi-Fi/LAN) as the
eSSL attendance device. It will:
  1) Try to find the device's IP by scanning the local subnet on the
     ports eSSL/ZKTeco devices commonly use (4370 is the default).
  2) Once found (or if you already know the IP), connect with pyzk and
     print a sample of attendance logs to confirm it's working.

Install first:
    pip install pyzk

Usage:
    python find_essl_device.py                # auto-scan local subnet
    python find_essl_device.py 192.168.1.201  # test a known IP directly
"""

import socket
import sys
from zk import ZK

DEVICE_PORT = 4370  # default port for eSSL/ZKTeco devices


def get_local_subnet_prefix():
    """Get this machine's local IP to guess the subnet, e.g. 192.168.1."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    finally:
        s.close()
    return ".".join(local_ip.split(".")[:3])


def scan_for_device(prefix):
    print(f"Scanning {prefix}.1 - {prefix}.254 on port {DEVICE_PORT} ...")
    found = []
    for i in range(1, 255):
        ip = f"{prefix}.{i}"
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.2)
        try:
            if sock.connect_ex((ip, DEVICE_PORT)) == 0:
                print(f"  -> Found something listening on {ip}:{DEVICE_PORT}")
                found.append(ip)
        except Exception:
            pass
        finally:
            sock.close()
    return found


def test_connection(ip):
    print(f"\nTrying to connect to eSSL/ZKTeco device at {ip} ...")
    zk = ZK(ip, port=DEVICE_PORT, timeout=5)
    conn = None
    try:
        conn = zk.connect()
        print("Connected successfully!")
        print("Device info:")
        print("  Firmware version:", conn.get_firmware_version())
        print("  Serial number:", conn.get_serialnumber())

        print("\nFetching last few attendance records (sample)...")
        attendance = conn.get_attendance()
        for record in attendance[-5:]:
            print(f"  user_id={record.user_id}  time={record.timestamp}  "
                  f"status={record.status}  punch={record.punch}")
        print(f"\nTotal records on device: {len(attendance)}")
    except Exception as e:
        print(f"Failed to connect/read: {e}")
    finally:
        if conn:
            conn.disconnect()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_connection(sys.argv[1])
    else:
        prefix = get_local_subnet_prefix()
        candidates = scan_for_device(prefix)
        if not candidates:
            print("\nNo device found automatically. Common reasons:")
            print("- The device is on a different subnet/VLAN than this PC")
            print("- The device's network settings need to be enabled "
                  "(check device menu: Comm > Ethernet/Wi-Fi)")
            print("- Try checking the device's screen directly: most eSSL "
                  "devices show their IP under Menu > Comm > Ethernet")
        else:
            for ip in candidates:
                test_connection(ip)