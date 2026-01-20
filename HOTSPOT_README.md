# EMS-HANGER Raspberry Pi Hotspot QR Code System

A complete system for automatic WiFi hotspot connection via QR code scanning and captive portal landing page for the EMS-HANGER Raspberry Pi deployment.

## 🎯 Features

- **WiFi QR Code Generation**: Generate standard WiFi QR codes for Raspberry Pi hotspot
- **Automatic Connection**: Phone/mobile devices auto-connect when QR code is scanned
- **Captive Portal**: Automatic landing page after WiFi connection
- **Dashboard Integration**: Seamless redirect to EMS-HANGER dashboard
- **Web Interface**: Beautiful QR code manager for configuration and download
- **CLI Tool**: Command-line QR code generator for terminal display
- **API Endpoints**: RESTful API for hotspot configuration management

---

## 📁 Files Added/Modified

### **New Frontend Files**

- [src/pages/HotspotQRCode.tsx](FRONTEND/src/pages/HotspotQRCode.tsx) - QR code generator React component
- [src/pages/CaptivePortal.tsx](FRONTEND/src/pages/CaptivePortal.tsx) - Captive portal landing page

### **New Backend Files**

- [routes/hotspot.py](BACKEND/routes/hotspot.py) - Hotspot API endpoints
- [generate_hotspot_qr.py](BACKEND/generate_hotspot_qr.py) - CLI QR code generator script

### **Modified Files**

- [package.json](FRONTEND/package.json) - Added `qrcode.react` dependency
- [requirements.txt](BACKEND/requirements.txt) - Added `qrcode`, `Pillow` dependencies
- [app.py](BACKEND/app.py) - Registered hotspot blueprint
- [src/app/App.tsx](FRONTEND/src/app/App.tsx) - Added page routing
- [src/styles/index.css](FRONTEND/src/styles/index.css) - Added blob animations

### **Documentation**

- [HOTSPOT_SETUP_GUIDE.md](HOTSPOT_SETUP_GUIDE.md) - Comprehensive setup and troubleshooting guide

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Frontend
cd FRONTEND
npm install

# Backend
cd BACKEND
pip install -r requirements.txt
```

### 2. Configure Raspberry Pi Hotspot

```bash
# Create hotspot
sudo nmcli dev wifi hotspot ifname wlan0 ssid "EMS-HANGER-PI" password "emspi12345"
```

### 3. Start Services

```bash
# Terminal 1: Backend
cd BACKEND
python app.py

# Terminal 2: Frontend
cd FRONTEND
npm run dev
```

### 4. Generate QR Code

**Option A: Web Interface**
- Visit: `http://localhost:5173/hotspot` (on development machine)
- Or: `http://10.42.0.1:5173/hotspot` (on Raspberry Pi)

**Option B: CLI**
```bash
cd BACKEND
python generate_hotspot_qr.py

# Or with custom settings
python generate_hotspot_qr.py --ssid "MY-SSID" --password "mypassword"
```

---

## 🌐 Web Interface

### QR Code Generator Page (`/hotspot`)

A beautiful, responsive interface for managing hotspot QR codes:

**Features:**
- Real-time QR code generation
- Live preview of QR code
- Download as PNG image
- Copy configuration details
- Editable SSID/Password
- Security type selection (WPA, WEP, nopass)
- Usage instructions

**Access:**
```
Development: http://localhost:5173/hotspot
Raspberry Pi: http://10.42.0.1:5173/hotspot
```

### Captive Portal (`/captive-portal`)

Auto-opening landing page when connecting to hotspot:

**Features:**
- Connection status indicator
- Auto-redirect countdown (5 seconds)
- Manual redirect button
- Connection details display
- Animated gradient background
- Mobile-optimized design

**Access:**
```
Automatic: Opens after WiFi connection
Manual: http://10.42.0.1:5173/captive-portal
```

---

## 🔌 API Endpoints

All endpoints available at: `http://10.42.0.1:5000/api/hotspot`

### Get Current Configuration
```bash
GET /api/hotspot/config

Response:
{
  "success": true,
  "data": {
    "ssid": "EMS-HANGER-PI",
    "gateway_ip": "10.42.0.1",
    "port": 5000,
    "security": "WPA"
  }
}
```

### Update Configuration
```bash
POST /api/hotspot/config

Body:
{
  "ssid": "NEW-SSID",
  "password": "newpassword",
  "security": "WPA"
}

Response:
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "ssid": "NEW-SSID",
    "security": "WPA"
  }
}
```

### Get QR Code Image (PNG)
```bash
GET /api/hotspot/qr-code

Returns: PNG image file
```

### Get QR Code String
```bash
GET /api/hotspot/qr-string

Response:
{
  "success": true,
  "data": {
    "qr_string": "WIFI:T:WPA;S:EMS-HANGER-PI;P:emspi12345;;",
    "ssid": "EMS-HANGER-PI",
    "gateway_ip": "10.42.0.1"
  }
}
```

### Health Check
```bash
GET /api/hotspot/health

Response:
{
  "status": "healthy",
  "service": "ems-hanger-hotspot",
  "gateway_ip": "10.42.0.1"
}
```

### Get Device Info
```bash
GET /api/hotspot/device-info

Response:
{
  "success": true,
  "data": {
    "device_name": "EMS-HANGER Raspberry Pi",
    "network_ssid": "EMS-HANGER-PI",
    "gateway_ip": "10.42.0.1",
    "dashboard_url": "http://10.42.0.1:5173/",
    "api_url": "http://10.42.0.1:5000/api"
  }
}
```

---

## 📱 Mobile Device Connection Flow

### iPhone/iOS
1. Open Camera app
2. Point camera at QR code
3. Tap notification "Join WiFi Network"
4. Confirm password (should be auto-filled)
5. Connected ✓
6. Captive portal automatically opens (or visit `http://10.42.0.1:5173/`)

### Android
1. Open Google Lens or any QR code scanner
2. Scan QR code
3. Tap "Connect to WiFi" (if using Lens)
4. Or manually connect from WiFi settings
5. Connected ✓
6. Auto-open landing page or visit `http://10.42.0.1:5173/`

### Desktop/Laptop
1. Visit: `http://10.42.0.1:5173/hotspot`
2. Download QR code image
3. Share or print for scanning

---

## 🔧 CLI QR Code Generator

Standalone script for generating QR codes in terminal.

### Usage

**Default settings:**
```bash
python generate_hotspot_qr.py
```

**Custom SSID and password:**
```bash
python generate_hotspot_qr.py --ssid "MY-NETWORK" --password "securepass"
```

**ASCII-only mode (no PNG file):**
```bash
python generate_hotspot_qr.py --ascii-only
```

**Save to custom file:**
```bash
python generate_hotspot_qr.py --output qrcodes/my-hotspot.png
```

**All options:**
```bash
python generate_hotspot_qr.py --help

Options:
  --ssid SSID              WiFi SSID (default: EMS-HANGER-PI)
  --password PASSWORD      WiFi password (default: emspi12345)
  --security TYPE          Security type: WPA, WEP, nopass (default: WPA)
  --output FILE            Output PNG filename (default: hotspot-qr.png)
  --no-save                Don't save PNG file
  --ascii-only             Only show ASCII QR code
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Device                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Scan QR Code from Camera/Lens                │   │
│  │  2. Auto-connect to "EMS-HANGER-PI"              │   │
│  │  3. Browser opens captive portal                 │   │
│  │  4. Auto-redirect to dashboard                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         WiFi
                       10.42.0.0/24
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   Raspberry Pi Hotspot   │      │  Frontend (React/Vite)   │
│  SSID: EMS-HANGER-PI     │      │  Port: 5173              │
│  IP: 10.42.0.1           │      │                          │
│  Security: WPA           │      │ Routes:                  │
│                          │      │ - /hotspot (QR Gen)      │
│                          │      │ - /captive-portal        │
└──────────────────────────┘      │ - / (Dashboard)          │
         │                        └──────────────────────────┘
         │                                   ▲
         │                        Captive Portal Redirect
         │
         ▼
┌──────────────────────────┐
│  Backend (Flask/Python)  │
│  Port: 5000              │
│                          │
│ Endpoints:               │
│ GET  /api/hotspot/config │
│ POST /api/hotspot/config │
│ GET  /api/hotspot/qr-*   │
│ GET  /api/health         │
└──────────────────────────┘
```

---

## 📊 Configuration Flow

```
QR Code Generator
├── Frontend (React Component)
│   └── http://10.42.0.1:5173/hotspot
│       ├── Real-time QR preview
│       ├── SSID/Password editor
│       ├── Download PNG
│       └── Copy details
│
├── Backend API
│   └── http://10.42.0.1:5000/api/hotspot
│       ├── GET /config (Read)
│       ├── POST /config (Update)
│       ├── GET /qr-code (PNG)
│       ├── GET /qr-string (Data)
│       └── GET /device-info
│
└── CLI Tool
    └── generate_hotspot_qr.py
        ├── Terminal display
        ├── PNG file save
        └── Custom parameters
```

---

## 🔐 Security Considerations

### Current Implementation
- Standard WiFi QR Code format (WIFI:T:WPA;S:SSID;P:PASSWORD;;)
- In-memory configuration storage (can be upgraded to database)
- CORS enabled for development
- Rate limiting on API endpoints

### For Production
- [ ] Store configuration in database
- [ ] Protect config update endpoint with JWT authentication
- [ ] Enable CORS restrictions to trusted origins only
- [ ] Use environment variables for default SSID/password
- [ ] Implement audit logging for configuration changes
- [ ] Add HTTPS/TLS for secure communication
- [ ] Implement API key authentication for sensitive endpoints

---

## 🛠️ Troubleshooting

### QR Code Not Scanning
```bash
# Verify QR code file was created
ls -la hotspot-qr.png

# Try with better error correction
python generate_hotspot_qr.py --ascii-only
```

### Can't Connect to WiFi After Scanning
```bash
# Check if hotspot is active
sudo nmcli dev wifi list

# Verify hotspot settings
sudo nmcli connection show Hotspot

# Restart hotspot
sudo nmcli connection down Hotspot
sudo nmcli connection up Hotspot
```

### Captive Portal Not Opening
```bash
# Check if frontend is running
curl http://10.42.0.1:5173

# Check if DNS redirection is working
nslookup google.com 10.42.0.1

# Verify iptables rules
sudo iptables -t nat -L -n
```

### Backend API Not Responding
```bash
# Check if backend is running
curl http://10.42.0.1:5000/api/health

# Check backend logs
journalctl -u ems-hanger-backend -f

# Verify port is listening
sudo netstat -tlnp | grep 5000
```

---

## 📝 Usage Scenarios

### Scenario 1: Field Technician
1. Technician arrives at site with iPad
2. Opens Camera app and scans QR code from sticker on Raspberry Pi
3. iPad automatically connects to hotspot
4. EMS-HANGER dashboard opens automatically
5. Technician logs in and begins work

### Scenario 2: Administrator Setup
1. Admin visits `http://10.42.0.1:5173/hotspot`
2. Configures SSID and password
3. Downloads QR code PNG
4. Prints stickers with QR codes
5. Distributes to field teams

### Scenario 3: Remote Access
1. User visits web interface on local machine
2. Can regenerate QR codes with different credentials
3. Can view current hotspot configuration
4. Can update SSID/password via API

---

## 🔄 Integration Points

### With Admin Dashboard
- Add "Hotspot QR" button to admin panel
- Navigate to `/hotspot` page
- Manage device connectivity from main interface

### With Authentication
- Protect QR config endpoints with JWT
- Only admins can modify hotspot settings
- Log all configuration changes

### With Activity Tracking
- Track field technician connections
- Log WiFi connection/disconnection events
- Monitor hotspot usage patterns

---

## 📚 File Reference

| File | Purpose | Type |
|------|---------|------|
| HotspotQRCode.tsx | QR generator React component | Frontend |
| CaptivePortal.tsx | Landing page component | Frontend |
| hotspot.py | API endpoints | Backend |
| generate_hotspot_qr.py | CLI QR generator | Backend |
| HOTSPOT_SETUP_GUIDE.md | Detailed setup guide | Documentation |
| HOTSPOT_README.md | This file | Documentation |

---

## 🎓 Learn More

- [WiFi QR Code Format](https://mobileconfig.org/wifi)
- [Raspberry Pi WiFi Hotspot](https://www.raspberrypi.org/documentation/configuration/wireless/access-point.md)
- [React QR Code Library](https://www.npmjs.com/package/qrcode.react)
- [Python QR Code Library](https://pypi.org/project/qrcode/)
- [Captive Portal Basics](https://en.wikipedia.org/wiki/Captive_portal)

---

## 📞 Support & Issues

For issues or questions:
1. Check [HOTSPOT_SETUP_GUIDE.md](HOTSPOT_SETUP_GUIDE.md) troubleshooting section
2. Review API response codes and error messages
3. Check system logs for backend errors
4. Verify network connectivity between devices
5. Test with curl before using mobile devices

---

## 📄 License

This component is part of the EMS-HANGER project. Follow the main project's license.

---

**Last Updated**: January 19, 2026  
**Version**: 1.0.0  
**Status**: Ready for Production
