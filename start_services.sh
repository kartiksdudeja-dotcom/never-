#!/bin/bash
# =============================================================================
# EMS-HANGER - Start All Services
# =============================================================================
# Run with: sudo bash start_services.sh
# =============================================================================

echo "==========================================="
echo "  Starting EMS-HANGER Services"
echo "==========================================="

# Check if running as root (needed for port 80)
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root: sudo bash start_services.sh"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill any existing processes on our ports
echo "Stopping any existing services..."
fuser -k 80/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# Start the captive portal redirect server (port 80)
echo ""
echo "Starting Captive Portal Redirect (port 80)..."
cd "$SCRIPT_DIR/BACKEND"
python3 captive_redirect.py &
CAPTIVE_PID=$!
echo "  PID: $CAPTIVE_PID"

# Wait a moment
sleep 1

# Start the backend API server (port 5000)
echo ""
echo "Starting Backend API (port 5000)..."
python3 app.py &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

# Wait a moment
sleep 2

# Start the frontend dev server (port 5173)
echo ""
echo "Starting Frontend (port 5173)..."
cd "$SCRIPT_DIR/FRONTEND"
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

echo ""
echo "==========================================="
echo "  All Services Started!"
echo "==========================================="
echo ""
echo "Services running:"
echo "  - Captive Portal (port 80):  PID $CAPTIVE_PID"
echo "  - Backend API (port 5000):   PID $BACKEND_PID"
echo "  - Frontend (port 5173):      PID $FRONTEND_PID"
echo ""
echo "URLs (connect to hotspot first):"
echo "  App:     http://10.42.0.1:5173/"
echo "  Portal:  http://10.42.0.1:5173/captive-portal"
echo "  API:     http://10.42.0.1:5000/api"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait

# Cleanup on exit
trap "kill $CAPTIVE_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
