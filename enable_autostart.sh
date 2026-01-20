#!/bin/bash
# =============================================================================
# EMS-HANGER Auto-Start Service Enablement Script
# =============================================================================
# Run with: sudo bash enable_autostart.sh
# =============================================================================

set -e

echo "==========================================="
echo "  EMS-HANGER Auto-Start Service Setup"
echo "==========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo bash enable_autostart.sh"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "📋 Step 1: Copy service files to systemd directory..."
echo ""

# Copy hotspot service
cp "$SCRIPT_DIR/ems-hanger-hotspot.service" /etc/systemd/system/
echo "✓ Hotspot service installed"

# Copy backend service
cp "$SCRIPT_DIR/BACKEND/ems-hanger.service" /etc/systemd/system/
echo "✓ Backend service installed"

# Copy frontend service
cp "$SCRIPT_DIR/FRONTEND/ems-hanger-frontend.service" /etc/systemd/system/
echo "✓ Frontend service installed"

echo ""
echo "📋 Step 2: Reload systemd daemon..."
systemctl daemon-reload
echo "✓ Systemd reloaded"

echo ""
echo "📋 Step 3: Enable services for auto-start..."
echo ""

# Enable hotspot service
systemctl enable ems-hanger-hotspot.service
echo "✓ ems-hanger-hotspot enabled (will start on boot)"

# Enable backend service
systemctl enable ems-hanger.service
echo "✓ ems-hanger backend enabled (will start on boot)"

# Enable backend service
systemctl enable ems-hanger-frontend.service
echo "✓ ems-hanger-frontend enabled (will start on boot)"

echo ""
echo "==========================================="
echo "  ✅ Auto-Start Setup Complete!"
echo "==========================================="
echo ""
echo "📊 Service Status:"
systemctl status ems-hanger-hotspot.service --no-pager
echo ""
systemctl status ems-hanger.service --no-pager
echo ""
systemctl status ems-hanger-frontend.service --no-pager
echo ""
echo "🔧 Management Commands:"
echo "  View logs:       sudo journalctl -u ems-hanger-hotspot -f"
echo "                   sudo journalctl -u ems-hanger -f"
echo "                   sudo journalctl -u ems-hanger-frontend -f"
echo ""
echo "  Start services:  sudo systemctl start ems-hanger-hotspot"
echo "                   sudo systemctl start ems-hanger"
echo "                   sudo systemctl start ems-hanger-frontend"
echo ""
echo "  Stop services:   sudo systemctl stop ems-hanger-hotspot"
echo "                   sudo systemctl stop ems-hanger"
echo "                   sudo systemctl stop ems-hanger-frontend"
echo ""
echo "  Restart services: sudo systemctl restart ems-hanger-h
echo "==========================================="
