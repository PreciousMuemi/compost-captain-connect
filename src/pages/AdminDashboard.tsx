import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Calendar,
  BarChart3,
  Settings,
  MessageSquare,
  Target,
  Shield,
  Activity,
  Plus,
  Send,
  Eye
} from "lucide-react";
import { io } from "socket.io-client";

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

interface NotificationItem {
  id: string;
  type: 'low_stock' | 'failed_delivery' | 'rider_issue' | 'general' | 'admin_task';
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
  status: 'reported' | 'scheduled' | 'collected' | 'processed';
  location: string;
  created_at: string;
  farmer?: {
    full_name: string;
    phone_number: string;
  };
}

interface Order {
  id: string;
  customer_id: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  created_at: string;
  customer?: {
    name: string;
    phone_number: string;
  };
}

// Initialize socket connection
const socket = io("http://localhost:4000", {
  autoConnect: false
});

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Task creation state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: ''
  });
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    from: string;
    message: string;
    timestamp: string;
  }>>([]);
  
  // Filter states
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [notificationFilter, setNotificationFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notifications' | 'chat' | 'reports'>('overview');

  useEffect(() => {
    // Connect to socket
    socket.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to admin server');
      
      // Authenticate as admin
      socket.emit('authenticate', {
        role: 'admin',
        name: profile?.full_name || 'Admin User'
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from admin server');
    });

    // Listen for real-time updates
    socket.on('orderStatusChanged', (data) => {
      console.log('Order status changed:', data);
      fetchOrders();
      toast({
        title: "Order Update",
        description: `Order status changed to ${data.status}`,
      });
    });

    socket.on('orderAssigned', (data) => {
      console.log('Order assigned:', data);
      fetchOrders();
      toast({
        title: "Order Assigned",
        description: "New order has been assigned to a rider",
      });
    });

    socket.on('wasteCollected', (data) => {
      console.log('Waste collected:', data);
      fetchWasteReports();
      toast({
        title: "Waste Collection Completed",
        description: "Ready for payment processing",
      });
    });

    socket.on('wasteAssigned', (data) => {
      console.log('Waste assigned:', data);
      fetchWasteReports();
      toast({
        title: "Waste Pickup Assigned",
        description: "Waste pickup has been assigned to a rider",
      });
    });

    socket.on('taskStatusChanged', (data) => {
      console.log('Task status changed:', data);
      fetchAdminTasks();
      toast({
        title: "Task Update",
        description: `Task status changed to ${data.status} by ${data.updatedBy}`,
      });
    });

    socket.on('dispatchMessage', (data) => {
      console.log('Dispatch message:', data);
      setChatHistory(prev => [...prev, data]);
      toast({
        title: "New Message",
        description: `Message from ${data.from}`,
      });
    });

    fetchAdminData();

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

    const adminTasksSubscription = supabase
      .channel('public:admin_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, payload => {
        console.log('Admin task update:', payload);
        fetchAdminTasks();
      })
      .subscribe();

    const wasteReportsSubscription = supabase
      .channel('public:waste_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_reports' }, payload => {
        console.log('Waste report update:', payload);
        fetchWasteReports();
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        console.log('Order update:', payload);
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(adminTasksSubscription);
      supabase.removeChannel(wasteReportsSubscription);
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAdminTasks(),
        fetchNotifications(),
        fetchWasteReports(),
        fetchOrders()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const fetchWasteReports = async () => {
    try {
      const { data: wasteData, error } = await supabase
        .from('waste_reports')
        .select(`
          *,
          farmer:profiles(full_name, phone_number)
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

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone_number)
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

  const createAdminTask = async () => {
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date || null
        });

      if (error) throw error;

      // Emit real-time update
      socket.emit('createAdminTask', {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date
      });

      toast({
        title: "Success",
        description: "Admin task created successfully",
      });
      
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowTaskForm(false);
      fetchAdminTasks();
    } catch (error) {
      console.error('Error creating admin task:', error);
      toast({
        title: "Error",
        description: "Failed to create admin task",
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

  const sendMessageToDispatch = () => {
    if (!chatMessage.trim()) return;

    const messageData = {
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    // Emit message to dispatch
    socket.emit('adminMessage', messageData);

    // Add to local chat history
    setChatHistory(prev => [...prev, {
      from: profile?.full_name || 'Admin',
      message: chatMessage,
      timestamp: new Date().toISOString()
    }]);

    setChatMessage('');
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = adminTasks.filter(task => {
    if (taskFilter === 'all') return true;
    return task.status === taskFilter;
  });

  const filteredNotifications = notifications.filter(notification => {
    if (notificationFilter === 'all') return true;
    return notification.type === notificationFilter;
  });

  const pendingTasks = adminTasks.filter(t => t.status === 'pending').length;
  const completedTasks = adminTasks.filter(t => t.status === 'completed').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const pendingWasteReports = wasteReports.filter(w => w.status === 'reported').length;
  const collectedWasteReports = wasteReports.filter(w => w.status === 'collected').length;
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Control Center</h1>
          <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Real-time Connected' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={fetchAdminData}>
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
          title="Pending Tasks"
          value={pendingTasks}
          icon={Target}
          description="Awaiting action"
        />
        <StatCard
          title="Waste Pickups"
          value={pendingWasteReports}
          icon={FileText}
          description="Awaiting pickup"
        />
        <StatCard
          title="Revenue (KES)"
          value={totalRevenue.toLocaleString()}
          icon={CreditCard}
          description="From delivered orders"
        />
        <StatCard
          title="Completed Tasks"
          value={completedTasks}
          icon={CheckCircle}
          description="Successfully completed"
        />
      </div>

      {/* Alert Banners */}
      {unreadNotifications > 0 && (
        <Card className="border-blue-200 bg-blue-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {unreadNotifications} unread notification(s) require attention
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {collectedWasteReports > 0 && (
        <Card className="border-green-200 bg-green-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {collectedWasteReports} waste collection(s) ready for payment processing
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Overview
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
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('notifications')}
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Notifications ({notifications.length})
        </Button>
        <Button
          variant={activeTab === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('chat')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Dispatch Chat
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('reports')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Reports
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {adminTasks.slice(0, 5).map((task) => (
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
                    </div>
                  </div>
                ))}
                {adminTasks.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No tasks found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          {!notification.read && (
                            <Badge className="bg-blue-100 text-blue-800">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No notifications found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Admin Tasks
                </CardTitle>
                <CardDescription>Manage and track admin tasks</CardDescription>
              </div>
              <div className="flex gap-2">
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
                <Button onClick={() => setShowTaskForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showTaskForm && (
              <Card className="mb-4 border-blue-200">
                <CardHeader>
                  <CardTitle>Create New Task</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Enter task description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newTask.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Due Date (Optional)</label>
                      <Input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createAdminTask} disabled={!newTask.title.trim()}>
                      Create Task
                    </Button>
                    <Button variant="outline" onClick={() => setShowTaskForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        {task.due_date && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
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

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>View and manage system notifications</CardDescription>
              </div>
              <Select value={notificationFilter} onValueChange={setNotificationFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter notifications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="failed_delivery">Failed Delivery</SelectItem>
                  <SelectItem value="rider_issue">Rider Issue</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="admin_task">Admin Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                        {!notification.read && (
                          <Badge className="bg-blue-100 text-blue-800">
                            New
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredNotifications.length === 0 && (
                <p className="text-center text-gray-500 py-8">No notifications found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'chat' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Dispatch Chat
            </CardTitle>
            <CardDescription>Real-time communication with dispatch team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chat Messages */}
              <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-3">
                {chatHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.from === (profile?.full_name || 'Admin') ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      message.from === (profile?.full_name || 'Admin') 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-xs font-medium mb-1">{message.from}</div>
                      <div className="text-sm">{message.message}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {chatHistory.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No messages yet. Start a conversation!</p>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessageToDispatch()}
                />
                <Button onClick={sendMessageToDispatch} disabled={!chatMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waste Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Waste Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {wasteReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Waste #{report.id.slice(-6)}</span>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {report.waste_type.replace('_', ' ')} • {report.quantity_kg} kg
                    </p>
                    {report.farmer && (
                      <p className="text-xs text-gray-500">
                        Farmer: {report.farmer.full_name}
                      </p>
                    )}
                  </div>
                ))}
                {wasteReports.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No waste reports found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Order #{order.id.slice(-6)}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {order.quantity_kg} kg • KES {order.total_amount.toLocaleString()}
                    </p>
                    {order.customer && (
                      <p className="text-xs text-gray-500">
                        Customer: {order.customer.name}
                      </p>
                    )}
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No orders found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}