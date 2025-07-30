import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { DispatchMap } from "@/components/DispatchMap";
import { useToast } from "@/hooks/use-toast";
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Calendar,
  BarChart3,
  Navigation,
  Recycle,
  Settings
} from "lucide-react";
import { io } from "socket.io-client";
import type { Database } from "@/types/supabase";
type RiderRow = Database["public"]["Tables"]["riders"]["Row"];

interface Order {
  id: string;
  customer_id: string;
  farmer_id: string | null;
  price_per_kg: number;
  quantity_kg: number;
  total_amount: number;
  delivery_date: string | null;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  assigned_rider?: string;
  delivery_address?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    phone_number: string;
    location: string;
  };
}

interface Rider {
  id: string;
  name: string;
  phone_number: string;
  vehicle_type: string;
  status: 'available' | 'busy' | 'offline';
  current_orders: number;
  total_deliveries: number;
  success_rate: number;
  last_location?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  last_restocked: string;
  price_per_unit: number;
}

interface NotificationItem {
  id: string;
  type: 'low_stock' | 'failed_delivery' | 'rider_issue' | 'general';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface WasteReport {
  id: string;
  farmer_id: string;
  waste_type: string;
  quantity_kg: number;
  location: string;
  status: string;
  created_at: string;
  farmer?: {
    full_name: string;
    phone_number: string;
    location: string;
  };
}

interface ProcessingBatch {
  id: string;
  batch_number: string;
  waste_report_ids: string[];
  total_input_weight: number;
  total_output_weight: number;
  status: string;
  qr_code: string;
  created_at: string;
  waste_reports?: WasteReport[];
}

// const socket = io("http://localhost:4000"); // Use your server URL
// Temporarily disabled socket.io connection until server is set up
const socket = null;

export default function DispatchDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [processingBatches, setProcessingBatches] = useState<ProcessingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>("");
  
  // Filter states
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [riderFilter, setRiderFilter] = useState<string>("all");

  useEffect(() => {
    fetchDispatchData();
    // Listen for live delivery updates
    // socket.on("deliveryStatusUpdate", (data) => {
    //   // Update your state/UI with the new delivery status
    //   // Example: fetchDispatchData() or update a specific order in state
    //   console.log("Live delivery update:", data);
    //   // Optionally, show a toast or notification
    // });

    return () => {
      // socket.off("deliveryStatusUpdate");
    };
  }, []);

  useEffect(() => {
    const notificationSubscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        fetchDispatchData(); // or just update notifications state
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  const fetchDispatchData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with customer details
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone_number, location)
        `)
        .order('created_at', { ascending: false });

      // Fetch riders (mock data for now)
      const { data: ridersData } = await supabase.from("riders").select("*");
      setRiders(
        (ridersData || []).map(r => ({
          ...r,
          status: (["available", "busy", "offline"].includes(r.status) ? r.status : "available") as Rider["status"]
        }))
      );

      // Fetch inventory (mock data for now)
      const { data: inventoryData } = await supabase.from('inventory').select('*');
      setInventory(
        (inventoryData || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          stock_quantity: item.stock_quantity,
          low_stock_threshold: item.low_stock_threshold,
          unit: item.unit,
          last_restocked: item.last_restocked,
          price_per_unit: item.price_per_unit,
        }))
      );

      // Generate notifications based on data
      const { data: notificationsData } = await supabase.from('notifications').select('*');
      setNotifications(
        (notificationsData || []).map((n: any) => ({
          ...n,
          type: (["low_stock", "failed_delivery", "rider_issue", "general"] as NotificationItem["type"][]).includes(n.type) ? n.type : "general"
        }))
      );

      // Fetch waste reports for pickup assignment
      const { data: wasteReportsData } = await supabase
        .from('waste_reports')
        .select(`
          *,
          farmer:profiles(full_name, phone_number, location)
        `)
        .eq('status', 'reported')
        .order('created_at', { ascending: false });

      // Fetch processing batches
      const { data: processingBatchesData } = await supabase
        .from('processing_batches')
        .select(`
          *,
          waste_reports (
            id,
            waste_type,
            quantity_kg,
            location,
            farmer:profiles(full_name, phone_number)
          )
        `)
        .order('created_at', { ascending: false });

      setWasteReports(wasteReportsData || []);
      setProcessingBatches(processingBatchesData || []);
      
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_rider: riderId,
          status: 'confirmed'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Get order details for notification
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, total_amount, customers(name, phone_number)')
        .eq('id', orderId)
        .single();

      const { data: rider } = await supabase
        .from('riders')
        .select('name, phone_number')
        .eq('id', riderId)
        .single();

      if (order && rider) {
        // Send notification to customer
        await supabase.from('notifications').insert({
          recipient_id: order.customer_id,
          type: 'rider_assigned',
          title: 'Rider Assigned to Your Order',
          message: `Rider ${rider.name} (${rider.phone_number}) has been assigned to your order. They will contact you soon.`,
          related_entity_id: orderId
        });

        // Also notify any associated farmers
        const { data: farmers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'farmer');

        if (farmers) {
          for (const farmer of farmers) {
            await supabase.from('notifications').insert({
              recipient_id: farmer.id,
              type: 'order_update',
              title: 'New Order Assigned',
              message: `A new order has been assigned to rider ${rider.name}.`,
              related_entity_id: orderId
            });
          }
        }
      }

      toast({
        title: "Success",
        description: "Rider assigned successfully",
      });
      
      fetchDispatchData();
    } catch (error) {
      console.error('Error assigning rider:', error);
      toast({
        title: "Error",
        description: "Failed to assign rider",
        variant: "destructive",
      });
    }
  };

  const assignRiderToWasteReport = async (reportId: string, riderId: string) => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          assigned_driver_id: riderId,
          status: 'scheduled'
        })
        .eq('id', reportId);

      if (error) throw error;

      // Get report details for notification
      const { data: report } = await supabase
        .from('waste_reports')
        .select('farmer_id, waste_type, quantity_kg, profiles(full_name, phone_number)')
        .eq('id', reportId)
        .single();

      const { data: rider } = await supabase
        .from('riders')
        .select('name, phone_number')
        .eq('id', riderId)
        .single();

      if (report && rider) {
        // Send notification to farmer
        await supabase.from('notifications').insert({
          recipient_id: report.farmer_id,
          type: 'pickup_scheduled',
          title: 'Waste Pickup Scheduled',
          message: `Rider ${rider.name} (${rider.phone_number}) will collect your ${report.quantity_kg}kg of ${report.waste_type} today.`,
          related_entity_id: reportId
        });

        toast({
          title: "Success",
          description: `Rider assigned to waste pickup. Farmer ${report.profiles?.full_name} will be notified.`,
        });
      }
      
      fetchDispatchData();
    } catch (error) {
      console.error('Error assigning rider to waste report:', error);
      toast({
        title: "Error",
        description: "Failed to assign rider to waste pickup",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Get order details for notification
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, total_amount, customers(name, phone_number)')
        .eq('id', orderId)
        .single();

      if (order) {
        // Send notification to customer
        await supabase.from('notifications').insert({
          recipient_id: order.customer_id,
          type: 'order_status',
          title: 'Order Status Updated',
          message: `Your order status has been updated to ${newStatus.replace('_', ' ')}.`,
          related_entity_id: orderId
        });

        // If delivered, notify farmers about successful delivery
        if (newStatus === 'delivered') {
          const { data: farmers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'farmer');

          if (farmers) {
            for (const farmer of farmers) {
              await supabase.from('notifications').insert({
                recipient_id: farmer.id,
                type: 'delivery_success',
                title: 'Order Delivered Successfully',
              //  message: `An order has been successfully delivered to ${order.customers?.name}.`,
                related_entity_id: orderId
              });
            }
          }
        }
      }

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      
      fetchDispatchData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiderStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-orange-100 text-orange-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'all') return true;
    return order.status === orderFilter;
  });

  const filteredRiders = riders.filter(rider => {
    if (riderFilter === 'all') return true;
    return rider.status === riderFilter;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const deliveredToday = orders.filter(o => o.status === 'delivered' && 
    new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const lowStockItems = inventory.filter(item => item.stock_quantity <= item.low_stock_threshold).length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dispatch Control Center</h1>
          <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchDispatchData} size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </Button>
          <div className="relative">
            <Button variant="outline" className="relative" size="sm">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Clock}
          description="Awaiting assignment"
        />
        <StatCard
          title="Confirmed Orders"
          value={confirmedOrders}
          icon={Truck}
          description="Ready for delivery"
        />
        <StatCard
          title="Delivered Today"
          value={deliveredToday}
          icon={CheckCircle}
          description="Completed deliveries"
        />
        <StatCard
          title="Revenue (KES)"
          value={totalRevenue.toLocaleString()}
          icon={DollarSign}
          description="From delivered orders"
        />
      </div>

      {/* Alert Banners */}
      {lowStockItems > 0 && (
        <Card className="border-orange-200 bg-orange-50 mb-4">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              <span className="text-orange-800 font-medium text-sm sm:text-base">
                {lowStockItems} item(s) are low in stock and need restocking
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Layout: Center content only */}
      <div className="flex flex-col gap-4">
        {/* Main Dashboard Content */}
        <div className="flex-1 space-y-4">
          {/* Live Orders Panel */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-lg sm:text-xl">Live Orders Panel</span>
                  </CardTitle>
                  <CardDescription>Manage order assignments and delivery status</CardDescription>
                </div>
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-sm sm:text-base">Order #{order.id.slice(-6)}</h3>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Organic Products • {order.quantity_kg} kg • KES {order.total_amount.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">{order.delivery_address}</span>
                        </div>
                        {order.customer && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.customer.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.customer.phone_number}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {order.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Select 
                              value={selectedRider} 
                              onValueChange={setSelectedRider}
                            >
                              <SelectTrigger className="w-full sm:w-[120px] text-xs">
                                <SelectValue placeholder="Assign rider" />
                              </SelectTrigger>
                              <SelectContent>
                                {riders
                                  .filter(r => r.status === 'available')
                                  .map(rider => (
                                    <SelectItem key={rider.id} value={rider.id}>
                                      {rider.name}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              onClick={() => selectedRider && assignRiderToOrder(order.id, selectedRider)}
                              disabled={!selectedRider}
                              className="w-full sm:w-auto"
                            >
                              Assign
                            </Button>
                          </div>
                        )}
                        {order.status === 'confirmed' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="w-full sm:w-auto"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Delivered
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="w-full sm:w-auto"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No orders found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warehouse/Inventory Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-lg sm:text-xl">Warehouse Inventory</span>
              </CardTitle>
              <CardDescription>Real-time stock levels and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {inventory.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Stock: {item.stock_quantity} {item.unit} • 
                        Last restocked: {new Date(item.last_restocked).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <p className="font-medium text-sm sm:text-base">KES {item.price_per_unit}/{item.unit}</p>
                      {item.stock_quantity <= item.low_stock_threshold ? (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          In Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Map View */}
          <DispatchMap orders={orders} riders={riders} />
        </div>

        {/* Waste Pickup Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-lg sm:text-xl">Waste Pickup Management</span>
                </CardTitle>
                <CardDescription>Assign riders to collect waste from farmers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {wasteReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-sm sm:text-base">Waste Report #{report.id.slice(-6)}</h3>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {report.waste_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {report.quantity_kg} kg • {report.location}
                      </p>
                      {report.farmer && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {report.farmer.full_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {report.farmer.phone_number}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select 
                          value={selectedRider} 
                          onValueChange={setSelectedRider}
                        >
                          <SelectTrigger className="w-full sm:w-[120px] text-xs">
                            <SelectValue placeholder="Assign rider" />
                          </SelectTrigger>
                          <SelectContent>
                            {riders
                              .filter(r => r.status === 'available')
                              .map(rider => (
                                <SelectItem key={rider.id} value={rider.id}>
                                  {rider.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => selectedRider && assignRiderToWasteReport(report.id, selectedRider)}
                          disabled={!selectedRider}
                          className="w-full sm:w-auto"
                        >
                          Assign Pickup
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {wasteReports.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No waste reports pending pickup</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing Batches Overview */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-lg sm:text-xl">Processing Batches</span>
                </CardTitle>
                <CardDescription>Monitor waste processing and pellet production</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {processingBatches.map((batch) => (
                <div key={batch.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-sm sm:text-base">{batch.batch_number}</h3>
                        <Badge className={`${getStatusColor(batch.status)} text-xs`}>
                          {batch.status}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Input: {batch.total_input_weight} kg • Output: {batch.total_output_weight || 0} kg
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <QrCode className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{batch.qr_code}</span>
                      </div>
                      {batch.waste_reports && batch.waste_reports.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Contributing Farmers:</p>
                          <div className="flex flex-wrap gap-1">
                            {batch.waste_reports.map((report, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {report.farmer?.full_name || 'Unknown'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/processing`, '_blank')}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {processingBatches.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Factory className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No processing batches found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
