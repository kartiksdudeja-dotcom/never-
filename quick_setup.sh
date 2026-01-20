#!/bin/bash
# =============================================================================
# EMS-HANGER Quick Setup Script for Raspberry Pi 5
# =============================================================================
# This script sets up the WiFi hotspot and captive portal on your Raspberry Pi 5
# 
# Prerequisites:
# - Raspberry Pi 5 with Raspberry Pi OS (64-bit)
# - NetworkManager installed
# - Python 3 and Node.js installed
#
# Usage: sudo bash quick_setup.sh
# =============================================================================

set -e

# Configuration
SSID="EMS-HANGER-PI"
PASSWORD="EMS12345"
GATEWAY_IP="10.42.0.1"
INTERFACE="wlan0"
BACKEND_PORT=5000
FRONTEND_PORT=5173

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  EMS-HANGER Quick Setup for Raspberry Pi${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (sudo)${NC}"
    exit 1
fi

# Check if NetworkManager is installed
if ! command -v nmcli &> /dev/null; then
    echo -e "${YELLOW}Installing NetworkManager...${NC}"
    apt-get update
    apt-get install -y network-manager
fi

echo ""
echo -e "${YELLOW}Step 1: Creating WiFi Hotspot...${NC}"

# Delete existing hotspot if exists
nmcli connection delete Hotspot 2>/dev/null || true

# Create new hotspot
nmcli device wifi hotspot ifname $INTERFACE ssid "$SSID" password "$PASSWORD"

# Make it persistent and configure IP
nmcli connection modify Hotspot autoconnect yes
nmcli connection modify Hotspot ipv4.addresses $GATEWAY_IP/24

echo -e "${GREEN}✓ Hotspot created: $SSID${NC}"

echo ""
echo -e "${YELLOW}Step 2: Installing Python dependencies...${NC}"
cd "$(dirname "$0")/BACKEND"
pip3 install -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 3: Installing Node.js dependencies...${NC}"
cd "$(dirname "$0")/FRONTEND"
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Setting up IP forwarding...${NC}"
echo 1 > /proc/sys/net/ipv4/ip_forward
if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
fi
echo -e "${GREEN}✓ IP forwarding enabled${NC}"

echo ""
echo -e "${YELLOW}Step 5: Setting up iptables rules for captive portal...${NC}"
# Redirect HTTP port 80 to backend
iptables -t nat -A PREROUTING -i $INTERFACE -p tcp --dport 80 -j DNAT --to-destination $GATEWAY_IP:$BACKEND_PORT 2>/dev/null || true
echo -e "${GREEN}✓ Iptables rules applied${NC}"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Hotspot Details:"
echo "  SSID:     $SSID"
echo "  Password: $PASSWORD"
echo "  Gateway:  $GATEWAY_IP"
echo ""
echo "To start the services, run:"
echo ""
echo "  # Start Backend (Terminal 1):"
echo "  cd $(dirname "$0")/BACKEND && python3 app.py"
echo ""
echo "  # Start Frontend (Terminal 2):"
echo "  cd $(dirname "$0")/FRONTEND && npm run dev"
echo ""
echo "Access URLs (after connecting to hotspot):"
echo "  App:     http://$GATEWAY_IP:$FRONTEND_PORT/"
echo "  API:     http://$GATEWAY_IP:$BACKEND_PORT/api"
echo "  Portal:  http://$GATEWAY_IP:$FRONTEND_PORT/captive-portal"
echo "  QR Code: http://$GATEWAY_IP:$FRONTEND_PORT/hotspot"
echo ""
echo -e "${YELLOW}Note: QR Code scanning will auto-connect to WiFi and redirect to the app!${NC}"
