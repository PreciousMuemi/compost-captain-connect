import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { MpesaPaymentModal } from "@/components/MpesaPaymentModal";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, TrendingUp, Package, Clock, ShoppingCart, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (profile?.id) {
      fetchFarmerData();
    }
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
        .in('status', ['confirmed', 'delivered']);

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

      // Set default products (inventory table doesn't exist yet)
      setProducts([
        {
          id: 'processed_manure',
          name: 'Processed Organic Manure',
          price_per_kg: 50,
          available_kg: 100,
          description: 'High-quality processed organic manure perfect for farming'
        },
        {
          id: 'pellets',
          name: 'Organic Fertilizer Pellets',
          price_per_kg: 80,
          available_kg: 50,
          description: 'Premium organic fertilizer pellets for enhanced crop yield'
        }
      ]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <FarmerSidebar>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome, {profile?.full_name}</h1>
            <p className="text-muted-foreground">Farmer Dashboard</p>
          </div>
          <Button onClick={() => navigate('/farmer/waste-reports')}>
            <Plus className="h-4 w-4 mr-2" />
            Report Waste
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            title="Total Earnings"
            value={`KES ${stats.totalEarnings.toLocaleString()}`}
            icon={TrendingUp}
            description="From waste sales"
          />
          <StatCard
            title="Product Orders"
            value={stats.totalOrders}
            icon={ShoppingCart}
            description="Orders placed"
          />
          <StatCard
            title="Total Spent"
            value={`KES ${stats.totalSpent.toLocaleString()}`}
            icon={Package}
            description="On products"
          />
        </div>

        {/* Available Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Buy Organic Products
            </CardTitle>
            <CardDescription>Purchase processed manure and fertilizer pellets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold">KES {product.price_per_kg}/kg</p>
                      <p className="text-sm text-muted-foreground">
                        {product.available_kg} kg available
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleBuyProduct(product)}
                      disabled={product.available_kg === 0}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              <Button variant="outline" onClick={() => navigate('/farmer/waste-reports')}>
                <Plus className="h-4 w-4 mr-2" />
                Report New Waste
              </Button>
              <Button variant="outline" onClick={() => navigate('/farmer/waste-reports')}>
                <Clock className="h-4 w-4 mr-2" />
                Check Status
              </Button>
              <Button variant="outline" onClick={() => navigate('/farmer/payments')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </FarmerSidebar>
  );
}
