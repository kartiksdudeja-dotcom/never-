"""
Captive Portal Configuration for Raspberry Pi 5 Hotspot

This module provides utilities for setting up and managing a captive portal
on a Raspberry Pi 5 running as a WiFi hotspot for the EMS-HANGER system.

The captive portal intercepts all HTTP requests when a device first connects
to the hotspot and redirects them to the EMS-HANGER application.

Requirements:
- Raspberry Pi 5 with NetworkManager
- dnsmasq for DNS hijacking
- iptables for traffic redirection
"""

import subprocess
import os
import socket

# Hotspot Configuration
HOTSPOT_CONFIG = {
    'ssid': 'EMS-HANGER-PI',
    'password': 'EMS12345',
    'gateway_ip': '10.42.0.1',
    'subnet': '10.42.0.0/24',
    'interface': 'wlan0',
    'backend_port': 5000,
    'frontend_port': 5173,
}

def get_local_ip():
    """Get the local IP address of the Raspberry Pi."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return HOTSPOT_CONFIG['gateway_ip']


def generate_dnsmasq_config():
    """
    Generate dnsmasq configuration for captive portal DNS hijacking.
    
    This configuration makes all DNS queries resolve to the Raspberry Pi's IP,
    forcing all HTTP traffic through the captive portal.
    """
    gateway_ip = HOTSPOT_CONFIG['gateway_ip']
    
    config = f"""# EMS-HANGER Captive Portal DNS Configuration
# Place this in /etc/dnsmasq.d/captive-portal.conf

# Interface to listen on
interface={HOTSPOT_CONFIG['interface']}

# Don't use /etc/resolv.conf
no-resolv

# Don't poll for changes
no-poll

# Log DNS queries (for debugging)
log-queries

# Redirect all DNS queries to the gateway
address=/#/{gateway_ip}

# But allow these domains to resolve normally (for captive portal detection)
# These are needed for devices to detect internet connectivity
server=/connectivitycheck.gstatic.com/8.8.8.8
server=/www.google.com/8.8.8.8
server=/clients3.google.com/8.8.8.8
server=/play.googleapis.com/8.8.8.8

# DHCP range for connected devices
dhcp-range=10.42.0.10,10.42.0.250,12h

# Set default gateway
dhcp-option=3,{gateway_ip}

# Set DNS server
dhcp-option=6,{gateway_ip}

# Captive portal option (RFC 8910)
dhcp-option=114,http://{gateway_ip}:{HOTSPOT_CONFIG['frontend_port']}/captive-portal
"""
    return config


def generate_iptables_rules():
    """
    Generate iptables rules for captive portal traffic redirection.
    
    These rules redirect all HTTP (80) and HTTPS (443) traffic to the
    Flask backend, which then redirects to the captive portal page.
    """
    gateway_ip = HOTSPOT_CONFIG['gateway_ip']
    backend_port = HOTSPOT_CONFIG['backend_port']
    
    rules = f"""#!/bin/bash
# EMS-HANGER Captive Portal iptables Rules
# Run with sudo: sudo bash iptables-captive.sh

# Clear existing rules
iptables -t nat -F
iptables -t mangle -F

# Allow established connections
iptables -t nat -A PREROUTING -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow traffic to the gateway itself
iptables -t nat -A PREROUTING -d {gateway_ip} -j ACCEPT

# Redirect HTTP (port 80) to Flask backend
iptables -t nat -A PREROUTING -i {HOTSPOT_CONFIG['interface']} -p tcp --dport 80 -j DNAT --to-destination {gateway_ip}:{backend_port}

# Redirect HTTPS (port 443) - Note: This will cause certificate errors
# Users should connect via HTTP or through the captive portal
iptables -t nat -A PREROUTING -i {HOTSPOT_CONFIG['interface']} -p tcp --dport 443 -j DNAT --to-destination {gateway_ip}:{backend_port}

# Enable masquerading for NAT
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -i {HOTSPOT_CONFIG['interface']} -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o {HOTSPOT_CONFIG['interface']} -m state --state ESTABLISHED,RELATED -j ACCEPT

echo "Captive portal iptables rules applied!"
"""
    return rules


def generate_hostapd_config():
    """
    Generate hostapd configuration for WiFi access point.
    (Alternative to NetworkManager method)
    """
    config = f"""# EMS-HANGER Hotspot Configuration
# Place this in /etc/hostapd/hostapd.conf

interface={HOTSPOT_CONFIG['interface']}
driver=nl80211
ssid={HOTSPOT_CONFIG['ssid']}
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase={HOTSPOT_CONFIG['password']}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
"""
    return config


def generate_setup_script():
    """
    Generate a complete setup script for the Raspberry Pi captive portal.
    """
    gateway_ip = HOTSPOT_CONFIG['gateway_ip']
    backend_port = HOTSPOT_CONFIG['backend_port']
    frontend_port = HOTSPOT_CONFIG['frontend_port']
    
    script = f"""#!/bin/bash
# EMS-HANGER Raspberry Pi Hotspot & Captive Portal Setup Script
# Run with: sudo bash setup_captive_portal.sh

set -e

echo "========================================="
echo "EMS-HANGER Captive Portal Setup"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (sudo)"
    exit 1
fi

echo ""
echo "Step 1: Installing required packages..."
apt-get update
apt-get install -y dnsmasq hostapd iptables-persistent

echo ""
echo "Step 2: Stopping services for configuration..."
systemctl stop dnsmasq || true
systemctl stop hostapd || true

echo ""
echo "Step 3: Creating WiFi hotspot with NetworkManager..."
# Delete existing hotspot connection if exists
nmcli connection delete Hotspot 2>/dev/null || true

# Create new hotspot
nmcli connection add type wifi ifname {HOTSPOT_CONFIG['interface']} con-name Hotspot autoconnect yes ssid "{HOTSPOT_CONFIG['ssid']}"
nmcli connection modify Hotspot 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
nmcli connection modify Hotspot wifi-sec.key-mgmt wpa-psk
nmcli connection modify Hotspot wifi-sec.psk "{HOTSPOT_CONFIG['password']}"
nmcli connection modify Hotspot ipv4.addresses {gateway_ip}/24

echo ""
echo "Step 4: Configuring dnsmasq for captive portal..."
cat > /etc/dnsmasq.d/captive-portal.conf << 'DNSMASQ_EOF'
# EMS-HANGER Captive Portal DNS Configuration
interface={HOTSPOT_CONFIG['interface']}
no-resolv
no-poll
address=/#/{gateway_ip}
dhcp-range=10.42.0.10,10.42.0.250,12h
dhcp-option=3,{gateway_ip}
dhcp-option=6,{gateway_ip}
dhcp-option=114,http://{gateway_ip}:{frontend_port}/captive-portal
DNSMASQ_EOF

echo ""
echo "Step 5: Configuring iptables for HTTP redirect..."
# Redirect HTTP to backend
iptables -t nat -A PREROUTING -i {HOTSPOT_CONFIG['interface']} -p tcp --dport 80 -j DNAT --to-destination {gateway_ip}:{backend_port}

# Save iptables rules
iptables-save > /etc/iptables/rules.v4

echo ""
echo "Step 6: Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

echo ""
echo "Step 7: Starting services..."
systemctl enable dnsmasq
systemctl start dnsmasq
nmcli connection up Hotspot

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Hotspot Details:"
echo "  SSID: {HOTSPOT_CONFIG['ssid']}"
echo "  Password: {HOTSPOT_CONFIG['password']}"
echo "  Gateway IP: {gateway_ip}"
echo ""
echo "Access Points:"
echo "  Backend API: http://{gateway_ip}:{backend_port}/api"
echo "  Frontend App: http://{gateway_ip}:{frontend_port}/"
echo "  Captive Portal: http://{gateway_ip}:{frontend_port}/captive-portal"
echo ""
echo "To start the application:"
echo "  cd /home/pi/EMS-HANGER-main/BACKEND && python app.py &"
echo "  cd /home/pi/EMS-HANGER-main/FRONTEND && npm run dev &"
echo ""
"""
    return script


def generate_systemd_service():
    """
    Generate systemd service files for auto-starting the EMS-HANGER application.
    """
    backend_service = """[Unit]
Description=EMS-HANGER Backend API Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/EMS-HANGER-main/BACKEND
ExecStart=/usr/bin/python3 app.py
Restart=always
RestartSec=5
Environment=FLASK_ENV=production

[Install]
WantedBy=multi-user.target
"""

    frontend_service = """[Unit]
Description=EMS-HANGER Frontend Server
After=network.target ems-hanger-backend.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/EMS-HANGER-main/FRONTEND
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    
    return {
        'backend': backend_service,
        'frontend': frontend_service
    }


def save_config_files(output_dir='/tmp/ems-hanger-config'):
    """
    Save all configuration files to the specified directory.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    files = {
        'dnsmasq-captive-portal.conf': generate_dnsmasq_config(),
        'iptables-captive.sh': generate_iptables_rules(),
        'hostapd.conf': generate_hostapd_config(),
        'setup_captive_portal.sh': generate_setup_script(),
        'ems-hanger-backend.service': generate_systemd_service()['backend'],
        'ems-hanger-frontend.service': generate_systemd_service()['frontend'],
    }
    
    for filename, content in files.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Created: {filepath}")
    
    print(f"\nAll configuration files saved to: {output_dir}")
    print("\nTo set up the captive portal on Raspberry Pi:")
    print(f"  sudo bash {output_dir}/setup_captive_portal.sh")
    
    return output_dir


if __name__ == '__main__':
    print("EMS-HANGER Captive Portal Configuration Generator")
    print("=" * 50)
    print(f"\nHotspot Configuration:")
    print(f"  SSID: {HOTSPOT_CONFIG['ssid']}")
    print(f"  Password: {HOTSPOT_CONFIG['password']}")
    print(f"  Gateway IP: {HOTSPOT_CONFIG['gateway_ip']}")
    print(f"  Backend Port: {HOTSPOT_CONFIG['backend_port']}")
    print(f"  Frontend Port: {HOTSPOT_CONFIG['frontend_port']}")
    print()
    
    save_config_files()
