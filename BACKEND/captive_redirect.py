#!/usr/bin/env python3
"""
Captive Portal Redirect Server (Port 80)

This server runs on port 80 and redirects ALL requests to the 
frontend captive portal page. When devices connect to WiFi hotspot,
they check for internet connectivity by making HTTP requests to port 80.

Run with: sudo python3 captive_redirect.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import sys
import urllib.parse

# Configuration - MUST match frontend and hotspot config
FRONTEND_HOST = "10.42.0.1"
FRONTEND_PORT = 5173
CAPTIVE_PORTAL_PATH = "/captive-portal"
CAPTIVE_PORTAL_URL = f"http://{FRONTEND_HOST}:{FRONTEND_PORT}{CAPTIVE_PORTAL_PATH}"
PORT = 80

class CaptivePortalHandler(BaseHTTPRequestHandler):
    """Handle all HTTP requests by redirecting to captive portal"""
    
    def send_redirect_response(self, target_url=None):
        """Send HTTP redirect response with fallback HTML"""
        if target_url is None:
            target_url = CAPTIVE_PORTAL_URL
            
        self.send_response(302)
        self.send_header('Location', target_url)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('X-Captive-Portal', 'true')
        self.end_headers()
        
        # Send fallback HTML with meta refresh and JavaScript redirect
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url={target_url}">
    <title>Redirecting to EMS-HANGER...</title>
    <script>
        // Try multiple redirect methods for better device compatibility
        window.location.href = "{target_url}";
        window.location.replace("{target_url}");
    </script>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }}
        .container {{
            text-align: center;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }}
        h1 {{
            color: #333;
            margin: 0 0 10px 0;
        }}
        p {{
            color: #666;
            margin: 10px 0;
        }}
        a {{
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .loader {{
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 EMS-HANGER System</h1>
        <div class="loader"></div>
        <p>Connecting to application...</p>
        <p><small>Redirecting to <code>{target_url}</code></small></p>
        <p>If not redirected, <a href="{target_url}">click here</a></p>
    </div>
</body>
</html>"""
        self.wfile.write(html.encode('utf-8'))
    
    def log_device_info(self, method):
        """Log request with device information"""
        user_agent = self.headers.get('User-Agent', 'Unknown')
        
        # Detect device type
        device_type = "Unknown"
        if 'samsung' in user_agent.lower():
            device_type = "Samsung"
        elif 'android' in user_agent.lower():
            device_type = "Android"
        elif 'iphone' in user_agent.lower() or 'ipad' in user_agent.lower():
            device_type = "iOS"
        elif 'windows' in user_agent.lower():
            device_type = "Windows"
        elif 'mac' in user_agent.lower():
            device_type = "macOS"
        elif 'linux' in user_agent.lower():
            device_type = "Linux"
            
        print(f"[{method}] {device_type:10} | Path: {self.path:30} | UA: {user_agent[:50]}")
    
    def do_GET(self):
        """Redirect all GET requests to captive portal"""
        self.log_device_info("GET")
        self.send_redirect_response()
    
    def do_HEAD(self):
        """Handle HEAD requests (used by some captive portal checks)"""
        self.log_device_info("HEAD")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('X-Captive-Portal', 'true')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        self.log_device_info("POST")
        self.send_redirect_response()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests"""
        self.log_device_info("OPTIONS")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
    
    def do_CONNECT(self):
        """Handle CONNECT requests (HTTPS tunneling)"""
        self.log_device_info("CONNECT")
        self.send_response(302)
        self.send_header('Location', CAPTIVE_PORTAL_URL)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging - suppress default logging"""
        pass  # Use log_device_info instead


def main():
    print("=" * 70)
    print("EMS-HANGER Captive Portal Redirect Server")
    print("=" * 70)
    print(f"📡 Listening on: 0.0.0.0:{PORT}")
    print(f"🎯 Redirecting to: {CAPTIVE_PORTAL_URL}")
    print("")
    print("When devices connect to hotspot:")
    print("  • Android/Samsung: Opens automatically")
    print("  • iOS: May require manual redirect")
    print("  • Windows/macOS: Opens notification")
    print("")
    print("Supported HTTP methods:")
    print("  • GET, HEAD, POST, OPTIONS, CONNECT")
    print("")
    print("Press Ctrl+C to stop")
    print("=" * 70)
    print("")
    
    try:
        server = HTTPServer(('0.0.0.0', PORT), CaptivePortalHandler)
        server.serve_forever()
    except PermissionError:
        print("❌ Permission Error: Port 80 requires root privileges")
        print("Run with: sudo python3 captive_redirect.py")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        sys.exit(0)


if __name__ == '__main__':
    main()

   
