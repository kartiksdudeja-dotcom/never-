# 🚀 EMS-HANGER Auto-Start Configuration Guide

## Overview
This guide explains how Raspberry Pi automatically starts hotspot, backend, and frontend services on boot, with fallback to normal WiFi if hotspot fails.

## ✅ Current Setup Status
- ✅ Backend service: Auto-starts independently 
- ✅ Frontend service: Auto-starts independently
- ✅ Hotspot service: Auto-starts with fallback to normal WiFi
- ✅ Info popup: Shows status after all services start

## Service Startup Flow
```
Pi Boots
 ↓
NetworkManager & MySQL Start
 ↓
ems-hanger-hotspot.service (Hotspot + DNS) [Tries hotspot, falls back to normal WiFi]
 ↓
ems-hanger.service (Backend - Port 5000) [Starts independently]
 ↓
ems-hanger-frontend.service (Frontend - Port 5173) [Starts independently]
 ↓
ems-hanger-info.service (Info Popup Display)
```

## Setup Process

### Step 1: Raspberry Pi pe Files Copy Karo
Apne local computer se Raspberry Pi ko ye files transfer karane hain:
- `ems-hanger-hotspot.service`
- `BACKEND/ems-hanger.service`
- `FRONTEND/ems-hanger-frontend.service`
- `start_hotspot_auto.sh`
- `enable_autostart.sh`

### Step 2: SSH karke Raspberry Pi Connect Karo
```bash
ssh pi@10.42.0.1
# ya
ssh pi@192.168.1.xxx
```

### Step 3: Enable Auto-Start Services
```bash
cd /home/pi/EMS-HANGER-main
sudo bash enable_autostart.sh
```

Ye script:
- ✓ Service files ko `/etc/systemd/system/` mein copy karega
- ✓ systemd daemon reload karega
- ✓ Teeno services ko enable karega

### Step 4: Verification
```bash
# Service status check karo
sudo systemctl status ems-hanger-hotspot.service
sudo systemctl status ems-hanger.service
sudo systemctl status ems-hanger-frontend.service

# Ya sabka status ek sath dekho
sudo systemctl status ems-hanger*
```

## Services Description

### 1. ems-hanger-hotspot.service
- **Description**: WiFi Hotspot + DNS Configuration
- **User**: root
- **Runs**: Start hotspot SSID "EMS-HANGER-PI" aur DNS hijacking setup
- **Port**: WiFi (AP mode)
- **Restart Policy**: on-failure (agar fail ho to 30 sec baad retry)
- **Logs**: `sudo journalctl -u ems-hanger-hotspot -f`

### 2. ems-hanger.service (Backend)
- **Description**: Flask Backend API Server
- **User**: pi
- **Depends on**: ems-hanger-hotspot.service
- **Port**: 5000
- **Restart Policy**: always (fail ho to 10 sec baad restart)
- **Logs**: `sudo journalctl -u ems-hanger -f`
- **Environment**: FLASK_ENV=production

### 3. ems-hanger-frontend.service (Frontend)
- **Description**: React Frontend Dev Server
- **User**: pi
- **Depends on**: ems-hanger-hotspot.service aur ems-hanger.service
- **Port**: 5173
- **Restart Policy**: always (fail ho to 10 sec baad restart)
- **Logs**: `sudo journalctl -u ems-hanger-frontend -f`
- **Extra Args**: `--host 0.0.0.0` (taki network se accessible ho)

## Important Files Updated

### ems-hanger-hotspot.service
```ini
[Service]
Type=oneshot
User=root
ExecStart=/home/pi/EMS-HANGER-main/start_hotspot_auto.sh
RemainAfterExit=yes
Restart=on-failure          # ← NAYI: Auto-restart on failure
RestartSec=30               # ← NAYI: 30 sec wait
```

### BACKEND/ems-hanger.service
```ini
[Service]
ExecStart=/usr/bin/python3 /home/pi/EMS-HANGER-main/BACKEND/app.py
StartLimitBurst=5           # ← NAYI: Max 5 retries
StartLimitIntervalSec=60    # ← NAYI: 60 sec window mein
SyslogIdentifier=ems-hanger-backend  # ← NAYI: Better logging
```

### FRONTEND/ems-hanger-frontend.service
```ini
[Service]
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0  # ← NAYI: --host 0.0.0.0
StartLimitBurst=5           # ← NAYI: Max 5 retries
StartLimitIntervalSec=60    # ← NAYI: 60 sec window mein
SyslogIdentifier=ems-hanger-frontend  # ← NAYI: Better logging
```

## Management Commands

### Services Start/Stop/Restart
```bash
# Start
sudo systemctl start ems-hanger-hotspot
sudo systemctl start ems-hanger
sudo systemctl start ems-hanger-frontend

# Stop
sudo systemctl stop ems-hanger-hotspot
sudo systemctl stop ems-hanger
sudo systemctl stop ems-hanger-frontend

# Restart
sudo systemctl restart ems-hanger-hotspot
sudo systemctl restart ems-hanger
sudo systemctl restart ems-hanger-frontend
```

### Logs Dekho (Real-time)
```bash
# Hotspot logs
sudo journalctl -u ems-hanger-hotspot -f

# Backend logs
sudo journalctl -u ems-hanger -f

# Frontend logs
sudo journalctl -u ems-hanger-frontend -f

# Sabhi logs together
sudo journalctl -u ems-hanger* -f
```

### Boot Disable Karo
```bash
# Agar auto-start disable karna ho
sudo systemctl disable ems-hanger-hotspot.service
sudo systemctl disable ems-hanger.service
sudo systemctl disable ems-hanger-frontend.service
```

## Troubleshooting

### Service Boot par Start Nahi Ho Rahi
```bash
# Check status
sudo systemctl status ems-hanger.service

# Check recent logs
sudo journalctl -u ems-hanger -n 50

# Service file syntax check
sudo systemctl --verify=1 ems-hanger.service
```

### Port Already in Use
```bash
# Check kaun sa process port use kar raha hai
sudo lsof -i :5000      # Backend
sudo lsof -i :5173      # Frontend
sudo lsof -i :80        # Hotspot redirect

# Kill the process
sudo kill -9 <PID>
```

### Service Restart Loop (Crash ho rahi hai)
```bash
# Check logs for errors
sudo journalctl -u ems-hanger -n 100 --no-pager

# Manually start aur error dekho
sudo -u pi /usr/bin/python3 /home/pi/EMS-HANGER-main/BACKEND/app.py
```

### npm Dependencies Missing (Frontend)
```bash
cd /home/pi/EMS-HANGER-main/FRONTEND
npm install
```

## Boot Sequence Timeline

```
Time 0: Raspberry Pi Power On
  ↓
Time 5-10s: ems-hanger-hotspot starts
  - WiFi hotspot "EMS-HANGER-PI" activate
  - DNS hijacking start (10.42.0.1)
  ↓
Time 15-20s: ems-hanger.service starts (Backend)
  - Flask server on port 5000
  ↓
Time 25-30s: ems-hanger-frontend.service starts (Frontend)
  - React dev server on port 5173
  ↓
Time 35s: All services running
  - Connect to WiFi "EMS-HANGER-PI"
  - Open http://10.42.0.1:5173
```

## Expected URLs After Boot

```
App:          http://10.42.0.1:5173/
Admin Panel:  http://10.42.0.1:5173/admin
Captive Portal: http://10.42.0.1:5173/captive-portal
API:          http://10.42.0.1:5000/api
```

## Files Reference

- Service Files Location: `/etc/systemd/system/`
- Backend Files: `/home/pi/EMS-HANGER-main/BACKEND/`
- Frontend Files: `/home/pi/EMS-HANGER-main/FRONTEND/`
- Hotspot Script: `/home/pi/EMS-HANGER-main/start_hotspot_auto.sh`
- Setup Script: `/home/pi/EMS-HANGER-main/enable_autostart.sh`

---

**Last Updated**: January 20, 2026
**Version**: 1.0
**Status**: ✅ Ready for Production
