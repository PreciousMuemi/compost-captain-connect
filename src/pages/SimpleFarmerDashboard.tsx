import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const SimpleFarmerDashboard = () => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  console.log('🌱 SimpleFarmerDashboard mounted');
  console.log('🔄 Auth loading:', loading);
  console.log('👤 User:', user);
  console.log('👤 Profile:', profile);

  useEffect(() => {
    console.log('🔄 SimpleFarmerDashboard useEffect running');
    
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // If user is authenticated but has a different role than farmer
    if (!loading && user && profile && profile.role !== 'farmer') {
      // Redirect based on role
      if (profile.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (profile.role === 'dispatch') {
        navigate('/dispatch-dashboard');
      }
    }
  }, [loading, user, profile, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    console.log('⏳ Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  console.log('✅ Rendering dashboard content');
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-800">Farmer Dashboard</h1>
        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.full_name || user.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Email: {user.email}</p>
            <p>Role: {profile?.role || 'Farmer'}</p>
            <p>Phone: {profile?.phone_number || 'Not provided'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compost Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You have no active compost orders.</p>
            <Button className="mt-4">Request Compost Pickup</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No recent activity to display.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleFarmerDashboard;