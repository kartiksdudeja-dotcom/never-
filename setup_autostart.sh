#!/bin/bash

# EMS Hanger Autostart Setup Script for Raspberry Pi
# This script will configure automatic startup of MySQL, Backend, and Frontend on power supply

set -e

echo "==================================="
echo "EMS Hanger Autostart Setup"
echo "==================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Setup directory: $SCRIPT_DIR"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use: sudo ./setup_autostart.sh)"
    exit 1
fi

echo ""
echo "📦 Step 1: Ensuring MySQL is enabled on startup..."

# Enable MySQL service
if systemctl is-enabled mysql > /dev/null 2>&1; then
    echo "✓ MySQL is already enabled"
else
    echo "Enabling MySQL service..."
    systemctl enable mysql
    echo "✓ MySQL enabled"
fi

# Start MySQL if not running
if systemctl is-active --quiet mysql; then
    echo "✓ MySQL is running"
else
    echo "Starting MySQL..."
    systemctl start mysql
    echo "✓ MySQL started"
fi

echo ""
echo "📦 Step 2: Setting up Backend Service..."

# Copy backend service file
BACKEND_SERVICE="/etc/systemd/system/ems-hanger-backend.service"
if [ -f "$SCRIPT_DIR/BACKEND/ems-hanger.service" ]; then
    echo "Installing backend service..."
    cp "$SCRIPT_DIR/BACKEND/ems-hanger.service" "$BACKEND_SERVICE"
    chmod 644 "$BACKEND_SERVICE"
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable backend service
    systemctl enable ems-hanger-backend
    echo "✓ Backend service installed and enabled"
else
    echo "⚠ Backend service file not found at $SCRIPT_DIR/BACKEND/ems-hanger.service"
fi

echo ""
echo "📦 Step 3: Setting up Frontend Service..."

# Copy frontend service file
FRONTEND_SERVICE="/etc/systemd/system/ems-hanger-frontend.service"
if [ -f "$SCRIPT_DIR/FRONTEND/ems-hanger-frontend.service" ]; then
    echo "Installing frontend service..."
    cp "$SCRIPT_DIR/FRONTEND/ems-hanger-frontend.service" "$FRONTEND_SERVICE"
    chmod 644 "$FRONTEND_SERVICE"
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable frontend service
    systemctl enable ems-hanger-frontend
    echo "✓ Frontend service installed and enabled"
else
    echo "⚠ Frontend service file not found at $SCRIPT_DIR/FRONTEND/ems-hanger-frontend.service"
fi

echo ""
echo "📦 Step 4: Setting up Hotspot Service (if available)..."

HOTSPOT_SERVICE="/etc/systemd/system/ems-hanger-hotspot.service"
if [ -f "$SCRIPT_DIR/ems-hanger-hotspot.service" ]; then
    echo "Installing hotspot service..."
    cp "$SCRIPT_DIR/ems-hanger-hotspot.service" "$HOTSPOT_SERVICE"
    chmod 644 "$HOTSPOT_SERVICE"
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable hotspot service
    systemctl enable ems-hanger-hotspot
    echo "✓ Hotspot service installed and enabled"
else
    echo "⚠ Hotspot service file not found"
fi

echo ""
echo "📦 Step 5: Verifying service status..."

echo ""
echo "MySQL Service:"
systemctl status mysql --no-pager | grep -E "Active|Enabled" || true

echo ""
echo "Backend Service:"
systemctl status ems-hanger-backend --no-pager 2>/dev/null | grep -E "Active|Enabled" || echo "  Not started yet (will start on reboot)"

echo ""
echo "Frontend Service:"
systemctl status ems-hanger-frontend --no-pager 2>/dev/null | grep -E "Active|Enabled" || echo "  Not started yet (will start on reboot)"

echo ""
echo "Hotspot Service:"
systemctl status ems-hanger-hotspot --no-pager 2>/dev/null | grep -E "Active|Enabled" || echo "  Not installed or disabled"

echo ""
echo "==================================="
echo "✅ Autostart setup completed!"
echo "==================================="
echo ""
echo "📋 Summary of what was configured:"
echo "  • MySQL: Auto-starts on power supply"
echo "  • Backend: Auto-starts on power supply (after MySQL)"
echo "  • Frontend: Auto-starts on power supply"
echo "  • Hotspot: Auto-starts on power supply (if available)"
echo ""
echo "🔄 These services will automatically start on the next reboot/power cycle"
echo ""
echo "⚡ To verify services are working:"
echo "   sudo systemctl status ems-hanger-backend"
echo "   sudo systemctl status ems-hanger-frontend"
echo ""
echo "📝 To view service logs:"
echo "   sudo journalctl -u ems-hanger-backend -f"
echo "   sudo journalctl -u ems-hanger-frontend -f"
echo ""
echo "🛑 To manually start/stop services:"
echo "   sudo systemctl start ems-hanger-backend"
echo "   sudo systemctl stop ems-hanger-backend"
echo ""
