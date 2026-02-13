# EMS Hanger - Automatic Startup Guide

This guide explains how to set up automatic startup for the EMS Hanger system on Raspberry Pi when power is supplied.

## What Gets Started Automatically

1. **MySQL Database** - The database server
2. **Backend Service** - Flask API server (port 5000)
3. **Frontend Service** - React/Vite development server (port 5173)
4. **Hotspot Service** - WiFi hotspot (if configured)

## Quick Setup

Run this command as root to set everything up:

```bash
sudo /home/vw/Downloads/EMS-HANGER-main/setup_autostart.sh
```

## What This Does

The setup script will:

✓ Enable MySQL service to start on boot
✓ Install the backend systemd service
✓ Install the frontend systemd service  
✓ Install the hotspot systemd service (if available)
✓ Reload the systemd daemon
✓ Enable all services to start automatically

## Manual Setup (Alternative)

If you prefer to set things up manually:

### 1. Enable MySQL on Startup

```bash
sudo systemctl enable mysql
sudo systemctl start mysql
```

### 2. Install Backend Service

```bash
sudo cp /home/vw/Downloads/EMS-HANGER-main/BACKEND/ems-hanger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ems-hanger-backend
```

### 3. Install Frontend Service

```bash
sudo cp /home/vw/Downloads/EMS-HANGER-main/FRONTEND/ems-hanger-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ems-hanger-frontend
```

### 4. Install Hotspot Service (Optional)

```bash
sudo cp /home/vw/Downloads/EMS-HANGER-main/ems-hanger-hotspot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ems-hanger-hotspot
```

## Verify Configuration

Check which services are enabled:

```bash
sudo systemctl is-enabled mysql
sudo systemctl is-enabled ems-hanger-backend
sudo systemctl is-enabled ems-hanger-frontend
sudo systemctl is-enabled ems-hanger-hotspot
```

All should return "enabled".

## View Service Status

```bash
sudo systemctl status mysql
sudo systemctl status ems-hanger-backend
sudo systemctl status ems-hanger-frontend
sudo systemctl status ems-hanger-hotspot
```

## View Live Logs

```bash
# Backend logs
sudo journalctl -u ems-hanger-backend -f

# Frontend logs
sudo journalctl -u ems-hanger-frontend -f

# All services
sudo journalctl -f
```

## Manual Control

### Start Services

```bash
sudo systemctl start mysql
sudo systemctl start ems-hanger-backend
sudo systemctl start ems-hanger-frontend
sudo systemctl start ems-hanger-hotspot
```

### Stop Services

```bash
sudo systemctl stop ems-hanger-backend
sudo systemctl stop ems-hanger-frontend
sudo systemctl stop mysql
```

### Restart Services

```bash
sudo systemctl restart ems-hanger-backend
sudo systemctl restart ems-hanger-frontend
```

## Disable Autostart

To prevent a service from starting automatically:

```bash
sudo systemctl disable ems-hanger-backend
sudo systemctl disable ems-hanger-frontend
sudo systemctl disable mysql
```

## Access the Application

After startup, the application will be available at:

- **Frontend**: `http://<raspberry-pi-ip>:5173`
- **Backend API**: `http://<raspberry-pi-ip>:5000`
- **Hotspot**: Connect to WiFi network (if configured)

## Startup Order

The services start in this order:

1. **Network** - System networking
2. **MySQL** - Database (waits for network)
3. **Backend** - Flask API (waits for MySQL and network)
4. **Frontend** - React app (waits for network)
5. **Hotspot** - WiFi (starts after network)

Each service depends on previous ones, ensuring they start in the correct order.

## Troubleshooting

### Services Don't Start After Reboot

1. Check if services are enabled:
   ```bash
   sudo systemctl is-enabled ems-hanger-backend
   ```

2. View logs to see errors:
   ```bash
   sudo journalctl -u ems-hanger-backend
   ```

3. Verify dependencies:
   ```bash
   sudo systemctl status mysql
   ```

### Backend/Frontend Crashes

1. Check service log:
   ```bash
   sudo journalctl -u ems-hanger-backend -n 50
   ```

2. Check if MySQL is running:
   ```bash
   sudo systemctl status mysql
   ```

3. Try restarting the service:
   ```bash
   sudo systemctl restart ems-hanger-backend
   ```

### Connection Refused Errors

1. Verify port availability:
   ```bash
   sudo netstat -tlnp | grep -E "5000|5173|3306"
   ```

2. Check if backend is running:
   ```bash
   sudo systemctl status ems-hanger-backend
   ```

## Testing After Power Cycle

1. Power off Raspberry Pi: `sudo shutdown -h now`
2. Remove power supply for 10 seconds
3. Reconnect power supply
4. Wait 30-60 seconds for services to start
5. Check if services are running:
   ```bash
   sudo systemctl status ems-hanger-backend
   sudo systemctl status ems-hanger-frontend
   ```
6. Access the frontend at `http://<ip>:5173`

## Important Notes

- ✓ Services will restart automatically if they crash
- ✓ All data is preserved during restarts
- ✓ Logs are saved in systemd journal
- ✓ Changes made through the app are persisted in the database
- ✓ No manual intervention needed after power restore

## Environment Variables

The services use these settings:

- **Backend**: `FLASK_ENV=production`
- **Frontend**: Development server mode (suitable for production on RPi)
- **Database**: Standard MySQL configuration from `config.py`

To modify environment variables, edit the service files:

```bash
sudo nano /etc/systemd/system/ems-hanger-backend.service
sudo systemctl daemon-reload
sudo systemctl restart ems-hanger-backend
```

## System Resources

Monitor system resources while services are running:

```bash
top
htop  # if installed
ps aux | grep python
ps aux | grep node
```

The services should not use excessive CPU or memory.
