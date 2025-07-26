import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Truck, Package, User, Phone, Clock } from "lucide-react";
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
  rider?: {
    name: string;
    phone_number: string;
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

// Initialize socket connection
const socket = io("http://localhost:4000", {
  autoConnect: false
});

export default function DispatchMapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to socket
    socket.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to dispatch server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from dispatch server');
    });

    // Listen for real-time updates
    socket.on('orderUpdate', (data) => {
      console.log('Real-time order update:', data);
      fetchData();
    });

    socket.on('wasteUpdate', (data) => {
      console.log('Real-time waste update:', data);
      fetchData();
    });

    socket.on('riderUpdate', (data) => {
      console.log('Real-time rider update:', data);
      fetchData();
    });

    fetchData();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
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

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(wasteReportsSubscription);
      supabase.removeChannel(ridersSubscription);
    };
  }, []);

    const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchWasteReports(),
        fetchRiders()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
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
          customer:customers(name, phone_number, location),
          rider:riders(name, phone_number)
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
      
      setRiders(ridersData || []);
    } catch (error) {
      console.error('Error fetching riders:', error);
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const activeOrders = orders.filter(o => o.status === 'confirmed');
  const pendingWasteReports = wasteReports.filter(w => w.status === 'reported' || w.status === 'scheduled');
  const availableRiders = riders.filter(r => r.status === 'available');

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Real-time Connected' : 'Offline'} - Live Dispatch Map
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Waste Pickups</p>
                <p className="text-2xl font-bold">{pendingWasteReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Available Riders</p>
                <p className="text-2xl font-bold">{availableRiders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Riders</p>
                <p className="text-2xl font-bold">{riders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Orders ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No active orders found.</div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Order #{order.id.slice(-6)}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Quantity:</strong> {order.quantity_kg} kg
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Amount:</strong> KES {order.total_amount.toLocaleString()}
                      </p>
                      {order.customer && (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{order.customer.name}</span>
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{order.customer.phone_number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Delivery Address:</strong>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{order.delivery_address || 'No address'}</span>
                      </div>
                      {order.rider && (
                        <div className="flex items-center gap-2 mt-2">
                          <Truck className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{order.rider.name}</span>
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{order.rider.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waste Pickups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Waste Pickups ({pendingWasteReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWasteReports.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No waste pickups scheduled.</div>
          ) : (
            <div className="space-y-3">
              {pendingWasteReports.map(report => (
                <div key={report.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Waste #{report.id.slice(-6)}</span>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {report.waste_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Quantity:</strong> {report.quantity_kg} kg
                      </p>
                      {report.farmer && (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{report.farmer.full_name}</span>
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{report.farmer.phone_number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Location:</strong>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{report.location}</span>
                      </div>
                      {report.rider && (
                        <div className="flex items-center gap-2 mt-2">
                          <Truck className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{report.rider.name}</span>
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{report.rider.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rider Status ({riders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No riders found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riders.map(rider => (
                <div key={rider.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">{rider.name}</span>
                      <Badge className={getRiderStatusColor(rider.status)}>
                        {rider.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <strong>Vehicle:</strong> {rider.vehicle_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Phone:</strong> {rider.phone_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Current Orders:</strong> {rider.current_orders}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Success Rate:</strong> {rider.success_rate}%
                    </p>
                    {rider.last_location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{rider.last_location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 