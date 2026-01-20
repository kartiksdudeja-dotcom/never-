#!/usr/bin/env python3
"""
Raspberry Pi Hotspot QR Code Generator
Generates and displays WiFi QR code in terminal and saves PNG
"""

import qrcode
import argparse
from pathlib import Path


def generate_wifi_qr(ssid: str, password: str, security: str = "WPA"):
    """
    Generate WiFi QR code
    
    Args:
        ssid: WiFi network name
        password: WiFi password
        security: Security type (WPA, WEP, nopass)
    
    Returns:
        QRCode object
    """
    # Escape special characters
    escaped_ssid = ssid.replace('\\', '\\\\').replace(';', '\\;').replace(':', '\\:').replace('"', '\\"')
    escaped_password = password.replace('\\', '\\\\').replace(';', '\\;').replace(':', '\\:').replace('"', '\\"')
    
    # WiFi QR code format: WIFI:T:WPA;S:SSID;P:PASSWORD;;
    qr_string = f"WIFI:T:{security};S:{escaped_ssid};P:{escaped_password};;"
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_string)
    qr.make(fit=True)
    
    return qr, qr_string


def save_qr_code(qr: qrcode.QRCode, filename: str = "hotspot-qr.png"):
    """Save QR code as PNG"""
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filename)
    print(f"✓ QR code saved to: {filename}")
    return filename


def print_ascii_qr(qr_string: str):
    """Print ASCII representation of QR code in terminal"""
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H)
    qr.add_data(qr_string)
    qr.make(fit=True)
    
    # Print ASCII art
    print("\n" + "="*50)
    print("HOTSPOT QR CODE (ASCII)")
    print("="*50)
    qr.print_ascii(invert=True)
    print("="*50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Raspberry Pi Hotspot WiFi QR code"
    )
    parser.add_argument(
        '--ssid',
        default='EMS-HANGER-PI',
        help='WiFi SSID (default: EMS-HANGER-PI)'
    )
    parser.add_argument(
        '--password',
        default='EMS12345',
        help='WiFi password (default: EMS12345)'
    )
    parser.add_argument(
        '--security',
        choices=['WPA', 'WEP', 'nopass'],
        default='WPA',
        help='Security type (default: WPA)'
    )
    parser.add_argument(
        '--output',
        default='hotspot-qr.png',
        help='Output PNG filename (default: hotspot-qr.png)'
    )
    parser.add_argument(
        '--no-save',
        action='store_true',
        help='Don\'t save PNG file, only show QR string'
    )
    parser.add_argument(
        '--ascii-only',
        action='store_true',
        help='Only show ASCII QR code, don\'t save PNG'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("RASPBERRY PI HOTSPOT QR CODE GENERATOR")
    print("="*60)
    print(f"SSID:        {args.ssid}")
    print(f"Password:    {args.password}")
    print(f"Security:    {args.security}")
    print("="*60 + "\n")
    
    # Generate QR code
    qr, qr_string = generate_wifi_qr(args.ssid, args.password, args.security)
    
    print(f"QR String: {qr_string}\n")
    
    # Print ASCII QR
    print_ascii_qr(qr_string)
    
    # Save PNG unless --ascii-only is set
    if not args.ascii_only and not args.no_save:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        save_qr_code(qr, str(output_path))
        print(f"📱 QR Code file: {output_path.absolute()}")
    
    # Usage instructions
    print("\n" + "="*60)
    print("USAGE INSTRUCTIONS:")
    print("="*60)
    print("1. iPhone/iOS:")
    print("   - Open Camera app")
    print("   - Point at QR code")
    print("   - Tap 'Join WiFi Network' notification")
    print("")
    print("2. Android:")
    print("   - Open Google Lens or QR Scanner app")
    print("   - Scan this QR code")
    print("   - Tap 'Connect to WiFi'")
    print("")
    print("3. Desktop/Laptop:")
    print("   - Visit: http://10.42.0.1:5173/hotspot")
    print("   - Download QR code from web interface")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
