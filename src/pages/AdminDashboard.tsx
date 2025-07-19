import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, TrendingUp, DollarSign, Truck, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminStats {
  totalFarmers: number;
  totalWasteReports: number;
  totalPayments: number;
  pendingReports: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalFarmers: 0,
    totalWasteReports: 0,
    totalPayments: 0,
    pendingReports: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [
        { data: farmers },
        { data: reports },
        { data: payments },
        { data: orders }
      ] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'farmer'),
        supabase.from('waste_reports').select('*'),
        supabase.from('payments').select('amount, status'),
        supabase.from('orders').select('total_amount, status, created_at')
      ]);

      const pendingReports = reports?.filter(r => r.status === 'reported' || r.status === 'scheduled').length || 0;
      const totalPayments = payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalRevenue = orders?.filter(o => o.status === 'confirmed' || o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0) || 0;

      setStats({
        totalFarmers: farmers?.length || 0,
        totalWasteReports: reports?.length || 0,
        totalPayments,
        pendingReports,
        totalOrders: orders?.length || 0,
        totalRevenue,
      });

      // Recent activity - combine reports and orders
      const recentReports = reports?.slice(0, 3).map(r => ({
        type: 'waste_report',
        description: `New waste report: ${r.waste_type} (${r.quantity_kg}kg)`,
        timestamp: r.created_at,
        status: r.status
      })) || [];

      const recentOrders = orders?.slice(0, 2).map(o => ({
        type: 'order',
        description: `New product order: KES ${o.total_amount}`,
        timestamp: o.created_at,
        status: o.status
      })) || [];

      const combined = [...recentReports, ...recentOrders]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Waste Management Overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Farmers"
          value={stats.totalFarmers}
          icon={Users}
          description="Registered farmers"
        />
        <StatCard
          title="Waste Reports"
          value={stats.totalWasteReports}
          icon={Package}
          description="All time reports"
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports}
          icon={Truck}
          description="Awaiting pickup"
        />
        <StatCard
          title="Product Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          description="Customer orders"
        />
        <StatCard
          title="Payments Made"
          value={`KES ${stats.totalPayments.toLocaleString()}`}
          icon={DollarSign}
          description="To farmers"
        />
        <StatCard
          title="Revenue"
          value={`KES ${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          description="From product sales"
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest reports and orders</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={`
                    ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${activity.status === 'reported' ? 'bg-blue-100 text-blue-800' : ''}
                  `}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" onClick={() => navigate('/farmers')}>
          <Users className="h-4 w-4 mr-2" />
          Manage Farmers
        </Button>
        <Button variant="outline" onClick={() => navigate('/waste-reports')}>
          <Package className="h-4 w-4 mr-2" />
          Waste Reports
        </Button>
        <Button variant="outline" onClick={() => navigate('/payments')}>
          <DollarSign className="h-4 w-4 mr-2" />
          Payments
        </Button>
        <Button variant="outline" onClick={() => navigate('/analytics')}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>
    </div>
  );
}