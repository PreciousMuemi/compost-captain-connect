import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
  const [stats, setStats] = useState<{
    totalWaste: number;
    wasteByType: Record<string, number>;
    totalSales: number;
    salesByProduct: Record<string, number>;
    totalFarmers: number;
    farmerBuyers: number;
    totalPayments: number;
    pendingPayments: number;
    completedPayments: number;
  }>({
    totalWaste: 0,
    wasteByType: {},
    totalSales: 0,
    salesByProduct: {},
    totalFarmers: 0,
    farmerBuyers: 0,
    totalPayments: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });

  useEffect(() => {
    async function fetchData() {
      // Waste by type
      const { data: wasteData } = await supabase
        .from('waste_reports')
        .select('waste_type, quantity_kg');
      const wasteByType: Record<string, number> = {};
      let totalWaste = 0;
      wasteData?.forEach(w => {
        wasteByType[w.waste_type] = (wasteByType[w.waste_type] || 0) + Number(w.quantity_kg);
        totalWaste += Number(w.quantity_kg);
      });

      // Sales by product (assuming orders table, and you may want to group by product if you have multiple)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('quantity_kg, total_amount');
      let totalSales = 0;
      ordersData?.forEach(o => {
        totalSales += Number(o.total_amount);
      });

      // Payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, status');
      let totalPayments = 0, pendingPayments = 0, completedPayments = 0;
      paymentsData?.forEach(p => {
        if (p.status === 'completed') {
          totalPayments += Number(p.amount);
          completedPayments += Number(p.amount);
        }
        if (p.status === 'pending') {
          pendingPayments += Number(p.amount);
        }
      });

      // Farmers and farmer-buyers
      const { data: farmers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'farmer');
      const { data: farmerBuyers } = await supabase
        .from('customers')
        .select('id')
        .eq('is_farmer', true);

      setStats({
        totalWaste,
        wasteByType,
        totalSales,
        salesByProduct: {}, // Add logic if you have multiple products
        totalFarmers: farmers?.length || 0,
        farmerBuyers: farmerBuyers?.length || 0,
        totalPayments,
        pendingPayments,
        completedPayments,
      });
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Total Waste Collected: {stats.totalWaste} kg</div>
          <div>Total Sales: KES {stats.totalSales}</div>
          <div>Total Farmers: {stats.totalFarmers}</div>
          <div>Farmer-Buyers: {stats.farmerBuyers}</div>
          <div>Total Payments: KES {stats.totalPayments}</div>
          <div>Completed Payments: KES {stats.completedPayments}</div>
          <div>Pending Payments: KES {stats.pendingPayments}</div>
          <div>
            <strong>Waste by Type:</strong>
            <ul>
              {Object.entries(stats.wasteByType).map(([type, qty]) => (
                <li key={type}>{type}: {qty} kg</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}