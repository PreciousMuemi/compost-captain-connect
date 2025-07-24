import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, DollarSign, ShoppingCart } from "lucide-react";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: Array<{
    quantity: number;
    product_id: number;
    products: {
      name: string;
      description: string;
      image_url: string;
    };
  }>;
}

export default function FarmerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchOrders();
    }
  }, [profile?.id]);

  const fetchOrders = async () => {
    if (!profile?.phone_number) return;

    setLoading(true);
    try {
      // First get the customer record for this farmer
      const { data: customerRecord } = await supabase
        .from("customers")
        .select("id")
        .eq("phone_number", profile.phone_number)
        .maybeSingle();

      if (!customerRecord) {
        console.log("No customer record found for this farmer");
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch orders with order items and product details
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          status,
          created_at,
          order_items (
            quantity,
            product_id,
            products (
              name,
              description,
              image_url
            )
          )
        `)
        .eq("customer_id", customerRecord.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } else {
        console.log("Fetched orders:", ordersData);
        setOrders((ordersData as Order[]) || []);
      }
    } catch (error) {
      console.error("Error in fetchOrders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Product Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          KES {order.total_amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Order ID: {order.id.slice(-8)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">Products:</span>
                        </div>
                        {order.order_items && order.order_items.length > 0 ? (
                          <div className="space-y-1">
                            {order.order_items.map((item, index) => (
                              <div key={index} className="text-sm text-foreground pl-6">
                                <span className="font-medium">{item.products?.name || "Unknown Product"}</span>
                                <span className="text-muted-foreground"> - {item.quantity}kg</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground pl-6">
                            No product details available
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
