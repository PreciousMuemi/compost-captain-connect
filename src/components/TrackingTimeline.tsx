import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Truck, Package, DollarSign, MapPin, User } from "lucide-react";

interface TrackingStage {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  done: boolean;
  timestamp?: string;
  details?: string;
}

interface TrackingTimelineProps {
  entityId: string;
  entityType: 'waste_report' | 'order';
  onStatusChange?: (status: string) => void;
}

export function TrackingTimeline({ entityId, entityType, onStatusChange }: TrackingTimelineProps) {
  const [stages, setStages] = useState<TrackingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  useEffect(() => {
    fetchTrackingData();
    
    // Set up real-time subscription for status updates
    const channel = supabase
      .channel(`tracking-${entityId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: entityType === 'waste_report' ? 'waste_reports' : 'orders',
          filter: `id=eq.${entityId}`
        },
        (payload) => {
          console.log('Tracking update:', payload);
          fetchTrackingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityId, entityType]);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      if (entityType === 'waste_report') {
        const { data: report } = await supabase
          .from('waste_reports')
          .select(`
            *,
            profiles:farmer_id(full_name, phone_number),
            riders(name, phone_number)
          `)
          .eq('id', entityId)
          .single();

        if (report) {
          setCurrentStatus(report.status);
          onStatusChange?.(report.status);
          
          const wasteStages: TrackingStage[] = [
            {
              id: 'reported',
              label: 'Waste Reported',
              description: 'Farmer submitted waste report',
              icon: <Package className="h-5 w-5" />,
              done: true,
              timestamp: report.created_at,
              details: `${report.quantity_kg}kg of ${report.waste_type.replace('_', ' ')}`
            },
            {
              id: 'verified',
              label: 'Admin Verified',
              description: 'Admin approved the waste report',
              icon: <CheckCircle className="h-5 w-5" />,
              done: report.admin_verified || false,
              timestamp: report.admin_verified_at,
              details: report.admin_verified ? 'Report approved for pickup' : 'Pending admin verification'
            },
            {
              id: 'rider_assigned',
              label: 'Rider Assigned',
              description: 'Rider assigned for pickup',
              icon: <User className="h-5 w-5" />,
              done: !!report.rider_id,
              timestamp: report.rider_assigned_at,
              details: report.riders ? `Assigned to ${report.riders.name}` : 'Awaiting rider assignment'
            },
            {
              id: 'collected',
              label: 'Collected',
              description: 'Waste has been collected',
              icon: <Truck className="h-5 w-5" />,
              done: report.status === 'collected' || report.status === 'processed',
              timestamp: report.collected_date,
              details: report.status === 'collected' || report.status === 'processed' ? 'Waste collected successfully' : 'Awaiting collection'
            },
            {
              id: 'processed',
              label: 'Processed',
              description: 'Waste has been processed and payment completed',
              icon: <Package className="h-5 w-5" />,
              done: report.status === 'processed',
              timestamp: report.updated_at,
              details: report.status === 'processed' ? 'Waste processed and payment completed' : 'Awaiting processing'
            },
            {
              id: 'paid',
              label: 'Payment Processed',
              description: 'Farmer received payment',
              icon: <DollarSign className="h-5 w-5" />,
              done: report.paid || false,
              timestamp: report.payment_date,
              details: report.paid ? `Payment of KES ${report.payment_amount || 0} processed` : 'Payment pending'
            }
          ];
          
          setStages(wasteStages);
        }
      } else {
        // Order tracking
        const { data: order } = await supabase
          .from('orders')
          .select(`
            *,
            customers(name, phone_number, location),
            riders(name, phone_number)
          `)
          .eq('id', entityId)
          .single();

        if (order) {
          setCurrentStatus(order.status);
          onStatusChange?.(order.status);
          
          const orderStages: TrackingStage[] = [
            {
              id: 'pending',
              label: 'Order Placed',
              description: 'Order submitted successfully',
              icon: <Package className="h-5 w-5" />,
              done: true,
              timestamp: order.created_at,
              details: `Order for ${order.quantity_kg}kg - KES ${order.total_amount}`
            },
            {
              id: 'confirmed',
              label: 'Order Confirmed',
              description: 'Order confirmed by admin',
              icon: <CheckCircle className="h-5 w-5" />,
              done: order.status === 'confirmed' || order.status === 'delivered',
              timestamp: order.confirmed_at,
              details: order.status === 'confirmed' || order.status === 'delivered' ? 'Order confirmed and ready for delivery' : 'Awaiting confirmation'
            },
            {
              id: 'rider_assigned',
              label: 'Rider Assigned',
              description: 'Delivery rider assigned',
              icon: <User className="h-5 w-5" />,
              done: !!order.assigned_rider,
              timestamp: order.rider_assigned_at,
              details: order.riders ? `Assigned to ${order.riders.name}` : 'Awaiting rider assignment'
            },
            {
              id: 'out_for_delivery',
              label: 'Out for Delivery',
              description: 'Rider started delivery',
              icon: <Truck className="h-5 w-5" />,
              done: order.status === 'delivered',
              timestamp: order.delivery_started_at,
              details: order.status === 'delivered' ? 'Rider is delivering your order' : 'Awaiting delivery start'
            },
            {
              id: 'delivered',
              label: 'Delivered',
              description: 'Order delivered successfully',
              icon: <CheckCircle className="h-5 w-5" />,
              done: order.status === 'delivered',
              timestamp: order.delivered_at,
              details: order.status === 'delivered' ? 'Order delivered to your location' : 'Awaiting delivery'
            }
          ];
          
          setStages(orderStages);
        }
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="glassmorphism border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Tracking Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Truck className="h-5 w-5 text-blue-600" />
          Tracking Progress
          <Badge className="ml-auto">
            {currentStatus.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full border-2 ${
                  stage.done 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-gray-200 border-gray-300 text-gray-400'
                }`}>
                  {stage.done ? <CheckCircle className="h-4 w-4" /> : stage.icon}
                </div>
                {index < stages.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${
                    stage.done ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
              
              {/* Stage content */}
              <div className="flex-1 min-w-0">
                <div className={`p-4 rounded-lg border ${
                  stage.done 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        stage.done 
                          ? 'text-green-900 dark:text-green-100' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {stage.label}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        stage.done 
                          ? 'text-green-700 dark:text-green-200' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {stage.description}
                      </p>
                      {stage.details && (
                        <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                          {stage.details}
                        </p>
                      )}
                      {stage.timestamp && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatTime(stage.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                    {stage.done && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Estimated completion */}
        {currentStatus !== 'delivered' && currentStatus !== 'paid' && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Estimated completion: {entityType === 'waste_report' ? '2-3 hours' : '1-2 days'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 