#!/bin/bash
# =============================================================================
# EMS-HANGER Auto Hotspot Setup on Boot with Fallback
# =============================================================================

SSID="EMS-HANGER-PI"
PASSWORD="EMS12345"
GATEWAY_IP="10.42.0.1"
INTERFACE="wlan0"
LOG_FILE="/var/log/ems-hanger-hotspot.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting EMS-HANGER Hotspot Setup..."

# Try to setup Hotspot
log_message "Attempting to configure WiFi Hotspot..."
{
    nmcli connection down Hotspot 2>/dev/null || true
    nmcli connection delete Hotspot 2>/dev/null || true

    nmcli connection add type wifi ifname $INTERFACE con-name Hotspot autoconnect yes ssid "$SSID" 2>&1
    nmcli connection modify Hotspot 802-11-wireless.mode ap 2>&1
    nmcli connection modify Hotspot 802-11-wireless.band bg 2>&1
    nmcli connection modify Hotspot ipv4.method shared 2>&1
    nmcli connection modify Hotspot ipv4.addresses $GATEWAY_IP/24 2>&1
    nmcli connection modify Hotspot wifi-sec.key-mgmt wpa-psk 2>&1
    nmcli connection modify Hotspot wifi-sec.psk "$PASSWORD" 2>&1

    log_message "Bringing up Hotspot connection..."
    nmcli connection up Hotspot 2>&1
    
    # Setup DNS hijacking
    log_message "Configuring DNS hijacking..."
    cat > /etc/dnsmasq.d/captive-portal.conf << EOF
interface=$INTERFACE
bind-interfaces
no-resolv
address=/#/$GATEWAY_IP
EOF

    # Disable systemd-resolved if needed
    systemctl stop systemd-resolved 2>/dev/null || true
    systemctl disable systemd-resolved 2>/dev/null || true

    systemctl enable dnsmasq 2>/dev/null || true
    systemctl restart dnsmasq 2>/dev/null || true

    # Enable IP forwarding
    echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true
    grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf 2>/dev/null

    log_message "✓ Hotspot setup complete! WiFi: $SSID (Password: $PASSWORD)"
    log_message "✓ Captive Portal IP: $GATEWAY_IP"
    
    exit 0
} || {
    log_message "✗ Hotspot setup failed! Falling back to normal WiFi..."
    
    # Fallback: Try to connect to normal WiFi if available
    log_message "Attempting to enable normal WiFi connection..."
    nmcli connection down Hotspot 2>/dev/null || true
    nmcli connection delete Hotspot 2>/dev/null || true
    
    # Enable any existing WiFi connections
    nmcli connection show --active 2>/dev/null || true
    
    # Restart NetworkManager
    systemctl restart NetworkManager 2>/dev/null || true
    
    log_message "Fallback to normal WiFi completed"
    exit 0
}
