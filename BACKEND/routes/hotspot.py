from flask import Blueprint, jsonify, request, send_file
import qrcode
import io
from flask_httpauth import HTTPBasicAuth

hotspot_bp = Blueprint('hotspot', __name__, url_prefix='/api/hotspot')
auth = HTTPBasicAuth()

class HotspotConfig:
    """Hotspot WiFi Configuration"""
    
    DEFAULT_CONFIG = {
        'ssid': 'EMS-HANGER-PI',
        'password': 'EMS12345',
        'security': 'WPA',
        'gateway_ip': '10.42.0.1',
        'port': 5000
    }

    _current_config = DEFAULT_CONFIG.copy()

    @classmethod
    def get_config(cls):
        return cls._current_config.copy()
    
    @classmethod
    def update_config(cls, **kwargs):
        for key, value in kwargs.items():
            if key in cls._current_config:
                cls._current_config[key] = value
        return cls._current_config.copy()

    @classmethod
    def generate_wifi_qr_string(cls, ssid=None, password=None, security=None):
        ssid = ssid or cls._current_config['ssid']
        password = password or cls._current_config['password']
        security = security or cls._current_config['security']
        
        escaped_ssid = ssid.replace('\\', '\\\\').replace(';', '\\;').replace(':', '\\:').replace('"', '\\"')
        escaped_password = password.replace('\\', '\\\\').replace(';', '\\;').replace(':', '\\:').replace('"', '\\"')
        
        return f"WIFI:T:{security};S:{escaped_ssid};P:{escaped_password};;"

@auth.get_password
def get_password(username):
    if username == 'admin':
        return 'admin_password'  # Replace with secure password storage
    return None

@hotspot_bp.route('/config', methods=['GET'])
def get_hotspot_config():
    config = HotspotConfig.get_config()
    return jsonify({
        'success': True,
        'data': {
            'ssid': config['ssid'],
            'gateway_ip': config['gateway_ip'],
            'port': config['port'],
            'security': config['security']
        }
    }), 200

@hotspot_bp.route('/config', methods=['POST'])
@auth.login_required
def update_hotspot_config():
    try:
        data = request.get_json()
        
        allowed_fields = {'ssid', 'password', 'security'}
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'success': False, 'error': 'No valid fields provided'}), 400
        
        if 'security' in update_data and update_data['security'] not in ['WPA', 'WEP', 'nopass']:
            return jsonify({'success': False, 'error': 'Invalid security type'}), 400
        
        config = HotspotConfig.update_config(**update_data)
        
        return jsonify({
            'success': True,
            'message': 'Configuration updated',
            'data': {
                'ssid': config['ssid'],
                'security': config['security']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@hotspot_bp.route('/qr-code', methods=['GET'])
def get_qr_code():
    try:
        qr_string = HotspotConfig.generate_wifi_qr_string()
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_string)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name='hotspot-qr.png'), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@hotspot_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'ems-hanger-hotspot',
        'gateway_ip': HotspotConfig.get_config()['gateway_ip']
    }), 200

@hotspot_bp.route('/device-info', methods=['GET'])
def get_device_info():
    config = HotspotConfig.get_config()
    return jsonify({
        'success': True,
        'data': {
            'device_name': 'EMS-HANGER Raspberry Pi',
            'network_ssid': config['ssid'],
            'gateway_ip': config['gateway_ip'],
            'dashboard_url': f"http://{config['gateway_ip']}:5173/",
            'api_url': f"http://{config['gateway_ip']}:{config['port']}/api"
        }
    }), 200
