import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Download, Copy, Wifi } from 'lucide-react';

interface HotspotConfig {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
}

// Default configuration - MUST match BACKEND/captive_portal.py and BACKEND/routes/hotspot.py
const DEFAULT_HOTSPOT_CONFIG: HotspotConfig = {
  ssid: 'EMS-HANGER-PI',
  password: 'EMS12345',  // Updated to match backend config
  security: 'WPA',
};

const HotspotQRCode: React.FC = () => {
  const [config, setConfig] = useState<HotspotConfig>(DEFAULT_HOTSPOT_CONFIG);

  const [copied, setCopied] = useState(false);

  // Generate WiFi QR code string in standard format
  // Format: WIFI:T:WPA;S:SSID;P:PASSWORD;;
  const generateWiFiQRString = (): string => {
    const { ssid, password, security } = config;
    
    // Escape special characters
    const escapedSSID = ssid.replace(/([\\:";,])/g, '\\$1');
    const escapedPassword = password.replace(/([\\:";,])/g, '\\$1');

    // WiFi QR Code standard format
    return `WIFI:T:${security};S:${escapedSSID};P:${escapedPassword};;`;
  };

  const handleDownload = () => {
    const qrCodeElement = document.getElementById('wifi-qr-code');
    if (qrCodeElement) {
      const canvas = qrCodeElement.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `ems-hanger-hotspot-qr-${Date.now()}.png`;
        link.click();
      }
    }
  };

  const handleCopyConfig = () => {
    const configText = `WiFi Network: ${config.ssid}\nPassword: ${config.password}\nSecurity: ${config.security}`;
    navigator.clipboard.writeText(configText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSSIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, ssid: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, password: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wifi className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Hotspot QR Code</h1>
          </div>
          <p className="text-gray-600">Scan this QR code to automatically connect to Raspberry Pi hotspot</p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <Card className="flex flex-col items-center justify-center p-6">
            <CardHeader className="text-center w-full pb-2">
              <CardTitle className="text-lg">Scan to Connect</CardTitle>
              <CardDescription>WiFi Connection QR Code</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div
                id="wifi-qr-code"
                className="bg-white p-4 rounded-lg border-2 border-blue-200"
              >
                <QRCode
                  value={generateWiFiQRString()}
                  size={280}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
            </CardContent>
            <div className="flex gap-3 mt-6 w-full">
              <Button
                onClick={handleDownload}
                className="flex-1"
                variant="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
              <Button
                onClick={handleCopyConfig}
                className="flex-1"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Details'}
              </Button>
            </div>
          </Card>

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Hotspot Settings</CardTitle>
              <CardDescription>Configure Raspberry Pi WiFi hotspot details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SSID Input */}
              <div className="space-y-2">
                <Label htmlFor="ssid" className="text-base font-semibold">
                  Network Name (SSID)
                </Label>
                <Input
                  id="ssid"
                  value={config.ssid}
                  onChange={handleSSIDChange}
                  placeholder="Enter WiFi network name"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  Name of the Raspberry Pi hotspot network
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={config.password}
                  onChange={handlePasswordChange}
                  placeholder="Enter WiFi password"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  Leave empty for open network
                </p>
              </div>

              {/* Security Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Security Type
                </Label>
                <div className="flex gap-3">
                  {(['WPA', 'WEP', 'nopass'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={config.security === type ? 'default' : 'outline'}
                      onClick={() => setConfig({ ...config, security: type })}
                      className="flex-1"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Current Settings Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-3">
                  Current Configuration
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Network:</span>
                    <span className="ml-2 font-mono text-blue-600">{config.ssid}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Password:</span>
                    <span className="ml-2 font-mono text-blue-600">
                      {'•'.repeat(config.password.length)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Security:</span>
                    <span className="ml-2 font-mono text-blue-600">{config.security}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <ol className="list-decimal list-inside space-y-2">
              <li>Ensure Raspberry Pi hotspot is enabled with the above SSID and password</li>
              <li>Share this QR code or open the link on mobile device</li>
              <li>Scan the QR code with your phone's camera app</li>
              <li>Tap the notification to connect to the WiFi network</li>
              <li>After connection, a landing page will open automatically</li>
              <li>You'll be redirected to the EMS-HANGER dashboard</li>
            </ol>
            <div className="mt-4 p-3 bg-white rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">For Raspberry Pi Setup:</p>
              <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block overflow-x-auto">
                sudo nmcli dev wifi hotspot ifname wlan0 ssid "EMS-HANGER-PI" password "emspi12345"
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HotspotQRCode;
