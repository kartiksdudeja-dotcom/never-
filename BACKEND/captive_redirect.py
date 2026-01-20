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
    
    def do_GET(self):
        """Redirect all GET requests to captive portal"""
        print(f"[Captive] Redirecting: {self.path} -> {CAPTIVE_PORTAL_URL}")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()
    
    def do_HEAD(self):
        """Handle HEAD requests (some captive portal checks use this)"""
        self.do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        self.do_GET()
    
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
