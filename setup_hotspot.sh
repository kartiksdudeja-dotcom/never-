#!/bin/bash
# =============================================================================
# EMS-HANGER Hotspot Setup with Auto-Redirect Captive Portal
# =============================================================================
# This script sets up:
# 1. WiFi Hotspot on Raspberry Pi
# 2. DNS hijacking (all domains resolve to Pi)
# 3. Captive portal auto-redirect
#
# Run with: sudo bash setup_hotspot.sh
# =============================================================================

set -e

# Configuration
SSID="EMS-HANGER-PI"
PASSWORD="EMS12345"
GATEWAY_IP="10.42.0.1"
INTERFACE="wlan0"

echo "==========================================="
echo "  EMS-HANGER Hotspot Setup"
echo "==========================================="

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo "Error: Please run as root (sudo)"
    exit 1
fi

# Step 1: Setup Hotspot
echo ""
echo "[1/4] Setting up WiFi Hotspot..."

# Stop any existing hotspot
nmcli connection down Hotspot 2>/dev/null || true
nmcli connection delete Hotspot 2>/dev/null || true

# Create new hotspot
nmcli connection add type wifi ifname $INTERFACE con-name Hotspot autoconnect no ssid "$SSID"
nmcli connection modify Hotspot 802-11-wireless.mode ap
nmcli connection modify Hotspot 802-11-wireless.band bg
nmcli connection modify Hotspot ipv4.method shared
nmcli connection modify Hotspot ipv4.addresses $GATEWAY_IP/24
nmcli connection modify Hotspot wifi-sec.key-mgmt wpa-psk
nmcli connection modify Hotspot wifi-sec.psk "$PASSWORD"

echo "  ✓ Hotspot configured: $SSID"

# Step 2: Setup DNS hijacking
echo ""
echo "[2/4] Setting up DNS hijacking for captive portal..."

# Create dnsmasq config
cat > /etc/dnsmasq.d/captive-portal.conf << EOF
# EMS-HANGER Captive Portal DNS
interface=$INTERFACE
bind-interfaces
no-resolv
address=/#/$GATEWAY_IP
EOF

# Disable systemd-resolved if it's conflicting
if systemctl is-active --quiet systemd-resolved; then
    echo "  Stopping systemd-resolved to avoid conflicts..."
    systemctl stop systemd-resolved
    systemctl disable systemd-resolved
fi

# Start dnsmasq
systemctl enable dnsmasq
systemctl restart dnsmasq

echo "  ✓ DNS hijacking configured"

# Step 3: Enable IP forwarding
echo ""
echo "[3/4] Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "  ✓ IP forwarding enabled"

# Step 4: Start Hotspot
echo ""
echo "[4/4] Starting Hotspot..."
nmcli connection up Hotspot
echo "  ✓ Hotspot started"

echo ""
echo "==========================================="
echo "  Setup Complete!"
echo "==========================================="
echo ""
echo "Hotspot Details:"
echo "  SSID:     $SSID"
echo "  Password: $PASSWORD"
echo "  Gateway:  $GATEWAY_IP"
echo ""
echo "Next steps:"
echo "  1. Start the services:"
echo "     sudo bash start_services.sh"
echo ""
echo "  2. Connect your phone to '$SSID' WiFi"
echo "     The captive portal should auto-open!"
echo ""
