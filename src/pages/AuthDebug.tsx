import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthDebug() {
  const { user, loading, session } = useAuth();

  useEffect(() => {
    const checkDirectSession = async () => {
      console.log('🔍 Directly checking session with supabase.auth.getSession()');
      const { data, error } = await supabase.auth.getSession();
      console.log('Direct session check result:', data);
      if (error) console.error('Direct session check error:', error);
    };
    
    checkDirectSession();
  }, []);

  const refreshSession = async () => {
    try {
      console.log('🔄 Manually refreshing session');
      const { data, error } = await supabase.auth.refreshSession();
      console.log('Session refresh result:', data);
      if (error) throw error;
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  };

  const checkUser = async () => {
    try {
      console.log('👤 Checking current user');
      const { data, error } = await supabase.auth.getUser();
      console.log('Current user result:', data);
      if (error) throw error;
    } catch (error) {
      console.error('Get user error:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">Auth Context State:</h3>
              <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify({ loading, user: user ? { id: user.id, email: user.email } : null, 
                  sessionExists: !!session }, null, 2)}
              </pre>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={refreshSession}>Refresh Session</Button>
              <Button onClick={checkUser}>Check User</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}