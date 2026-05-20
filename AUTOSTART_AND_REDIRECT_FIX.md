# EMS-HANGER Autostart & Redirect Fix - Implementation Summary

## Changes Made

### 1. **Service Files Fixed**
   - **Location**: `BACKEND/ems-hanger.service` and `FRONTEND/ems-hanger-frontend.service`
   - **Issue**: Missing `[Install]` section needed for `systemctl enable`
   - **Fix**: Added `[Install]` section with `WantedBy=multi-user.target`
   - **Result**: Services now properly enabled for autostart on power-up

### 2. **Backend Service Improvements**
   - **Reduced restart delay**: Changed `RestartSec` from 10s to 5s for faster recovery
   - **Improved database handling**: Set dependencies on both `mysql.service` and `mariadb.service`
   - **Network dependencies**: Added `After=network-online.target` and `Wants=network-online.target`

### 3. **Autostart Setup Script Created**
   - **File**: `enable_autostart_services.sh`
   - **Features**:
     - Enables MySQL/MariaDB autostart
     - Installs and enables backend service
     - Installs and enables frontend service
     - Sets up logging directory
     - Provides clear setup instructions
   - **Usage**: `sudo bash enable_autostart_services.sh`

### 4. **Captive Portal Redirect Enhanced**
   - **File**: `BACKEND/captive_redirect.py`
   - **Improvements**:
     - Support for multiple HTTP methods (GET, HEAD, POST, OPTIONS, CONNECT)
     - Better device detection (Samsung, iOS, Android, Windows, macOS, Linux)
     - Improved HTML redirect with multiple fallback methods
     - JavaScript-based redirect for better compatibility
     - Better logging with device type information
     - Fallback redirect if initial fails
   - **Supported Devices**: Samsung, Android, iOS, Windows, macOS, Linux

### 5. **Frontend Captive Portal Component Improved**
   - **File**: `FRONTEND/src/app/pages/CaptivePortal.tsx`
   - **Changes**:
     - Multiple health check endpoints instead of single endpoint
     - Better error handling and retry logic
     - More informative console logs for debugging
     - Fallback redirect after max attempts

## How to Set Up Autostart

### On Raspberry Pi:

1. **Run the setup script** (one-time setup):
   ```bash
   cd /home/vw/Downloads/EMS-HANGER-main
   sudo bash enable_autostart_services.sh
   ```

2. **Reboot the Raspberry Pi**:
   ```bash
   sudo reboot
   ```

3. **Verify services are running** (after reboot):
   ```bash
   sudo systemctl status ems-hanger.service
   sudo systemctl status ems-hanger-frontend.service
   ```

4. **View logs if services don't start**:
   ```bash
   sudo journalctl -u ems-hanger.service -f
   sudo journalctl -u ems-hanger-frontend.service -f
   ```

## How to Access After Boot

### From Hotspot:
- WiFi: `EMS-HANGER-PI`
- Password: `EMS12345`
- URL: `http://10.42.0.1:5173`

### From Local Network:
- URL: `http://raspberrypi.local:5173`
- IP URL: `http://<pi-ip>:5173`

## QR Code / Captive Portal Redirect

### How It Works:
1. Device connects to hotspot `EMS-HANGER-PI`
2. Device checks internet connectivity by making HTTP request to port 80
3. Our `captive_redirect.py` server redirects ALL requests to the app
4. Device opens the app automatically (or shows notification)

### If Redirect Not Working:

**For Android/Samsung**:
- May need to manually open browser and visit `http://10.42.0.1:5173`
- Check logs: `sudo journalctl -u ems-hanger.service -n 50`

**For iOS**:
- May need to tap "Continue" or "Login" in the WiFi settings
- Manual redirect: Open Safari and visit `http://10.42.0.1:5173`

**Debugging**:
```bash
# Check if port 80 server is running
sudo netstat -tulpn | grep :80

# Start captive redirect manually (if not via service)
sudo python3 /home/vw/Downloads/EMS-HANGER-main/BACKEND/captive_redirect.py

# Check redirect server logs
sudo journalctl -u ems-hanger.service -f
```

## Troubleshooting

### Services Not Starting After Reboot:
```bash
# Check service status
sudo systemctl status ems-hanger.service
sudo systemctl status ems-hanger-frontend.service

# Start manually for testing
sudo systemctl start ems-hanger.service
sudo systemctl start ems-hanger-frontend.service

# View detailed logs
sudo journalctl -u ems-hanger.service -n 100
sudo journalctl -u ems-hanger-frontend.service -n 100
```

### QR Code/Redirect Not Working:
1. Ensure port 80 server is running:
   ```bash
   sudo systemctl status ems-hanger.service
   ```
2. Check if backend API is responding:
   ```bash
   curl http://10.42.0.1:5000/api/health
   ```
3. Check if frontend is accessible:
   ```bash
   curl http://10.42.0.1:5173/
   ```
4. Manually visit the captive portal URL in browser:
   ```
   http://10.42.0.1:5173/captive-portal
   ```

## Files Modified

1. `BACKEND/ems-hanger.service` - Added [Install] section, improved dependencies
2. `FRONTEND/ems-hanger-frontend.service` - Added [Install] section
3. `enable_autostart_services.sh` - Created new setup script
4. `BACKEND/captive_redirect.py` - Enhanced redirect logic and device support
5. `FRONTEND/src/app/pages/CaptivePortal.tsx` - Improved connection checking

## Testing After Changes

1. **Test service startup**:
   ```bash
   sudo systemctl start ems-hanger.service
   sleep 2
   curl http://localhost:5000/api/health
   ```

2. **Test frontend**:
   ```bash
   sudo systemctl start ems-hanger-frontend.service
   sleep 5
   curl http://localhost:5173/
   ```

3. **Test redirect server**:
   ```bash
   sudo python3 /home/vw/Downloads/EMS-HANGER-main/BACKEND/captive_redirect.py
   # In another terminal:
   curl -L http://localhost/test
   ```

4. **Full system test** (after reboot):
   - Connect device to `EMS-HANGER-PI` hotspot
   - Should automatically open app (or show manual redirect prompt)
   - If manual: Visit `http://10.42.0.1:5173`
