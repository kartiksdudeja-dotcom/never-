from flask import Flask, request, jsonify, redirect
from socketio_instance import socketio

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import subprocess
import threading
import os
import signal

from config import config
from database import init_database, init_pool

# Import routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.hangers import hangers_bp
from routes.checklist import checklist_bp
from routes.activity import activity_bp
from routes.dashboard import dashboard_bp
from routes.hotspot import hotspot_bp



limiter = Limiter(

    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)


# Global variable to track redirect server process
redirect_process = None


def start_redirect_server():
    """Start the captive portal redirect server (port 80) in a subprocess"""
    global redirect_process
    try:
        script_path = os.path.join(os.path.dirname(__file__), 'captive_redirect.py')
        print("\n🔄 Starting Captive Portal Redirect Server (port 80)...")
        
        # Try to start with sudo if needed, fallback to regular python
        try:
            redirect_process = subprocess.Popen(
                ['sudo', 'python3', script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            print("✓ Redirect server started with sudo")
        except Exception as e:
            print(f"⚠ Warning: Could not start redirect with sudo: {e}")
            print("  Attempting without sudo (may fail on port 80)...")
            redirect_process = subprocess.Popen(
                ['python3', script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            print("✓ Redirect server started (without sudo)")
    
    except Exception as e:
        print(f"✗ Error starting redirect server: {e}")
        print("  Captive portal redirect will not work on port 80")
        print("  You may need to run the backend with: sudo python3 app.py")


def stop_redirect_server():
    """Stop the captive portal redirect server"""
    global redirect_process
    if redirect_process:
        try:
            redirect_process.terminate()
            redirect_process.wait(timeout=2)
            print("✓ Redirect server stopped")
        except Exception as e:
            print(f"⚠ Error stopping redirect server: {e}")
            try:
                redirect_process.kill()
            except:
                pass


def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    socketio.init_app(app)

    app.config.from_object(config[config_name])
    
    # Initialize connection pool for faster database access
    init_pool()
    
    # Initialize extensions with permissive CORS for development
    if config_name == 'development':
        # Allow all origins in development
        CORS(app, 
             resources={r"/api/*": {
                 "origins": "*",
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization"],
                 "expose_headers": ["Content-Type"],
                 "supports_credentials": False,
                 "max_age": 3600
             }})
    else:
        # Restricted CORS for production
        CORS(app, 
             resources={r"/api/*": {
                 "origins": ["http://localhost:5173", "http://localhost:3000","http://10.42.0.1:5173"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization"],
                 "expose_headers": ["Content-Type"],
                 "supports_credentials": True,
                 "max_age": 3600
             }})
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Initialize rate limiter
    limiter.init_app(app)
    
    # Custom rate limit exceeded handler
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            'success': False,
            'message': 'Too many requests. Please try again later.',
            'retry_after': e.description
        }), 429
    
    # JWT Error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({
            'success': False,
            'message': 'Token has expired'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Invalid token'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Authorization required - token missing'
        }), 401
    
    # Security headers middleware
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        return response
    
    # Register blueprints with rate limiting
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(hangers_bp, url_prefix='/api/hangers')
    app.register_blueprint(checklist_bp, url_prefix='/api/checklist')
    app.register_blueprint(activity_bp, url_prefix='/api/activity')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(hotspot_bp)  # Hotspot routes (no prefix, includes /api/hotspot)
    
    # Apply strict rate limits to auth endpoints (login/logout)
    # 5 attempts per minute for login (brute force protection)
    limiter.limit("5 per minute")(auth_bp)
    
    # Health check endpoint (no rate limit)
    @app.route('/api/health', methods=['GET'])
    @limiter.exempt
    def health_check():
        return {'status': 'healthy', 'message': 'EMS Hanger API is running'}
    
    # Debug endpoint to check headers
    @app.route('/api/debug/headers', methods=['GET'])
    @limiter.exempt
    def debug_headers():
        auth_header = request.headers.get('Authorization', 'NOT PROVIDED')
        return {
            'authorization_header': auth_header,
            'all_headers': dict(request.headers)
        }
    
    # --- Captive Portal Detection and Redirects ---
    # These routes intercept captive portal detection requests from various devices
    # and redirect them to our captive portal page
    
    CAPTIVE_PORTAL_URL = 'http://10.42.0.1:5173/captive-portal'
    
    @app.route('/generate_204')
    @limiter.exempt
    def android_captive():
        """Android captive portal detection - returns redirect to captive portal"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/gen_204')
    @limiter.exempt
    def android_captive_alt():
        """Android alternate captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/hotspot-detect.html')
    @limiter.exempt
    def ios_captive():
        """iOS/macOS captive portal detection"""
        # iOS expects specific response, redirect to our portal
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/library/test/success.html')
    @limiter.exempt
    def ios_captive_alt():
        """iOS alternate captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/ncsi.txt')
    @limiter.exempt
    def windows_captive():
        """Windows NCSI captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/connecttest.txt')
    @limiter.exempt
    def windows_captive_alt():
        """Windows alternate captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/redirect')
    @limiter.exempt
    def manual_redirect():
        """Manual redirect endpoint"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/success.txt')
    @limiter.exempt
    def success_txt():
        """Generic success.txt captive portal check"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/canonical.html')
    @limiter.exempt
    def firefox_captive():
        """Firefox captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    # Samsung-specific captive portal detection endpoints
    @app.route('/warp/secure/check')
    @limiter.exempt
    def samsung_captive():
        """Samsung Knox Vault captive portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/samsungportal.html')
    @limiter.exempt
    def samsung_portal():
        """Samsung portal page detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/samsung/check.html')
    @limiter.exempt
    def samsung_check():
        """Samsung check endpoint"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/portal.php')
    @limiter.exempt
    def generic_portal():
        """Generic portal detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/mobile/status.html')
    @limiter.exempt
    def mobile_status():
        """Mobile status detection"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/is_portal.html')
    @limiter.exempt
    def is_portal():
        """Portal status check"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    @app.route('/captive-portal')
    @limiter.exempt
    def captive_portal_redirect():
        """Redirect to frontend captive portal page"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    # Root redirect - send to captive portal for first-time connections
    @app.route('/')
    @limiter.exempt
    def root_redirect():
        """Root path - redirect to captive portal"""
        return redirect(CAPTIVE_PORTAL_URL, code=302)

    return app


if __name__ == '__main__':
    # Initialize database on startup (with error handling)
    try:
        init_database()
        print("✓ Database initialized successfully")
    except Exception as e:
        print(f"⚠ Warning: Database initialization failed: {e}")
        print("  The server will continue running, but database operations may fail.")
        print("  Please ensure MySQL is running and configured correctly.")
    
    # Start redirect server for port 80
    start_redirect_server()
    
    # Create and run app
    app = create_app()
    print("\n" + "="*50)
    print("🚀 EMS-HANGER Backend Server Starting")
    print("="*50)
    print(f"Backend API: http://0.0.0.0:5000")
    print(f"Captive Portal: http://10.42.0.1:5173/captive-portal")
    print("="*50 + "\n")
    
    try:
       socketio.run(app, host='0.0.0.0', port=5000)



    except KeyboardInterrupt:
        print("\n\nShutting down...")
        stop_redirect_server()
    except Exception as e:
        print(f"\nError: {e}")
        stop_redirect_server()
