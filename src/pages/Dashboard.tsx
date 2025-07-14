
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Package, DollarSign, Eye, CheckCircle, Clock } from "lucide-react";
import { mockDashboardStats, mockWasteReports } from "../data/mockData";
import { WasteReport } from "../types";

const getStatusColor = (status: WasteReport['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'assigned':
      return 'bg-blue-100 text-blue-800';
    case 'collected':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
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
  const stats = mockDashboardStats;
  const recentReports = mockWasteReports.slice(0, 5);

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
                      <span className="font-medium text-gray-900">{report.farmerName}</span>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {report.quantity}kg {report.wasteType.replace('_', ' ')} • {report.location}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(report.reportedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(report.estimatedValue)}
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
