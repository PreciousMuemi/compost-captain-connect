
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Package, DollarSign, Eye, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

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

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalFarmers: 0,
    wasteReportsToday: 0,
    wasteCollectedKg: 0,
    totalPaidKsh: 0,
    pendingReports: 0,
    rawWasteKg: 0,
    processedManureKg: 0,
    pelletsReadyKg: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      // Fetch farmers count
      const { count: farmersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer');
      
      // Fetch today's reports count
      const today = new Date().toISOString().split('T')[0];
      const { count: todayReportsCount } = await supabase
        .from('waste_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);
      
      // Fetch total waste collected
      const { data: collectedData } = await supabase
        .from('waste_reports')
        .select('quantity_kg')
        .eq('status', 'collected');
      
      const totalWaste = collectedData?.reduce((sum, report) => sum + report.quantity_kg, 0) || 0;
      
      // Fetch total payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');
      
      const totalPaid = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // Fetch pending reports count
      const { count: pendingCount } = await supabase
        .from('waste_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'reported');
      
      // Fetch recent reports
      const { data: reportsData } = await supabase
        .from('waste_reports')
        .select(`
          *,
          farmer:profiles(full_name, phone_number)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch inventory (assuming only one row)
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('raw_waste_kg, processed_manure_kg, pellets_ready_kg')
        .single();

      setStats({
        totalFarmers: farmersCount || 0,
        wasteReportsToday: todayReportsCount || 0,
        wasteCollectedKg: totalWaste,
        totalPaidKsh: totalPaid,
        pendingReports: pendingCount || 0,
        rawWasteKg: inventoryData?.raw_waste_kg || 0,
        processedManureKg: inventoryData?.processed_manure_kg || 0,
        pelletsReadyKg: inventoryData?.pellets_ready_kg || 0,
      });
      
      setRecentReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with Captain Compost today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Farmers"
          value={stats.totalFarmers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Reports Today"
          value={stats.wasteReportsToday}
          icon={FileText}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Waste Collected"
          value={`${stats.wasteCollectedKg.toLocaleString()} kg`}
          icon={Package}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaidKsh)}
          icon={DollarSign}
          trend={{ value: 22, isPositive: true }}
        />
        <StatCard
          title="Raw Waste Inventory"
          value={`${stats.rawWasteKg.toLocaleString()} kg`}
          icon={Package}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Processed Manure"
          value={`${stats.processedManureKg.toLocaleString()} kg`}
          icon={Package}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Pellets Ready"
          value={`${stats.pelletsReadyKg.toLocaleString()} kg`}
          icon={Package}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Waste Reports</span>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{report.farmer?.full_name || 'Unknown'}</span>
                      <Badge className={getStatusColor(report.status || 'reported')}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {report.quantity_kg}kg {report.waste_type.replace('_', ' ')} • {report.location || 'No location'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(report.created_at || '')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(report.quantity_kg * 50)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Process Pending Reports ({stats.pendingReports})
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Review Payments
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Register New Farmer
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Assign Collection Agents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80">This Week's Collection</p>
                <p className="text-2xl font-bold">2,847 kg</p>
                <p className="text-sm text-primary-foreground/80">+18% from last week</p>
              </div>
              <Package className="h-12 w-12 text-primary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent text-accent-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-foreground/80">Active Farmers</p>
                <p className="text-2xl font-bold">743</p>
                <p className="text-sm text-accent-foreground/80">87% of total farmers</p>
              </div>
              <Users className="h-12 w-12 text-accent-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
