import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Truck } from 'lucide-react';

interface DeliveryLocation {
  id: string;
  address: string;
  customerName: string;
  lat: number;
  lng: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'delivered';
  orderId: string;
  assignedRider?: string;
}

interface DispatchMapProps {
  orders: any[];
  riders: any[];
}

export const DispatchMap = ({ orders, riders }: DispatchMapProps) => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2921, lng: 36.8219 }); // Nairobi center

  useEffect(() => {
    // Convert orders to map locations with mock coordinates
    const mockLocations: DeliveryLocation[] = orders.map((order, index) => ({
      id: order.id,
      address: order.delivery_address || 'Unknown Address',
      customerName: order.customer?.name || 'Unknown Customer',
      // Mock coordinates around Nairobi for demo
      lat: -1.2921 + (Math.random() - 0.5) * 0.5,
      lng: 36.8219 + (Math.random() - 0.5) * 0.5,
      status: order.status,
      orderId: order.id,
      assignedRider: order.assigned_rider
    }));
    
    setLocations(mockLocations);
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fbbf24'; // yellow
      case 'assigned': return '#3b82f6'; // blue
      case 'in_progress': return '#8b5cf6'; // purple
      case 'delivered': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  const calculateOptimalRoute = () => {
    // Simple route optimization (in a real app, you'd use Google Maps API or similar)
    const pendingLocations = locations.filter(loc => loc.status === 'pending' || loc.status === 'assigned');
    
    if (pendingLocations.length === 0) return;
    
    // Sort by distance from center (simplified)
    const sortedLocations = pendingLocations.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.lat - mapCenter.lat, 2) + Math.pow(a.lng - mapCenter.lng, 2));
      const distB = Math.sqrt(Math.pow(b.lat - mapCenter.lat, 2) + Math.pow(b.lng - mapCenter.lng, 2));
      return distA - distB;
    });
    
    console.log('Optimal route:', sortedLocations.map(loc => loc.address));
  };

  // For MVP, we'll create a simple visual map representation
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Map & Routes
          </CardTitle>
          <Button onClick={calculateOptimalRoute} variant="outline" size="sm">
            <Navigation className="h-4 w-4 mr-2" />
            Optimize Routes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Map Container - For MVP, we'll show a grid-based map */}
          <div className="w-full h-96 bg-gray-100 rounded-lg relative overflow-hidden border-2 border-gray-200">
            {/* Map Background Grid */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            {/* Map Title */}
            <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md">
              <h3 className="font-medium text-sm">Nairobi Delivery Zone</h3>
              <p className="text-xs text-gray-500">Live delivery tracking</p>
            </div>
            
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md">
              <h4 className="font-medium text-xs mb-2">Status</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span>Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span>Delivered</span>
                </div>
              </div>
            </div>
            
            {/* Delivery Points */}
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110"
                style={{
                  left: `${20 + (index % 5) * 15}%`,
                  top: `${20 + Math.floor(index / 5) * 15}%`
                }}
                onClick={() => setSelectedLocation(location)}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: getStatusColor(location.status) }}
                />
                {location.status === 'in_progress' && (
                  <div className="absolute -top-1 -right-1">
                    <Truck className="w-3 h-3 text-purple-600" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Riders (mock positions) */}
            {riders.filter(r => r.status !== 'offline').map((rider, index) => (
              <div
                key={rider.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${30 + (index * 20)}%`,
                  top: `${60 + (index % 2) * 10}%`
                }}
              >
                <div className="bg-orange-500 p-2 rounded-full shadow-lg">
                  <Truck className="w-3 h-3 text-white" />
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-md whitespace-nowrap">
                  {rider.name.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
          
          {/* Selected Location Details */}
          {selectedLocation && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Delivery Details</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedLocation(null)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Customer:</strong> {selectedLocation.customerName}</p>
                <p><strong>Address:</strong> {selectedLocation.address}</p>
                <p><strong>Order ID:</strong> #{selectedLocation.orderId.slice(-6)}</p>
                <p><strong>Status:</strong> 
                  <span 
                    className="ml-2 px-2 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: getStatusColor(selectedLocation.status) }}
                  >
                    {selectedLocation.status.replace('_', ' ')}
                  </span>
                </p>
                {selectedLocation.assignedRider && (
                  <p><strong>Assigned Rider:</strong> {
                    riders.find(r => r.id === selectedLocation.assignedRider)?.name || 'Unknown'
                  }</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Route Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {locations.filter(l => l.status === 'pending').length}
            </p>
            <p className="text-xs text-yellow-600">Pending</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {locations.filter(l => l.status === 'assigned').length}
            </p>
            <p className="text-xs text-blue-600">Assigned</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {locations.filter(l => l.status === 'in_progress').length}
            </p>
            <p className="text-xs text-purple-600">In Progress</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {locations.filter(l => l.status === 'delivered').length}
            </p>
            <p className="text-xs text-green-600">Delivered</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-4 flex gap-2 text-xs">
          <Button variant="outline" size="sm">
            <MapPin className="h-3 w-3 mr-1" />
            View All Locations
          </Button>
          <Button variant="outline" size="sm">
            <Navigation className="h-3 w-3 mr-1" />
            Export Routes
          </Button>
          <Button variant="outline" size="sm">
            <Truck className="h-3 w-3 mr-1" />
            Track Riders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
