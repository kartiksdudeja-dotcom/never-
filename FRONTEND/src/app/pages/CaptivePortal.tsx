import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader, Wifi, ArrowRight, CheckCircle } from 'lucide-react';

// Configuration - Raspberry Pi hotspot settings
const HOTSPOT_CONFIG = {
  GATEWAY_IP: '10.42.0.1',
  BACKEND_PORT: 5000,
  FRONTEND_PORT: 5173,
  SSID: 'EMS-HANGER-PI',
};

const API_BASE = `http://${HOTSPOT_CONFIG.GATEWAY_IP}:${HOTSPOT_CONFIG.BACKEND_PORT}`;
const APP_URL = `http://${HOTSPOT_CONFIG.GATEWAY_IP}:${HOTSPOT_CONFIG.FRONTEND_PORT}`;

const CaptivePortal: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    // Check if device is connected to the hotspot by pinging the backend
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${API_BASE}/api/health`, {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setIsConnected(true);
          setIsRedirecting(true);
        }
      } catch (error) {
        console.log('Connection check attempt:', connectionAttempts + 1);
        setConnectionAttempts(prev => prev + 1);
        // Retry after 1.5 seconds if not connected
        if (connectionAttempts < 20) {
          setTimeout(checkConnection, 1500);
        }
      }
    };

    // Start checking connection immediately
    checkConnection();
  }, []);

  // Auto-redirect countdown when connected
  useEffect(() => {
    if (isRedirecting && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isRedirecting) {
      // Redirect to main app (login page)
      window.location.href = APP_URL;
    }
  }, [isRedirecting, countdown]);

  const handleManualRedirect = () => {
    window.location.href = APP_URL;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className={`rounded-full p-4 ${isConnected ? 'bg-green-100' : 'bg-blue-100'}`}>
                {isConnected ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <Wifi className="w-12 h-12 text-blue-600 animate-pulse" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isConnected ? 'Connected!' : 'Welcome!'}
            </h1>
            <p className="text-gray-600">
              {isConnected 
                ? 'Successfully connected to EMS-HANGER' 
                : `Connecting to ${HOTSPOT_CONFIG.SSID}...`}
            </p>
          </div>

          {/* Status Section */}
          <div className="space-y-4 mb-8">
            {/* Connection Status */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              isConnected 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex-shrink-0">
                {isConnected ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ) : (
                  <Loader className="h-6 w-6 text-yellow-600 animate-spin" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </p>
                <p className="text-xs text-gray-600">
                  {isConnected
                    ? 'WiFi connection established'
                    : `Checking connection (attempt ${connectionAttempts + 1})`}
                </p>
              </div>
            </div>

            {/* Redirect Status */}
            {isRedirecting && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in">
                <Loader className="h-6 w-6 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Launching App...
                  </p>
                  <p className="text-xs text-gray-600">
                    Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleManualRedirect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Go to Dashboard Now
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={!isConnected}
              onClick={() => {
                // Open settings page - varies by device
                window.location.href = 'file:///system/app/Settings/Settings.apk';
              }}
            >
              <Wifi className="w-4 h-4 mr-2" />
              WiFi Settings
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Connection Details
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {HOTSPOT_CONFIG.SSID}
                </span>
              </div>
              <div className="flex justify-between">
                <span>IP Gateway:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {HOTSPOT_CONFIG.GATEWAY_IP}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-mono font-semibold ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <p className="text-center text-xs text-gray-500 mt-6">
            EMS-HANGER Hotspot Portal • Auto-loading application
          </p>
        </CardContent>
      </Card>

      {/* Background Animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>
    </div>
  );
};

export default CaptivePortal;
