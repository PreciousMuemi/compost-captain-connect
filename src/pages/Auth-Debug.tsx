import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Leaf } from 'lucide-react';

const AuthDebug = () => {
  console.log("🔄 AuthDebug component RENDERED");
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const navigate = useNavigate();

  // Debug logger
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(`🐛 [DEBUG] ${logMessage}`);
    setDebugLogs(prev => [...prev.slice(-10), logMessage]); // Keep last 10 logs
  };

  useEffect(() => {
    addLog("useEffect started");
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const testSupabaseConnection = async () => {
      try {
        addLog("Testing Supabase connection...");
        
        // Test 1: Check if supabase client exists
        addLog(`Supabase client exists: ${!!supabase}`);
        
        // Skip the problematic table query and go straight to session check
        addLog("Skipping table query, going straight to session check...");
        
        // Test 2: Try to get session (this is what we actually need)
        addLog("Attempting to get session...");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        addLog(`Session result - Session: ${!!sessionData.session}, Error: ${sessionError?.message || 'none'}`);
        
        if (mounted) {
          if (sessionData.session) {
            addLog("Session found, navigating to dashboard");
            navigate('/');
          } else {
            addLog("No session found, showing auth form");
            setInitialLoading(false);
          }
        }
        
      } catch (error: any) {
        addLog(`Connection test failed: ${error.message}`);
        if (mounted) {
          setInitialLoading(false);
        }
      }
    };

    // Set timeout as fallback (reduced to 5 seconds)
    timeoutId = setTimeout(() => {
      if (mounted) {
        addLog("TIMEOUT REACHED - Force stopping loading");
        setInitialLoading(false);
      }
    }, 5000);

    // Start the test
    testSupabaseConnection();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`Auth state changed: ${event}, Session: ${!!session}`);
      if (mounted && event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => {
      addLog("useEffect cleanup");
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const forceSkip = () => {
    addLog("User clicked force skip");
    setInitialLoading(false);
  };

  const testDirectConnection = async () => {
    addLog("Testing direct Supabase connection...");
    try {
      const response = await fetch('https://qoplbnyngttwkiaovwyy.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcGxibnluZ3R0d2tpYW92d3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MzAzNTEsImV4cCI6MjA2ODEwNjM1MX0.91HBdKSMhLtdMfeO3pefdvSp5x1Rl3dkk1FDXD4TYik'
        }
      });
      addLog(`Direct connection result: ${response.status} ${response.statusText}`);
    } catch (error: any) {
      addLog(`Direct connection failed: ${error.message}`);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">Debug Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">Checking authentication...</h3>
              <p className="text-sm text-gray-600">Debug information below</p>
            </div>

            {/* Debug Logs */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs mb-4 max-h-60 overflow-y-auto">
              <div className="mb-2 text-white font-bold">Debug Logs:</div>
              {debugLogs.length === 0 ? (
                <div className="text-yellow-400">No logs yet...</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={forceSkip} className="w-full" variant="outline">
                Force Skip (Continue to Auth Form)
              </Button>
              <Button onClick={testDirectConnection} className="w-full" variant="secondary">
                Test Direct Connection
              </Button>
              <Button onClick={() => window.location.reload()} className="w-full" variant="destructive">
                Reload Page
              </Button>
            </div>

            {/* Environment Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs">
              <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
              <div><strong>URL:</strong> {window.location.href}</div>
              <div><strong>Supabase URL:</strong> https://qoplbnyngttwkiaovwyy.supabase.co</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-800">Auth Form Ready</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="mb-4">Debug mode completed successfully!</p>
            <p className="text-sm text-gray-600 mb-4">
              You can now use the authentication form or go to the dashboard.
            </p>
            
            <div className="space-y-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.href = '/auth'} variant="outline" className="w-full">
                Go to Auth Form
              </Button>
            </div>
          </div>
          
          {/* Show final debug logs */}
          <div className="mt-4 bg-gray-100 p-3 rounded text-xs">
            <div className="font-bold mb-2">Final Debug Logs:</div>
            {debugLogs.slice(-5).map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebug;