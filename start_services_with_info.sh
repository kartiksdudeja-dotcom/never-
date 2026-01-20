#!/bin/bash
# =============================================================================
# Backend & Frontend Launcher with Status Display
# =============================================================================

PROJECT_DIR="/home/vw/Downloads/EMS-HANGER-main"
BACKEND_DIR="$PROJECT_DIR/BACKEND"
FRONTEND_DIR="$PROJECT_DIR/FRONTEND"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 Starting EMS-HANGER Backend & Frontend 🚀             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Start backend
echo "📡 Starting Backend Service..."
if sudo systemctl start ems-hanger.service; then
    echo "✅ Backend started successfully"
    sleep 2
    if systemctl is-active --quiet ems-hanger.service; then
        echo "   Status: RUNNING ✓"
        echo "   URL: http://localhost:5000"
    fi
else
    echo "❌ Failed to start backend"
fi

echo ""

# Start frontend
echo "🎨 Starting Frontend Service..."
if sudo systemctl start ems-hanger-frontend.service; then
    echo "✅ Frontend started successfully"
    sleep 2
    if systemctl is-active --quiet ems-hanger-frontend.service; then
        echo "   Status: RUNNING ✓"
        echo "   URL: http://localhost:5173"
    fi
else
    echo "❌ Failed to start frontend"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
echo ""

systemctl status ems-hanger.service --no-pager | grep -E "Active|Main PID|CGroup" || echo "Backend status unavailable"
echo ""
systemctl status ems-hanger-frontend.service --no-pager | grep -E "Active|Main PID|CGroup" || echo "Frontend status unavailable"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 To view logs:"
echo "   Backend:  sudo journalctl -u ems-hanger.service -f"
echo "   Frontend: sudo journalctl -u ems-hanger-frontend.service -f"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:5000"
echo ""
