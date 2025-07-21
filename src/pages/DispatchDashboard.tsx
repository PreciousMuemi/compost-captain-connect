import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Truck, Package, Clock, CheckCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface DispatchStats {
  totalReports: number;
  pendingReports: number;
  scheduledReports: number;
  completedReports: number;
  totalWasteCollected: number;
}

interface WasteReport {
  id: string;
  waste_type: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  location: string;
  farmer: {
    full_name: string;
    phone_number: string;
  };
}

export default function DispatchDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DispatchStats>({
    totalReports: 0,
    pendingReports: 0,
    scheduledReports: 0,
    completedReports: 0,
    totalWasteCollected: 0,
  });
  const [pendingReports, setPendingReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDispatchData();
    }
  }, [profile]);

  const fetchDispatchData = async () => {
    try {
      // Fetch all waste reports with farmer info
      const { data: reports } = await supabase
        .from('waste_reports')
        .select('*, farmer:profiles(full_name, phone_number)')
        .order('created_at', { ascending: false });

      if (reports) {
        const typedReports = reports as unknown as WasteReport[];
        const pendingCount = typedReports.filter(r => r.status === 'reported').length;
        const scheduledCount = typedReports.filter(r => r.status === 'scheduled').length;
        const completedCount = typedReports.filter(r => r.status === 'collected').length;
        const totalWasteCollected = typedReports
          .filter(r => r.status === 'collected')
          .reduce((sum, r) => sum + r.quantity_kg, 0);
        
        setStats({
          totalReports: typedReports.length,
          pendingReports: pendingCount,
          scheduledReports: scheduledCount,
          completedReports: completedCount,
          totalWasteCollected,
        });
        
        // Get only pending reports for the list
        const pending = typedReports.filter(r => r.status === 'reported');
        setPendingReports(pending);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSchedulePickup = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ status: 'scheduled' })
        .eq('id', reportId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Pickup scheduled successfully",
      });
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      toast({
        title: "Error",
        description: "Failed to schedule pickup",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dispatch Dashboard</h1>
      <p>Welcome, {profile?.full_name || 'Dispatcher'}</p>
      
      {/* Dispatch-specific content */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Dispatch Controls</h2>
        {/* Dispatch controls */}
      </div>
      
      <button 
        onClick={() => navigate('/logout')}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
};