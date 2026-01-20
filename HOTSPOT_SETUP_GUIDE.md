# Raspberry Pi Hotspot QR Code Setup Guide

## Overview
This guide explains how to set up automatic WiFi connection via QR code on your Raspberry Pi hotspot for the EMS-HANGER system.

## Features
- **WiFi QR Code**: Scan to automatically connect to Raspberry Pi hotspot
- **Captive Portal**: Auto-opening landing page after connection
- **Dashboard Integration**: Seamless redirect to EMS-HANGER dashboard

---

## Part 1: Raspberry Pi Setup

### 1.1 Enable Hotspot on Raspberry Pi

Use NetworkManager to create a hotspot:

```bash
# Create hotspot with specific SSID and password
sudo nmcli dev wifi hotspot ifname wlan0 ssid "EMS-HANGER-PI" password "EMS12345"

# Make it persistent (optional)
sudo nmcli connection modify Hotspot autoconnect yes
```

**Verify hotspot is running:**
```bash
sudo nmcli device wifi show
# or
iwconfig
```

### 1.2 Configure IP Address (Optional)
If you need specific IP configuration:

```bash
# Check current IP
ip addr show wlan0

# If using DHCP (default), it should be 10.42.0.1
# To verify:
ip route show

# Static IP configuration (if needed)
sudo nmcli connection modify Hotspot ipv4.address 10.42.0.1/24
```

### 1.3 Start EMS-HANGER Backend on Hotspot

```bash
cd /home/pi/EMS-HANGER-main/BACKEND
python app.py
# Should run on: http://10.42.0.1:5000/api
```

### 1.4 Start Frontend on Hotspot (Optional)

For local frontend testing on Raspberry Pi:

```bash
cd /home/pi/EMS-HANGER-main/FRONTEND
npm install
npm run dev
# Should run on: http://10.42.0.1:5173
```

Or use static build:
```bash
npm run build
# Serve dist/ folder with a simple HTTP server
python -m http.server 5173 --directory dist
```

---

## Part 2: QR Code Generation & Usage

### 2.1 Access QR Code Generator (Web Interface)

1. **On Computer/Laptop:**
   ```
   http://localhost:5173/hotspot
   ```

2. **On Mobile (After WiFi Connection):**
   ```
   http://10.42.0.1:5173/hotspot
   ```

### 2.2 QR Code Details

The QR code contains:
- **WiFi SSID**: `EMS-HANGER-PI`
- **Password**: `EMS12345`
- **Security**: `WPA`
- **Format**: Standard WiFi QR Code (WIFI:T:WPA;S:SSID;P:PASSWORD;;)

### 2.3 Using the QR Code

**On iPhone/iOS:**
1. Open Camera app
2. Point at QR code
3. Tap notification "Join WiFi Network"
4. Confirm connection
5. Captive portal opens automatically

**On Android:**
1. Open Google Lens or dedicated QR app
2. Scan QR code
3. Tap "Connect to WiFi"
4. Confirm password
5. Auto-open landing page (if captive portal enabled)

---

## Part 3: Captive Portal Setup

A captive portal automatically opens a webpage when connecting to the hotspot.

### 3.1 Enable Captive Portal on Raspberry Pi

```bash
# Install dnsmasq for DHCP + DNS redirection
sudo apt-get install dnsmasq -y

# Configure dnsmasq
sudo nano /etc/dnsmasq.conf
```

Add these lines:
```conf
# DHCP configuration
dhcp-range=10.42.0.50,10.42.0.100,12h
dhcp-option=option:router,10.42.0.1
dhcp-option=option:dns-server,10.42.0.1

# Captive portal redirect - all HTTP to dashboard
address=/#/10.42.0.1
```

### 3.2 Configure iptables for Captive Portal

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
sudo sh -c 'echo 1 > /proc/sys/net/ipv4/ip_forward'

# Add iptables rules (redirect HTTP 80 to app port)
sudo iptables -A PREROUTING -t nat -p tcp --dport 80 -j DNAT --to-destination 10.42.0.1:5173

# Make rules persistent
sudo iptables-save > /etc/iptables/rules.v4
```

### 3.3 Access Captive Portal Page

After connecting to hotspot, the landing page opens automatically:
```
http://10.42.0.1:5173/captive-portal
```

---

## Part 4: API Endpoints

### Get Hotspot Configuration
```bash
curl http://10.42.0.1:5000/api/hotspot/config
```

Response:
```json
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

### Update Hotspot Configuration
```bash
curl -X POST http://10.42.0.1:5000/api/hotspot/config \
  -H "Content-Type: application/json" \
  -d '{
    "ssid": "NEW-SSID",
    "password": "newpassword",
    "security": "WPA"
  }'
```

### Get QR Code Image (PNG)
```bash
curl http://10.42.0.1:5000/api/hotspot/qr-code -o hotspot-qr.png
```

### Get QR Code String (For Custom Generation)
```bash
curl http://10.42.0.1:5000/api/hotspot/qr-string
```

### Health Check
```bash
curl http://10.42.0.1:5000/api/health
```

### Get Device Info
```bash
curl http://10.42.0.1:5000/api/hotspot/device-info
```

---

## Part 5: Troubleshooting

### Hotspot Not Showing Up

```bash
# Check WiFi interface status
rfkill list

# If blocked, unblock
rfkill unblock all

# Restart NetworkManager
sudo systemctl restart NetworkManager

# Check available networks
sudo nmcli dev wifi list
```

### Can't Connect to Hotspot

```bash
# Check if hotspot is running
sudo nmcli connection show

# Stop and restart hotspot
sudo nmcli connection down Hotspot
sudo nmcli connection up Hotspot
```

### QR Code Not Working

- **Verify WiFi format**: Make sure it's a valid WiFi QR code
- **Test with multiple apps**: Try Google Lens, iOS Camera, or dedicated QR apps
- **Check credentials**: Ensure SSID and password match hotspot settings
- **Manually connect**: Test by connecting manually to verify network works

### Captive Portal Not Opening

```bash
# Check if DNS is working
nslookup google.com 10.42.0.1

# Check dnsmasq status
sudo systemctl status dnsmasq

# View dnsmasq logs
sudo tail -f /var/log/syslog | grep dnsmasq
```

### Backend/Frontend Not Accessible

```bash
# Check if ports are listening
sudo netstat -tlnp | grep 5000
sudo netstat -tlnp | grep 5173

# Check firewall
sudo ufw status

# If needed, open ports
sudo ufw allow 5000/tcp
sudo ufw allow 5173/tcp
```

---

## Part 6: Customization

### Change SSID/Password

**Method 1: Via API** (if backend running)
```bash
curl -X POST http://10.42.0.1:5000/api/hotspot/config \
  -H "Content-Type: application/json" \
  -d '{
    "ssid": "MY-CUSTOM-SSID",
    "password": "mycustompass"
  }'
```

**Method 2: Manually on Raspberry Pi**
```bash
# Edit hotspot settings
sudo nmcli connection modify Hotspot 802-11-wireless.ssid "MY-CUSTOM-SSID"
sudo nmcli connection modify Hotspot 802-11-wireless-security.psk "mycustompass"

# Restart
sudo nmcli connection down Hotspot
sudo nmcli connection up Hotspot
```

### Customize Landing Page

Edit `/FRONTEND/src/pages/CaptivePortal.tsx` to:
- Change colors and branding
- Add custom messages
- Modify auto-redirect timeout
- Add additional functionality

### Add Authentication to QR Code Admin

The `/api/hotspot/config` POST endpoint should be protected with JWT token:

```python
# In routes/hotspot.py, add to the POST endpoint:
from flask_jwt_extended import jwt_required

@hotspot_bp.route('/config', methods=['POST'])
@jwt_required()  # Requires valid token
def update_hotspot_config():
    # ... existing code
```

---

## Part 7: Quick Reference

| Item | Value |
|------|-------|
| Hotspot SSID | `EMS-HANGER-PI` |
| Hotspot Password | `EMS12345` |
| Gateway IP | `10.42.0.1` |
| Backend URL | `http://10.42.0.1:5000/api` |
| Frontend URL | `http://10.42.0.1:5173` |
| QR Code Page | `/hotspot` |
| Captive Portal | `/captive-portal` |
| Health Check | `/api/health` |

---

## Part 8: Files Added/Modified

### New Files:
- `FRONTEND/src/pages/HotspotQRCode.tsx` - QR code generator page
- `FRONTEND/src/pages/CaptivePortal.tsx` - Captive portal landing page
- `BACKEND/routes/hotspot.py` - Hotspot API endpoints

### Modified Files:
- `FRONTEND/package.json` - Added `qrcode.react`
- `BACKEND/requirements.txt` - Added `qrcode`, `Pillow`
- `BACKEND/app.py` - Registered hotspot blueprint
- `FRONTEND/src/styles/index.css` - Added blob animation

---

## Next Steps

1. ✅ Install dependencies (`npm install`, `pip install -r requirements.txt`)
2. ✅ Configure Raspberry Pi hotspot
3. ✅ Start backend and frontend
4. ✅ Generate and test QR code
5. ✅ Configure captive portal (optional but recommended)
6. ✅ Test on mobile device
7. ✅ Customize as needed

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review logs: `journalctl -u NetworkManager -f`
- Test connectivity manually
- Verify API endpoints with curl
