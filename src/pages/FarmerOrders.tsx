import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FarmerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile?.phone_number) return;
      // Get customer record for this farmer
      const { data: customerRecord } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', profile.phone_number)
        .maybeSingle();
      if (!customerRecord) return setLoading(false);

      // Fetch orders by this farmer (as customer/buyer)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerRecord.id)
        .order('created_at', { ascending: false });
      setOrders(ordersData || []);
      setLoading(false);
    };
    fetchOrders();
  }, [profile]);

  if (loading) return <div className="p-6">Loading orders...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Product Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div>No orders found.</div>
          ) : (
            <ul>
              {orders.map(order => (
                <li key={order.id} className="border-b py-2">
                  <div>
                    <b>Order ID:</b> {order.id} | <b>Status:</b>{" "}
                    <Badge>{order.status}</Badge> | <b>Total:</b> KES {order.total_amount}
                  </div>
                  <div>
                    <b>Quantity:</b> {order.quantity_kg} kg | <b>Price per kg:</b> KES {order.price_per_kg}
                  </div>
                  <div>
                    <b>Date:</b> {new Date(order.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
