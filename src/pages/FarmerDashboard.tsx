import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { MpesaPaymentModal } from "@/components/MpesaPaymentModal";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, TrendingUp, Package, Clock, ShoppingCart, Leaf, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FarmerSidebar } from "@/components/FarmerSidebar";
import { WasteReportForm } from "@/components/WasteReportForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FarmerStats {
  totalReports: number;
  totalEarnings: number;
  pendingReports: number;
  completedReports: number;
  totalOrders: number;
  totalSpent: number;
}

interface WasteReport {
  id: string;
  waste_type: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  location: string;
}

interface Product {
  id: string;
  name: string;
  price_per_kg: number;
  available_kg: number;
  description: string;
}

export default function FarmerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<FarmerStats>({
    totalReports: 0,
    totalEarnings: 0,
    pendingReports: 0,
    completedReports: 0,
    totalOrders: 0,
    totalSpent: 0,
  });
  const [recentReports, setRecentReports] = useState<WasteReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchFarmerData();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        if (payload.new.user_id === profile.id) {
          toast({
            title: "Notification",
            description: payload.new.message,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const fetchFarmerData = async () => {
    try {
      // Fetch waste reports for this farmer only
      const { data: reports } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('farmer_id', profile?.id)
        .order('created_at', { ascending: false });

      // Fetch payments to this farmer (waste purchases)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('farmer_id', profile?.id)
        .eq('status', 'completed');

      // Get customer record for this farmer (to check orders as buyer)
      const { data: customerRecord } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', profile?.phone_number)
        .maybeSingle();

      // Fetch orders by this farmer (as customer/buyer)
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('customer_id', customerRecord?.id || '')
        .in('status', ['pending', 'confirmed', 'delivered']);

      if (reports) {
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.status === 'reported' || r.status === 'scheduled').length;
        const completedReports = reports.filter(r => r.status === 'collected').length;
        
        setStats({
          totalReports,
          pendingReports,
          completedReports,
          totalEarnings: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
          totalOrders: orders?.length || 0,
          totalSpent: orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
        });
        
        setRecentReports(reports.slice(0, 5));
      }

      // Fetch products from Supabase
      const { data: productsFromDb, error: productsError } = await supabase
        .from('products')
        .select('*');
      if (!productsError && productsFromDb) {
        setProducts(
          productsFromDb.map((p) => ({
            ...p,
            id: String(p.id), // convert id to string
            price_per_kg: p.price,
            available_kg: 100
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching farmer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowPaymentModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reported': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'collected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
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
    <>
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="text-muted-foreground mt-2">Here's what's happening with your farm today</p>
          </div>
        <Button 
          onClick={() => setIsReportModalOpen(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg w-full sm:w-auto"
        >
            <Plus className="h-4 w-4 mr-2" />
            Report Waste
          </Button>
        </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalReports}</p>
                <p className="text-xs sm:text-sm text-blue-600/70 dark:text-blue-400/70">Total Reports</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingReports}</p>
                <p className="text-xs sm:text-sm text-yellow-600/70 dark:text-yellow-400/70">Pending Pickup</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">KES {stats.totalEarnings.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-green-600/70 dark:text-green-400/70">Total Earnings</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalOrders}</p>
                <p className="text-xs sm:text-sm text-purple-600/70 dark:text-purple-400/70">Product Orders</p>
              </div>
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">KES {stats.totalSpent.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-orange-600/70 dark:text-orange-400/70">Potential Spending</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedReports}</p>
                <p className="text-xs sm:text-sm text-emerald-600/70 dark:text-emerald-400/70">Completed</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        </div>

      {/* Modern Product Section */}
      <Card className="mb-8">
          <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Leaf className="h-6 w-6 text-green-600" />
              Buy Organic Products
            </CardTitle>
          <CardDescription className="text-lg">Premium quality manure and fertilizer for your farm</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((product) => (
              <Card key={product.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-200 dark:hover:border-green-800">
                <CardContent className="p-6">
                  <div className="space-y-4">
                  <div>
                      <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
                      <p className="text-muted-foreground mt-2">{product.description}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                        <p className="text-2xl font-bold text-green-600">KES {product.price_per_kg ? product.price_per_kg : 0}/kg</p>
                      <p className="text-sm text-muted-foreground">
                        {product.available_kg} kg available
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleBuyProduct(product)}
                      disabled={product.available_kg === 0}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </div>
                </CardContent>
              </Card>
              ))}
            </div>
          </CardContent>
        </Card>

      {/* Modern Recent Reports */}
        <Card>
          <CardHeader>
          <CardTitle className="text-2xl">Recent Waste Reports</CardTitle>
          <CardDescription>Your latest waste collection activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReports.length > 0 ? (
              <div className="space-y-4">
                {recentReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(report.status)}
                        <div>
                          <h3 className="font-semibold text-foreground capitalize">{report.waste_type.replace('_', ' ')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {report.quantity_kg}kg • {report.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      {report.status}
                    </Badge>
                  </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No waste reports yet. Start by reporting your first waste!</p>
            </div>
            )}
          </CardContent>
        </Card>

      {/* Product Purchase Modal */}
      <MpesaPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => {
          toast({
            title: "Order Placed",
            description: "Your product order has been placed successfully!",
          });
          fetchFarmerData(); // Refresh data
        }}
      />

      {/* Waste Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md">
          <WasteReportForm onSuccess={() => setIsReportModalOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Ticket List */}
      <TicketList />
    </>
  );
}

export function TicketList() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      supabase.from("tickets").select("*").eq("user_id", profile.id).then(({ data }) => setTickets(data || []));
    }
  }, [profile]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-2xl">My Support Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tickets found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <Card key={ticket.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="text-foreground font-medium">{ticket.subject}</div>
                    <div className="text-foreground">{ticket.message}</div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
