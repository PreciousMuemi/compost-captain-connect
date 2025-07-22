import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FarmerSidebar } from "@/components/FarmerSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Package,
  Download,
  Eye
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  mpesa_transaction_id?: string;
  order_id?: string;
}

interface PaymentStats {
  totalEarnings: number;
  pendingPayments: number;
  completedPayments: number;
  thisMonthEarnings: number;
}

export default function FarmerPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    thisMonthEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, [profile]);

  const fetchPayments = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const paymentsData = data || [];
      setPayments(paymentsData);

      // Calculate stats
      const totalEarnings = paymentsData
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingPayments = paymentsData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      const completedPayments = paymentsData
        .filter(p => p.status === 'completed').length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthEarnings = paymentsData
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          return p.status === 'completed' && 
                 paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalEarnings,
        pendingPayments,
        completedPayments,
        thisMonthEarnings
      });

    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportPayments = () => {
    // Simple CSV export
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Amount,Type,Status,Transaction ID\n" +
      payments.map(p => 
        `${new Date(p.created_at).toLocaleDateString()},${p.amount},${p.payment_type},${p.status},${p.mpesa_transaction_id || 'N/A'}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payments_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <FarmerSidebar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </FarmerSidebar>
    );
  }

  return (
    <FarmerSidebar>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments & Earnings</h1>
            <p className="text-muted-foreground">Track your payments and earnings from waste sales</p>
          </div>
          <Button onClick={exportPayments} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">KES {stats.totalEarnings.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">KES {stats.pendingPayments.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Payments</p>
                  <p className="text-2xl font-bold">{stats.completedPayments}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">KES {stats.thisMonthEarnings.toLocaleString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              View all your payment transactions and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">
                            KES {payment.amount.toLocaleString()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {payment.payment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {payment.mpesa_transaction_id && (
                      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span>M-Pesa Transaction ID:</span>
                        <span className="font-mono">{payment.mpesa_transaction_id}</span>
                      </div>
                    )}
                    
                    {payment.order_id && (
                      <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                        <span>Order ID:</span>
                        <span className="font-mono">#{payment.order_id.slice(-8)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
                <p className="text-gray-600 mb-4">
                  Payments will appear here once you start selling waste or purchasing products
                </p>
                <Button onClick={() => window.location.href = '/farmer'}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Available payment methods for receiving earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">MP</span>
                  </div>
                  <h3 className="font-medium">M-Pesa</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Receive payments directly to your M-Pesa account
                </p>
                <p className="text-xs text-green-600 font-medium">
                  ✓ Instant transfers • ✓ No fees
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-medium">Bank Transfer</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Transfer earnings to your bank account
                </p>
                <p className="text-xs text-gray-500">
                  Available for large amounts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmerSidebar>
  );
}
