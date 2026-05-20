#!/bin/bash

# EMS-HANGER Autostart Setup Script
# Enables automatic startup of backend, frontend, and database on power-up

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   EMS-HANGER Autostart Setup for Raspberry Pi             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root"
  echo "Usage: sudo bash enable_autostart_services.sh"
  exit 1
fi

PROJECT_PATH="/home/vw/Downloads/EMS-HANGER-main"
BACKEND_PATH="$PROJECT_PATH/BACKEND"
FRONTEND_PATH="$PROJECT_PATH/FRONTEND"

echo "✓ Project Path: $PROJECT_PATH"
echo ""

# Step 1: Enable MySQL autostart
echo "Step 1: Configuring MySQL/MariaDB autostart..."
if command -v mysql &> /dev/null; then
  systemctl enable mysql 2>/dev/null || systemctl enable mariadb 2>/dev/null || echo "⚠ MySQL not found"
  systemctl start mysql 2>/dev/null || systemctl start mariadb 2>/dev/null || echo "⚠ Could not start MySQL"
  echo "✓ MySQL autostart enabled"
else
  echo "⚠ MySQL not installed, skipping..."
fi
echo ""

# Step 2: Copy and enable backend service
echo "Step 2: Setting up backend service..."
if [ -f "$BACKEND_PATH/ems-hanger.service" ]; then
  cp "$BACKEND_PATH/ems-hanger.service" /etc/systemd/system/
  chmod 644 /etc/systemd/system/ems-hanger.service
  systemctl daemon-reload
  systemctl enable ems-hanger.service
  echo "✓ Backend service installed and enabled"
else
  echo "❌ Backend service file not found at $BACKEND_PATH/ems-hanger.service"
fi
echo ""

# Step 3: Copy and enable frontend service  
echo "Step 3: Setting up frontend service..."
if [ -f "$FRONTEND_PATH/ems-hanger-frontend.service" ]; then
  cp "$FRONTEND_PATH/ems-hanger-frontend.service" /etc/systemd/system/
  chmod 644 /etc/systemd/system/ems-hanger-frontend.service
  systemctl daemon-reload
  systemctl enable ems-hanger-frontend.service
  echo "✓ Frontend service installed and enabled"
else
  echo "❌ Frontend service file not found at $FRONTEND_PATH/ems-hanger-frontend.service"
fi
echo ""

# Step 4: Enable hotspot service (if exists)
if [ -f "$PROJECT_PATH/ems-hanger-hotspot.service" ]; then
  echo "Step 4: Setting up hotspot service..."
  cp "$PROJECT_PATH/ems-hanger-hotspot.service" /etc/systemd/system/
  chmod 644 /etc/systemd/system/ems-hanger-hotspot.service
  systemctl daemon-reload
  systemctl enable ems-hanger-hotspot.service
  echo "✓ Hotspot service installed and enabled"
  echo ""
fi

# Step 5: Make captive redirect executable
echo "Step 5: Setting up captive portal redirect..."
if [ -f "$BACKEND_PATH/captive_redirect.py" ]; then
  chmod +x "$BACKEND_PATH/captive_redirect.py"
  echo "✓ Captive redirect made executable"
else
  echo "⚠ Captive redirect not found"
fi
echo ""

# Step 6: Create logs directory
echo "Step 6: Setting up logging..."
mkdir -p /var/log/ems-hanger
chmod 755 /var/log/ems-hanger
touch /var/log/ems-hanger/backend.log
touch /var/log/ems-hanger/frontend.log
chmod 666 /var/log/ems-hanger/*.log
echo "✓ Logging directory created"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            ✓ AUTOSTART SETUP COMPLETE                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Services enabled for autostart:"
echo "  • mysql/mariadb (Database)"
echo "  • ems-hanger.service (Backend API on port 5000)"
echo "  • ems-hanger-frontend.service (Frontend on port 5173)"
echo ""
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Test services before reboot:"
echo "   sudo systemctl start ems-hanger.service"
echo "   sudo systemctl start ems-hanger-frontend.service"
echo "   sleep 5"
echo "   sudo systemctl status ems-hanger.service"
echo "   sudo systemctl status ems-hanger-frontend.service"
echo ""
echo "2. View service logs:"
echo "   sudo journalctl -u ems-hanger.service -n 20"
echo "   sudo journalctl -u ems-hanger-frontend.service -n 20"
echo ""
echo "3. Reboot the Raspberry Pi:"
echo "   sudo reboot"
echo ""
echo "4. After reboot, access the application:"
echo "   • From hotspot: http://10.42.0.1:5173"
echo "   • From same network: http://raspberrypi.local:5173"
echo ""
echo "5. To disable autostart:"
echo "   sudo systemctl disable ems-hanger.service"
echo "   sudo systemctl disable ems-hanger-frontend.service"
echo ""
