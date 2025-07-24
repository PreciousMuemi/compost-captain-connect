import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle, AlertCircle, TrendingUp, ShoppingCart } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: Array<{
    quantity: number;
    products: {
      name: string;
    };
  }>;
}

export default function FarmerPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalSpent: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchPaymentData();
    }
  }, [profile?.id]);

  const fetchPaymentData = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Fetch payments for this farmer
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false });

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }

      // Get customer record for this farmer to fetch orders
      const { data: customerRecord } = await supabase
        .from("customers")
        .select("id")
        .eq("phone_number", profile.phone_number)
        .maybeSingle();

      let ordersData = [];
      if (customerRecord) {
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            total_amount,
            status,
            created_at,
            order_items (
              quantity,
              products (
                name
              )
            )
          `)
          .eq("customer_id", customerRecord.id)
          .order("created_at", { ascending: false });

        if (ordersError) {
          console.error("Error fetching orders:", ordersError);
        } else {
          ordersData = orders || [];
        }
      }

      const payments = paymentsData || [];
      const orders = ordersData || [];

      // Calculate stats
      const totalEarnings = payments
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalSpent = orders
        .filter(o => o.status === "confirmed" || o.status === "delivered")
        .reduce((sum, o) => sum + o.total_amount, 0);

      const pendingPayments = payments.filter(p => p.status === "pending").length;
      const completedPayments = payments.filter(p => p.status === "completed").length;

      setStats({
        totalEarnings,
        totalSpent,
        pendingPayments,
        completedPayments,
      });

      setPayments(payments);
      setOrders(orders);
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "confirmed": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <ShoppingCart className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">KES {stats.totalEarnings.toLocaleString()}</p>
                <p className="text-sm text-green-600/70 dark:text-green-400/70">Total Earnings</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">KES {stats.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Total Spent</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingPayments}</p>
                <p className="text-sm text-yellow-600/70 dark:text-yellow-400/70">Pending Payments</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedPayments}</p>
                <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Completed Payments</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No payments found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <h3 className="font-semibold text-foreground">{payment.payment_type.replace('_', ' ')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">KES {payment.amount.toLocaleString()}</p>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getOrderStatusIcon(order.status)}
                        <div>
                          <h3 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.order_items && order.order_items.length > 0 ? (
                              order.order_items.map((item, index) => (
                                <span key={index}>
                                  {item.products?.name || "Unknown Product"} ({item.quantity}kg)
                                  {index < order.order_items.length - 1 ? ", " : ""}
                                </span>
                              ))
                            ) : (
                              "No product details"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">KES {order.total_amount.toLocaleString()}</p>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
