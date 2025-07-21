import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DispatchMapPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: ordersData } = await supabase.from("orders").select("*", { count: "exact" });
      const { data: ridersData } = await supabase.from("riders").select("*");
      setOrders(ordersData || []);
      setRiders(ridersData || []);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Map (Data)</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div>No orders found.</div>
          ) : (
            <ul>
              {orders.map(order => (
                <li key={order.id} className="border-b py-2">
                  <b>Order:</b> {order.id} | <b>Address:</b> {order.delivery_address || "N/A"} | <b>Rider:</b> {riders.find(r => r.id === order.assigned_rider)?.name || "Unassigned"}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 