import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Analytics() {
  const { profile } = useAuth();

  const { data: wasteData } = useQuery({
    queryKey: ['waste-analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('waste_reports')
        .select('waste_type, quantity_kg, status, created_at');
      return data || [];
    },
  });

  const { data: paymentData } = useQuery({
    queryKey: ['payment-analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('amount, status, payment_type, created_at');
      return data || [];
    },
  });

  // Process data for charts
  const wasteByType = wasteData?.reduce((acc: any, report: any) => {
    const type = report.waste_type.replace('_', ' ');
    acc[type] = (acc[type] || 0) + report.quantity_kg;
    return acc;
  }, {});

  const wasteChartData = Object.entries(wasteByType || {}).map(([type, quantity]) => ({
    type,
    quantity,
  }));

  const statusData = wasteData?.reduce((acc: any, report: any) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusData || {}).map(([status, count]) => ({
    status,
    count,
  }));

  const monthlyPayments = paymentData?.reduce((acc: any, payment: any) => {
    const month = new Date(payment.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {});

  const paymentChartData = Object.entries(monthlyPayments || {}).map(([month, amount]) => ({
    month,
    amount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track waste collection and payment performance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Waste Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wasteData?.reduce((sum, report) => sum + report.quantity_kg, 0) || 0} kg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {paymentData?.reduce((sum, payment) => sum + payment.amount, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wasteData?.filter(report => report.status === 'reported').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wasteData?.filter(report => report.status === 'collected').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waste by Type</CardTitle>
            <CardDescription>Distribution of collected waste types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wasteChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
            <CardDescription>Current status of waste reports</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusChartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Payments</CardTitle>
            <CardDescription>Payment trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paymentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}