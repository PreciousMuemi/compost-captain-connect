import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Clock, 
  User, 
  Package, 
  DollarSign,
  Truck,
  Bell,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user_id?: string;
  related_entity_id?: string;
  metadata?: any;
}

export default function AdminActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchActivity();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('admin_activity')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Activity update:', payload);
          fetchActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      // Fetch recent activities from multiple sources
      const [
        { data: notifications },
        { data: wasteReports },
        { data: orders },
        { data: payments }
      ] = await Promise.all([
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("waste_reports").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20)
      ]);

      // Combine and format activities
      const allActivities: ActivityLog[] = [];

      // Add notifications
      (notifications || []).forEach(n => {
        allActivities.push({
          id: n.id,
          type: 'notification',
          description: `${n.title}: ${n.message}`,
          timestamp: n.created_at,
          user_id: n.recipient_id,
          related_entity_id: n.related_entity_id
        });
      });

      // Add waste reports
      (wasteReports || []).forEach(r => {
        allActivities.push({
          id: r.id,
          type: 'waste_report',
          description: `Waste report: ${r.quantity_kg}kg ${r.waste_type} - ${r.status}`,
          timestamp: r.created_at,
          user_id: r.farmer_id,
          related_entity_id: r.id
        });
      });

      // Add orders
      (orders || []).forEach(o => {
        allActivities.push({
          id: o.id,
          type: 'order',
          description: `Order: KES ${o.total_amount} - ${o.status}`,
          timestamp: o.created_at,
          user_id: o.customer_id,
          related_entity_id: o.id
        });
      });

      // Add payments
      (payments || []).forEach(p => {
        allActivities.push({
          id: p.id,
          type: 'payment',
          description: `Payment: KES ${p.amount} - ${p.status}`,
          timestamp: p.created_at,
          user_id: p.farmer_id,
          related_entity_id: p.id
        });
      });

      // Sort by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'waste_report': return <Package className="h-4 w-4" />;
      case 'order': return <Truck className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'notification': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'waste_report': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'order': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'payment': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time system activity and notifications</p>
            </div>
            <Button onClick={fetchActivity} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
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
              <Activity className="h-5 w-5 text-blue-600" />
              Filter Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All Activities
              </Button>
              <Button 
                variant={filter === 'notification' ? 'default' : 'outline'}
                onClick={() => setFilter('notification')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button 
                variant={filter === 'waste_report' ? 'default' : 'outline'}
                onClick={() => setFilter('waste_report')}
              >
                <Package className="h-4 w-4 mr-2" />
                Waste Reports
              </Button>
              <Button 
                variant={filter === 'order' ? 'default' : 'outline'}
                onClick={() => setFilter('order')}
              >
                <Truck className="h-4 w-4 mr-2" />
                Orders
              </Button>
              <Button 
                variant={filter === 'payment' ? 'default' : 'outline'}
                onClick={() => setFilter('payment')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Payments
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="glassmorphism border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activity found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or check back later.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 