import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
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
  Settings,
  MessageSquare,
  Zap,
  Target,
  Shield,
  Activity,
  Users,
  FileText,
  Eye
} from "lucide-react";
import { io } from "socket.io-client";

interface Order {
  id: string;
  customer_id: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  assigned_rider?: string;
  delivery_address?: string;
  created_at: string;
  customer?: {
    name: string;
    phone_number: string;
    location: string;
  };
}

interface WasteReport {
  id: string;
  farmer_id: string;
  waste_type: string;
  quantity_kg: number;
  status: 'reported' | 'scheduled' | 'collected' | 'processed';
  location: string;
  created_at: string;
  assigned_driver_id?: string;
  rider_id?: string;
  farmer?: {
    full_name: string;
    phone_number: string;
  };
  rider?: {
    name: string;
    phone_number: string;
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
  type: 'low_stock' | 'failed_delivery' | 'rider_issue' | 'general' | 'admin_task';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface AdminTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  created_at: string;
  due_date?: string;
}

// Initialize socket connection
const socket = io("http://localhost:4000", {
  autoConnect: false
});

export default function DispatchDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  
  // Filter states
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [wasteFilter, setWasteFilter] = useState<string>("all");
  const [riderFilter, setRiderFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'orders' | 'waste' | 'riders' | 'inventory' | 'tasks'>('orders');

  useEffect(() => {
    // Connect to socket
    socket.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to dispatch server');
      
      // Authenticate as dispatch
      socket.emit('authenticate', {
        role: 'dispatch',
        name: profile?.full_name || 'Dispatch User'
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from dispatch server');
    });

    // Listen for real-time updates
    socket.on('orderUpdate', (data) => {
      console.log('Real-time order update:', data);
      fetchDispatchData();
      toast({
        title: "Order Update",
        description: `Order status changed to ${data.status}`,
      });
    });

    socket.on('wasteUpdate', (data) => {
      console.log('Real-time waste update:', data);
      fetchWasteReports();
      toast({
        title: "Waste Report Update",
        description: `Waste report status changed to ${data.status}`,
      });
    });

    socket.on('riderUpdate', (data) => {
      console.log('Real-time rider update:', data);
      fetchRiders();
      toast({
        title: "Rider Update",
        description: `${data.riderName} status changed to ${data.status}`,
      });
    });

    socket.on('adminTask', (data) => {
      console.log('New admin task:', data);
      setAdminTasks(prev => [data, ...prev]);
      toast({
        title: "New Admin Task",
        description: data.title,
      });
    });

    socket.on('wasteCollected', (data) => {
      console.log('Waste collected notification:', data);
      toast({
        title: "Waste Collection Completed",
        description: "Ready for payment processing",
      });
    });

    fetchDispatchData();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const notificationSubscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        console.log('Notification update:', payload);
        fetchNotifications();
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        console.log('Order update:', payload);
        fetchOrders();
      })
      .subscribe();

    const wasteReportsSubscription = supabase
      .channel('public:waste_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_reports' }, payload => {
        console.log('Waste report update:', payload);
        fetchWasteReports();
      })
      .subscribe();

    const ridersSubscription = supabase
      .channel('public:riders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, payload => {
        console.log('Rider update:', payload);
        fetchRiders();
      })
      .subscribe();

    const adminTasksSubscription = supabase
      .channel('public:admin_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, payload => {
        console.log('Admin task update:', payload);
        fetchAdminTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(wasteReportsSubscription);
      supabase.removeChannel(ridersSubscription);
      supabase.removeChannel(adminTasksSubscription);
    };
  }, []);

  const fetchDispatchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchWasteReports(),
        fetchRiders(),
        fetchInventory(),
        fetchNotifications(),
        fetchAdminTasks()
      ]);
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

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone_number, location)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }
      
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchWasteReports = async () => {
    try {
      const { data: wasteData, error } = await supabase
        .from('waste_reports')
        .select(`
          *,
          farmer:profiles(full_name, phone_number),
          rider:riders(name, phone_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching waste reports:', error);
        return;
      }
      
      setWasteReports(wasteData || []);
    } catch (error) {
      console.error('Error fetching waste reports:', error);
    }
  };

  const fetchRiders = async () => {
    try {
      const { data: ridersData, error } = await supabase.from("riders").select("*");
      
      if (error) {
        console.error('Error fetching riders:', error);
        return;
      }
      
      setRiders(
        (ridersData || []).map(r => ({
          ...r,
          status: (["available", "busy", "offline"].includes(r.status) ? r.status : "available") as Rider["status"]
        }))
      );
    } catch (error) {
      console.error('Error fetching riders:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data: inventoryData, error } = await supabase.from('inventory').select('*');
      
      if (error) {
        console.error('Error fetching inventory:', error);
        return;
      }
      
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
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: notificationsData, error } = await supabase.from('notifications').select('*');
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }
      
      setNotifications(
        (notificationsData || []).map((n: any) => ({
          ...n,
          type: (["low_stock", "failed_delivery", "rider_issue", "general", "admin_task"] as NotificationItem["type"][]).includes(n.type) ? n.type : "general"
        }))
      );
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchAdminTasks = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching admin tasks:', error);
        return;
      }
      
      setAdminTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching admin tasks:', error);
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

      // Emit real-time update
      socket.emit('orderAssigned', { orderId, riderId });

      toast({
        title: "Success",
        description: "Rider assigned successfully",
      });
      
      fetchOrders();
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
          rider_id: riderId,
          status: 'scheduled'
        })
        .eq('id', reportId);

      if (error) throw error;

      // Emit real-time update
      socket.emit('wasteAssigned', { reportId, riderId });

      toast({
        title: "Success",
        description: "Rider assigned to waste pickup",
      });
      
      fetchWasteReports();
    } catch (error) {
      console.error('Error assigning rider to waste report:', error);
      toast({
        title: "Error",
        description: "Failed to assign rider",
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

      // Emit real-time update
      socket.emit('orderStatusUpdate', { orderId, status: newStatus });

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const updateWasteReportStatus = async (reportId: string, newStatus: 'reported' | 'scheduled' | 'collected' | 'processed') => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          status: newStatus,
          pickup_completed_at: newStatus === 'collected' ? new Date().toISOString() : null
        })
        .eq('id', reportId);

      if (error) throw error;

      // Emit real-time update
      socket.emit('wasteStatusUpdate', { reportId, status: newStatus });

      // If collected, notify admin for payment
      if (newStatus === 'collected') {
        const report = wasteReports.find(r => r.id === reportId);
        if (report) {
          await supabase.from('notifications').insert({
            type: 'admin_task',
            title: 'Waste Collection Completed',
            message: `Waste collection completed for ${report.farmer?.full_name}. Ready for payment processing.`,
            related_entity_id: reportId
          });
        }
      }

      toast({
        title: "Success",
        description: "Waste report status updated successfully",
      });
      
      fetchWasteReports();
    } catch (error) {
      console.error('Error updating waste report status:', error);
      toast({
        title: "Error",
        description: "Failed to update waste report status",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Emit real-time update
      socket.emit('taskStatusUpdate', { taskId, status: newStatus });

      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      
      fetchAdminTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'reported': return 'bg-orange-100 text-orange-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'collected': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-indigo-100 text-indigo-800';
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'all') return true;
    return order.status === orderFilter;
  });

  const filteredWasteReports = wasteReports.filter(report => {
    if (wasteFilter === 'all') return true;
    return report.status === wasteFilter;
  });

  const filteredRiders = riders.filter(rider => {
    if (riderFilter === 'all') return true;
    return rider.status === riderFilter;
  });

  const filteredTasks = adminTasks.filter(task => {
    if (taskFilter === 'all') return true;
    return task.status === taskFilter;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const deliveredToday = orders.filter(o => o.status === 'delivered' && 
    new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const pendingWasteReports = wasteReports.filter(w => w.status === 'reported').length;
  const scheduledWasteReports = wasteReports.filter(w => w.status === 'scheduled').length;
  const collectedWasteReports = wasteReports.filter(w => w.status === 'collected').length;

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const lowStockItems = inventory.filter(item => item.stock_quantity <= item.low_stock_threshold).length;
  const pendingTasks = adminTasks.filter(t => t.status === 'pending').length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dispatch Control Center</h1>
          <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Real-time Connected' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={fetchDispatchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Logout
          </Button>
          <div className="relative">
            <Button variant="outline" className="relative">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Clock}
          description="Awaiting assignment"
        />
        <StatCard
          title="Waste Pickups"
          value={pendingWasteReports}
          icon={Recycle}
          description="Awaiting pickup"
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
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800 font-medium">
                {lowStockItems} item(s) are low in stock and need restocking
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingTasks > 0 && (
        <Card className="border-blue-200 bg-blue-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {pendingTasks} admin task(s) require attention
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('orders')}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Orders ({orders.length})
        </Button>
        <Button
          variant={activeTab === 'waste' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('waste')}
          className="flex items-center gap-2"
        >
          <Recycle className="h-4 w-4" />
          Waste Reports ({wasteReports.length})
        </Button>
        <Button
          variant={activeTab === 'riders' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('riders')}
          className="flex items-center gap-2"
        >
          <Truck className="h-4 w-4" />
          Riders ({riders.length})
        </Button>
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('inventory')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Inventory ({inventory.length})
        </Button>
        <Button
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tasks')}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          Admin Tasks ({adminTasks.length})
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders Management
                </CardTitle>
                <CardDescription>Manage order assignments and delivery status</CardDescription>
              </div>
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-[150px]">
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
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">Order #{order.id.slice(-6)}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.quantity_kg} kg • KES {order.total_amount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{order.delivery_address || 'No address'}</span>
                      </div>
                      {order.customer && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
                    <div className="flex flex-col gap-2 ml-4">
                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <Select 
                            value={selectedRider} 
                            onValueChange={setSelectedRider}
                          >
                            <SelectTrigger className="w-[120px] text-xs">
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
                          >
                            Assign
                          </Button>
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Delivered
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
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
      )}

      {activeTab === 'waste' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5" />
                  Waste Pickup Management
                </CardTitle>
                <CardDescription>Manage waste collection and pickup assignments</CardDescription>
              </div>
              <Select value={wasteFilter} onValueChange={setWasteFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter reports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredWasteReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">Waste Report #{report.id.slice(-6)}</h3>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {report.waste_type.replace('_', ' ')} • {report.quantity_kg} kg
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{report.location}</span>
                      </div>
                      {report.farmer && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
                    <div className="flex flex-col gap-2 ml-4">
                      {report.status === 'reported' && (
                        <div className="flex gap-2">
                          <Select 
                            value={selectedRider} 
                            onValueChange={setSelectedRider}
                          >
                            <SelectTrigger className="w-[120px] text-xs">
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
                          >
                            Assign
                          </Button>
                        </div>
                      )}
                      {report.status === 'scheduled' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateWasteReportStatus(report.id, 'collected')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Collected
                          </Button>
                        </div>
                      )}
                      {report.status === 'collected' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateWasteReportStatus(report.id, 'processed')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Processed
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredWasteReports.length === 0 && (
                <p className="text-center text-gray-500 py-8">No waste reports found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'riders' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Riders Management
                </CardTitle>
                <CardDescription>Monitor rider status and performance</CardDescription>
              </div>
              <Select value={riderFilter} onValueChange={setRiderFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter riders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Riders</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredRiders.map((rider) => (
                <div key={rider.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{rider.name}</h3>
                        <Badge className={getRiderStatusColor(rider.status)}>
                          {rider.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {rider.vehicle_type} • {rider.phone_number}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Current Orders: {rider.current_orders}</span>
                        <span>Total Deliveries: {rider.total_deliveries}</span>
                        <span>Success Rate: {rider.success_rate}%</span>
                      </div>
                      {rider.last_location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{rider.last_location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredRiders.length === 0 && (
                <p className="text-center text-gray-500 py-8">No riders found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Inventory Management
            </CardTitle>
            <CardDescription>Monitor stock levels and manage inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      Stock: {item.stock_quantity} {item.unit} • 
                      Last restocked: {new Date(item.last_restocked).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">KES {item.price_per_unit}/{item.unit}</p>
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
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Admin Tasks
              </CardTitle>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {task.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <p className="text-center text-gray-500 py-8">No tasks found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
