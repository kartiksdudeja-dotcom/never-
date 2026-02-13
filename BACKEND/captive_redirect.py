#!/usr/bin/env python3
"""
Captive Portal Redirect Server (Port 80)

This simple server runs on port 80 and redirects ALL requests to the 
frontend captive portal page. This is required because when devices
connect to a WiFi hotspot, they check for internet connectivity by
making HTTP requests to port 80.

Run with: sudo python3 captive_redirect.py

Note: Must run as root/sudo to bind to port 80
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import sys

# Configuration
FRONTEND_URL = "http://10.42.0.1:5173"
CAPTIVE_PORTAL_URL = f"{FRONTEND_URL}/captive-portal"
PORT = 80

class CaptivePortalHandler(BaseHTTPRequestHandler):
    """Handle all HTTP requests by redirecting to captive portal"""
    
    def send_redirect_response(self):
        """Send HTTP redirect response"""
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        
        # Also send HTML body in case device doesn't follow redirect
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url={CAPTIVE_PORTAL_URL}">
    <title>Redirect</title>
</head>
<body>
    <p>Redirecting to captive portal...</p>
    <a href="{CAPTIVE_PORTAL_URL}">Click here if not redirected</a>
</body>
</html>"""
        self.wfile.write(html.encode('utf-8'))
    
    def do_GET(self):
        """Redirect all GET requests to captive portal"""
        device_info = self.headers.get('User-Agent', 'Unknown')
        print(f"[GET] Path: {self.path} | Device: {device_info}")
        self.send_redirect_response()
    
    def do_HEAD(self):
        """Handle HEAD requests (some captive portal checks use this)"""
        print(f"[HEAD] Path: {self.path}")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        print(f"[POST] Path: {self.path}")
        self.send_redirect_response()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests"""
        print(f"[OPTIONS] Path: {self.path}")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[Captive Portal] {args[0]}")


def main():
    print("=" * 50)
    print("EMS-HANGER Captive Portal Redirect Server")
    print("=" * 50)
    print(f"Listening on port: {PORT}")
    print(f"Redirecting to: {CAPTIVE_PORTAL_URL}")
    print()
    print("When devices connect to the hotspot and check")
    print("for internet, they will be redirected to the app.")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    try:
        server = HTTPServer(('0.0.0.0', PORT), CaptivePortalHandler)
        server.serve_forever()
    except PermissionError:
        print("\nError: Permission denied!")
        print("Port 80 requires root privileges.")
        print("Run with: sudo python3 captive_redirect.py")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == '__main__':
    main()
