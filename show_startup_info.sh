#!/bin/bash
# =============================================================================
# EMS-HANGER Startup Information Display
# Shows backend and frontend startup status with a visual popup
# =============================================================================

BACKEND_PORT=5000
FRONTEND_PORT=5173
HOTSPOT_SSID="EMS-HANGER-PI"
HOTSPOT_PASS="EMS12345"
HOTSPOT_IP="10.42.0.1"

LOG_FILE="/tmp/ems-hanger-startup.log"

# Clear previous log
> "$LOG_FILE"

show_info() {
    {
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║   🚀 EMS-HANGER SYSTEM STARTUP INFORMATION 🚀              ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "🔧 SYSTEM STATUS:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Check backend status
        echo ""
        echo "📡 BACKEND SERVICE (Flask API)"
        if systemctl is-active --quiet ems-hanger.service; then
            echo "   Status: ✅ RUNNING"
            echo "   URL: http://localhost:$BACKEND_PORT"
            echo "   API: http://$(hostname -I | awk '{print $1}'):$BACKEND_PORT"
        else
            echo "   Status: ⚠️  STARTING..."
            echo "   Expected: http://localhost:$BACKEND_PORT"
        fi
        
        # Check frontend status
        echo ""
        echo "🎨 FRONTEND SERVICE (Vite React App)"
        if systemctl is-active --quiet ems-hanger-frontend.service; then
            echo "   Status: ✅ RUNNING"
            echo "   URL: http://localhost:$FRONTEND_PORT"
            echo "   APP: http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT"
        else
            echo "   Status: ⚠️  STARTING..."
            echo "   Expected: http://localhost:$FRONTEND_PORT"
        fi
        
        # Check hotspot status
        echo ""
        echo "📶 HOTSPOT STATUS"
        if systemctl is-active --quiet ems-hanger-hotspot.service; then
            echo "   Status: ✅ ACTIVE"
            echo "   SSID: $HOTSPOT_SSID"
            echo "   Password: $HOTSPOT_PASS"
            echo "   IP: $HOTSPOT_IP"
            echo "   Portal: http://$HOTSPOT_IP:$FRONTEND_PORT"
        else
            echo "   Status: ℹ️  FALLBACK MODE"
            echo "   Using normal WiFi network"
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⏱️  STARTUP TIME: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "📋 LOGS:"
        echo "   Backend: sudo journalctl -u ems-hanger.service -f"
        echo "   Frontend: sudo journalctl -u ems-hanger-frontend.service -f"
        echo "   Hotspot: sudo journalctl -u ems-hanger-hotspot.service -f"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
    } | tee "$LOG_FILE"
}

# Display the info
show_info

# Try to show GUI notification if available
if command -v notify-send &> /dev/null; then
    notify-send -u normal -t 5000 "EMS-HANGER Started" \
        "Backend: http://localhost:$BACKEND_PORT\nFrontend: http://localhost:$FRONTEND_PORT\nHotspot: $HOTSPOT_SSID"
fi

# If in X session, also try to show in a terminal window
if [ -n "$DISPLAY" ]; then
    if command -v xterm &> /dev/null; then
        (xterm -hold -e "cat $LOG_FILE && read -p 'Press Enter to close...'" &) 2>/dev/null || true
    fi
fi

exit 0
