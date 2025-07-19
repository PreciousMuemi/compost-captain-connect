import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Plus, TrendingUp, Package, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FarmerStats {
  totalReports: number;
  totalEarnings: number;
  pendingReports: number;
  completedReports: number;
}

interface WasteReport {
  id: string;
  waste_type: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  location: string;
}

export default function FarmerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<FarmerStats>({
    totalReports: 0,
    totalEarnings: 0,
    pendingReports: 0,
    completedReports: 0,
  });
  const [recentReports, setRecentReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchFarmerData();
    }
  }, [profile]);

  const fetchFarmerData = async () => {
    try {
      // Fetch waste reports
      const { data: reports } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('farmer_id', profile?.id)
        .order('created_at', { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('farmer_id', profile?.id)
        .eq('status', 'completed');

      if (reports) {
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.status === 'reported' || r.status === 'scheduled').length;
        const completedReports = reports.filter(r => r.status === 'collected').length;
        
        setStats({
          totalReports,
          pendingReports,
          completedReports,
          totalEarnings: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
        });
        
        setRecentReports(reports.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching farmer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {profile?.full_name}</h1>
          <p className="text-muted-foreground">Farmer Dashboard</p>
        </div>
        <Button onClick={() => navigate('/waste-reports')}>
          <Plus className="h-4 w-4 mr-2" />
          Report Waste
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Reports"
          value={stats.totalReports}
          icon={Package}
          description="All waste reports"
        />
        <StatCard
          title="Pending Pickup"
          value={stats.pendingReports}
          icon={Clock}
          description="Awaiting collection"
        />
        <StatCard
          title="Completed"
          value={stats.completedReports}
          icon={TrendingUp}
          description="Successfully collected"
        />
        <StatCard
          title="Total Earnings"
          value={`KES ${stats.totalEarnings.toLocaleString()}`}
          icon={TrendingUp}
          description="From waste sales"
        />
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Waste Reports</CardTitle>
          <CardDescription>Your latest waste collection reports</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{report.waste_type.replace('_', ' ')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.quantity_kg}kg • {report.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No waste reports yet. Start by reporting your first waste!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => navigate('/waste-reports')}>
              <Plus className="h-4 w-4 mr-2" />
              Report New Waste
            </Button>
            <Button variant="outline" onClick={() => navigate('/waste-reports')}>
              <Clock className="h-4 w-4 mr-2" />
              Check Status
            </Button>
            <Button variant="outline" onClick={() => navigate('/payments')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              View Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}