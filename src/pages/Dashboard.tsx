  import React, { useState, useEffect } from 'react';
  import { supabase } from '@/integrations/supabase/client';
  import { useAuth } from '@/contexts/AuthContext';
  import { StatCard } from "../components/StatCard";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Users, FileText, Package, DollarSign, Eye, CheckCircle, Clock } from "lucide-react";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'collected':
        return 'bg-green-100 text-green-800';
      case 'processed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Dashboard = () => {
    const { user, userRole, signOut } = useAuth();
    const [dashboardData, setDashboardData] = useState({
      totalWasteCollected: 0,
      totalPayments: 0,
      recentReports: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchDashboardData = async () => {
        try {
          // Fetch total waste collected
          const { data: wasteData, error: wasteError } = await supabase
            .from('waste_reports')
            .select('quantity_kg')
            .eq('status', 'collected');

          if (wasteError) throw wasteError;

          // Fetch total payments
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed');

          if (paymentsError) throw paymentsError;

          // Fetch recent reports
          const { data: recentReportsData, error: reportsError } = await supabase
            .from('waste_reports')
            .select('*, farmer:profiles(full_name, phone_number)')
            .order('created_at', { ascending: false })
            .limit(5);

          if (reportsError) throw reportsError;

          // Calculate totals
          const totalWaste = wasteData.reduce((sum, item) => sum + (item.quantity_kg || 0), 0);
          const totalPayments = paymentsData.reduce((sum, item) => sum + (item.amount || 0), 0);

          setDashboardData({
            totalWasteCollected: totalWaste,
            totalPayments: totalPayments,
            recentReports: recentReportsData || [],
          });
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }, []);

    if (loading) {
      return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>Welcome, {user?.user_metadata?.full_name || 'User'}</p>
      
        {/* Dashboard stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <StatCard 
            title="Total Waste Collected"
            value={`${dashboardData.totalWasteCollected} kg`}
            icon={Package} description={''}          />
          <StatCard 
            title="Total Payments"
            value={`KES ${dashboardData.totalPayments.toFixed(2)}`}
            icon={DollarSign} description={''}          />
        </div>
      
        {/* Recent reports */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Waste Reports</h2>
          {/* Table of recent reports */}
        </div>
      
        <button 
          onClick={signOut}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    );
  };

  export default Dashboard;
