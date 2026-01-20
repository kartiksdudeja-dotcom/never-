from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import config
from database import init_database

# Import routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.hangers import hangers_bp
from routes.checklist import checklist_bp
from routes.activity import activity_bp
from routes.dashboard import dashboard_bp
from routes.hotspot import hotspot_bp

# Initialize limiter globally
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)


def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
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
    # Initialize database on startup
    init_database()
    
    # Create and run app
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
