import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Users, DollarSign, BarChart3, PieChart, Activity } from "lucide-react";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into your waste management operations.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalWaste.toLocaleString()} kg</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Waste Collected</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSales)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalFarmers}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Farmers</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalPayments)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Analytics */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payment Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completed Payments</span>
                  <span className="font-semibold text-green-600">{formatCurrency(stats.completedPayments)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</span>
                  <span className="font-semibold text-yellow-600">{formatCurrency(stats.pendingPayments)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Farmer Buyers</span>
                  <span className="font-semibold text-blue-600">{stats.farmerBuyers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Waste Analytics */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Waste by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Object.entries(stats.wasteByType).map(([type, qty]) => (
                  <div key={type} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {qty.toLocaleString()} kg
                    </span>
                  </div>
                ))}
                {Object.keys(stats.wasteByType).length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No waste data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats.totalWaste > 0 ? ((stats.totalSales / stats.totalWaste) * 1000).toFixed(2) : '0'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Revenue per 1000kg</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats.totalFarmers > 0 ? (stats.totalWaste / stats.totalFarmers).toFixed(1) : '0'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Waste per Farmer (kg)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {stats.totalPayments > 0 ? ((stats.completedPayments / stats.totalPayments) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Payment Success Rate</div>
              </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}