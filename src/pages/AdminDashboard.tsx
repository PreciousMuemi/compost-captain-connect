import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, TrendingUp, DollarSign, Truck, ShoppingCart, Send, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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
  const [processingPayouts, setProcessingPayouts] = useState<Set<string>>(new Set());

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

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ assigned_rider: riderId, status: 'confirmed' })
      .eq('id', orderId);

    if (error) {
      console.error('Assign error:', error);
      alert('Failed to assign rider: ' + error.message);
    } else {
      fetchAdminData();
    }
  };

  const markAsCollectedAndPayout = async (reportId: string, farmerId: string, amount: number) => {
    if (processingPayouts.has(reportId)) return;
    
    setProcessingPayouts(prev => new Set(prev).add(reportId));
    
    try {
      // First mark the waste report as collected
      const { error: updateError } = await supabase
        .from('waste_reports')
        .update({ 
          status: 'collected', 
          collected_date: new Date().toISOString() 
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Get farmer's phone number for payout
      const { data: farmer, error: farmerError } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('id', farmerId)
        .single();

      if (farmerError) throw farmerError;

      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          farmer_id: farmerId,
          amount: amount,
          payment_type: 'waste_purchase',
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Initiate B2C payout via edge function
      const { data, error } = await supabase.functions.invoke('mpesa-b2c-payout', {
        body: {
          phoneNumber: farmer.phone_number,
          amount: amount,
          paymentId: payment.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payout Initiated",
          description: `Payment of KES ${amount} initiated to ${farmer.full_name}`,
        });
      } else {
        throw new Error(data.error || 'Payout failed');
      }

      fetchAdminData();
    } catch (error: any) {
      console.error('Payout error:', error);
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to process payout",
        variant: "destructive",
      });
    } finally {
      setProcessingPayouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      // Update waste report status
      const { error: updateError } = await supabase
        .from("waste_reports")
        .update({ 
          admin_verified: true, 
          status: "scheduled"
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Get the report details for notification
      const { data: report } = await supabase
        .from("waste_reports")
        .select("farmer_id, waste_type, quantity_kg")
        .eq("id", reportId)
        .single();

      if (report) {
        // Send real-time notification to farmer
        await supabase.from("notifications").insert({
          recipient_id: report.farmer_id,
          type: "approval",
          title: "Waste Report Approved",
          message: `Your waste report for ${report.quantity_kg}kg of ${report.waste_type.replace('_', ' ')} has been approved. A rider will be assigned soon.`,
          related_entity_id: reportId
        });

        toast({
          title: "Report Verified",
          description: "Farmer has been notified of approval",
        });
      }

      fetchAdminData();
    } catch (error) {
      console.error('Error verifying report:', error);
      toast({
        title: "Error",
        description: "Failed to verify report",
        variant: "destructive",
      });
    }
  };

  const handleAssignRider = async (reportId: string, riderId: string) => {
    try {
      // Update waste report with rider assignment
      const { error: updateError } = await supabase
        .from("waste_reports")
        .update({ 
          rider_id: riderId, 
          status: "scheduled"
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Get the report and rider details for notification
      const { data: report } = await supabase
        .from("waste_reports")
        .select("farmer_id, waste_type, quantity_kg")
        .eq("id", reportId)
        .single();

      const { data: rider } = await supabase
        .from("riders")
        .select("name, phone_number")
        .eq("id", riderId)
        .single();

      if (report && rider) {
        // Send real-time notification to farmer
        await supabase.from("notifications").insert({
          recipient_id: report.farmer_id,
          type: "rider_assigned",
          title: "Rider Assigned",
          message: `Rider ${rider.name} (${rider.phone_number}) has been assigned to your pickup. They will contact you soon.`,
          related_entity_id: reportId
        });

        toast({
          title: "Rider Assigned",
          description: "Farmer has been notified of rider assignment",
        });
      }

      fetchAdminData();
    } catch (error) {
      console.error('Error assigning rider:', error);
      toast({
        title: "Error",
        description: "Failed to assign rider",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Waste Management Overview</p>
          </div>
          <button
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
          >
            Logout
          </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-8">
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

        {/* Pending Waste Reports - B2C Payouts */}
          <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Pending Waste Collections
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Mark as collected and process farmer payouts
              </CardDescription>
          </CardHeader>
            <CardContent className="p-6">
            <PendingReports 
              onMarkCollected={markAsCollectedAndPayout}
              processingPayouts={processingPayouts}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
          <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Latest reports and orders
              </CardDescription>
          </CardHeader>
            <CardContent className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={`
                        ${activity.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : ''}
                        ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : ''}
                        ${activity.status === 'reported' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' : ''}
                    `}>
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/farmers')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
            >
              <Users className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <div className="font-semibold">Manage Farmers</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">View & manage farmer accounts</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/waste-reports')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
            >
              <Package className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold">Waste Reports</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Review waste submissions</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/payments')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
            >
              <DollarSign className="h-5 w-5 mr-3 text-purple-600" />
              <div className="text-left">
                <div className="font-semibold">Payments</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Track payment history</div>
              </div>
          </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin-tickets')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
            >
              <MessageCircle className="h-5 w-5 mr-3 text-orange-600" />
              <div className="text-left">
                <div className="font-semibold">Support Tickets</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Handle user requests</div>
              </div>
          </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin-orders')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
            >
              <Package className="h-5 w-5 mr-3 text-indigo-600" />
              <div className="text-left">
                <div className="font-semibold">Orders</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Manage customer orders</div>
              </div>
          </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin-inventory')}
              className="h-16 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-200"
            >
              <ShoppingCart className="h-5 w-5 mr-3 text-teal-600" />
              <div className="text-left">
                <div className="font-semibold">Inventory</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Manage products & stock</div>
              </div>
          </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Component for pending waste reports
function PendingReports({ 
  onMarkCollected, 
  processingPayouts 
}: { 
  onMarkCollected: (reportId: string, farmerId: string, amount: number) => void;
  processingPayouts: Set<string>;
}) {
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      const { data: reports, error } = await supabase
        .from('waste_reports')
        .select(`
          *,
          profiles:farmer_id (
            id,
            full_name,
            phone_number
          )
        `)
        .in('status', ['reported', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingReports(reports || []);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center py-4">Loading pending reports...</p>;
  }

  if (pendingReports.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No pending waste reports</p>;
  }

  const calculatePayment = (wasteType: string, quantityKg: number) => {
    // Payment rates per kg based on waste type
    const rates: Record<string, number> = {
      'animal_manure': 15,
      'coffee_husks': 10,
      'rice_hulls': 8,
      'maize_stalks': 5,
      'other': 10
    };
    return (rates[wasteType] || 10) * quantityKg;
  };

  return (
    <div className="space-y-4">
      {pendingReports.map((report) => {
        const paymentAmount = calculatePayment(report.waste_type, report.quantity_kg);
        const isProcessing = processingPayouts.has(report.id);
        
        return (
          <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">{report.waste_type.replace('_', ' ')}</h3>
                <Badge variant="outline">{report.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {report.quantity_kg}kg • {report.location}
              </p>
              <p className="text-sm text-muted-foreground">
                Farmer: {report.profiles?.full_name} • {report.profiles?.phone_number}
              </p>
              <p className="text-sm font-medium text-green-600">
                Payment: KES {paymentAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={() => onMarkCollected(report.id, report.farmer_id, paymentAmount)}
              disabled={isProcessing}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Collect & Pay'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}