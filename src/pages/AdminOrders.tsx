import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Truck, 
  DollarSign,
  Search,
  Filter,
  Plus,
  Eye,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TrackingTimeline } from "@/components/TrackingTimeline";

interface Order {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  assigned_rider?: string;
  customers?: {
    name: string;
    phone_number: string;
    location: string;
  };
  riders?: {
    name: string;
    phone_number: string;
  };
  order_items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('orders')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order update:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          customers(name, phone_number, location),
          riders(name, phone_number),
          order_items(product_name, quantity, price)
        `)
        .order("created_at", { ascending: false });
      setOrders(ordersData || []);
      
      const { data: ridersData } = await supabase.from("riders").select("*");
      setRiders(ridersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Get order details for notification
      const { data: order } = await supabase
        .from("orders")
        .select("customer_id, total_amount, customers(name, phone_number), delivery_address")
        .eq("id", orderId)
        .single();

      if (order) {
        // Send notification to customer
        await supabase.from("notifications").insert({
          recipient_id: order.customer_id,
          type: "order_status",
          title: "Order Status Updated",
          message: `Your order for KES ${order.total_amount} has been ${newStatus.replace('_', ' ')}.`,
          related_entity_id: orderId
        });

        // If order is delivered, also notify any associated farmer
        if (newStatus === 'delivered') {
          // Find if there's a farmer associated with this order
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("product_id")
            .eq("order_id", orderId);

          if (orderItems && orderItems.length > 0) {
            // Notify farmers about successful delivery
            const { data: farmers } = await supabase
              .from("profiles")
              .select("id")
              .eq("role", "farmer");

            if (farmers) {
              for (const farmer of farmers) {
                await supabase.from("notifications").insert({
                  recipient_id: farmer.id,
                  type: "delivery_success",
                  title: "Order Delivered Successfully",
                  message: `An order has been successfully delivered to ${order.customers?.name}.`,
                  related_entity_id: orderId
                });
              }
            }
          }
        }

        toast({
          title: "Order Updated",
          description: `Order status updated to ${newStatus}`,
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          assigned_rider: riderId,
          status: "confirmed",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Get order and rider details for notification
      const { data: order } = await supabase
        .from("orders")
        .select("customer_id, total_amount, customers(name, phone_number)")
        .eq("id", orderId)
        .single();

      const { data: rider } = await supabase
        .from("riders")
        .select("name, phone_number")
        .eq("id", riderId)
        .single();

      if (order && rider) {
        // Send notification to customer
        await supabase.from("notifications").insert({
          recipient_id: order.customer_id,
          type: "rider_assigned",
          title: "Rider Assigned",
          message: `Rider ${rider.name} (${rider.phone_number}) has been assigned to your order. They will contact you soon.`,
          related_entity_id: orderId
        });

        toast({
          title: "Rider Assigned",
          description: "Customer has been notified of rider assignment",
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error assigning rider:', error);
      toast({
        title: "Error",
        description: "Failed to assign rider",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    const customerName = order.customers?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage customer orders and track deliveries</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filters */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Filter className="h-5 w-5 text-blue-600" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer name or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="glassmorphism border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Order #{order.id.slice(-8)}
                          </h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(order.total_amount)} • {order.delivery_address}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{order.customers?.name} ({order.customers?.phone_number})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{order.delivery_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {order.riders && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Assigned Rider:</span>
                          <span>{order.riders.name} ({order.riders.phone_number})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(riderId) => assignRiderToOrder(order.id, riderId)}
                          defaultValue=""
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Assign Rider" />
                          </SelectTrigger>
                          <SelectContent>
                            {riders.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <Button 
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Start Delivery
                      </Button>
                    )}
                    
                    {order.status === 'out_for_delivery' && (
                      <Button 
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Delivered
                      </Button>
                    )}
                    
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowTracking(true);
                        }}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Order Details #{selectedOrder.id.slice(-8)}</h2>
                <Button variant="outline" onClick={() => setShowOrderDetails(false)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Customer Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder.customers?.name}<br/>
                      {selectedOrder.customers?.phone_number}<br/>
                      {selectedOrder.delivery_address}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Order Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total: {formatCurrency(selectedOrder.total_amount)}<br/>
                      Status: {selectedOrder.status}<br/>
                      Date: {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Order Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm">{item.product_name}</span>
                          <span className="text-sm">{item.quantity} x {formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTracking && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tracking Order #{selectedOrder.id.slice(-8)}</h2>
                <Button variant="outline" onClick={() => setShowTracking(false)}>
                  Close
                </Button>
              </div>
              <TrackingTimeline 
                entityId={selectedOrder.id} 
                entityType="order" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 