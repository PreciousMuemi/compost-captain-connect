import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FarmerHistory() {
  const { id } = useParams();
  const [reports, setReports] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: reportsData } = await supabase.from('waste_reports').select('*').eq('farmer_id', id);
      const { data: paymentsData } = await supabase.from('payments').select('*').eq('farmer_id', id);
      setReports(reportsData || []);
      setPayments(paymentsData || []);
      setLoading(false);
    };
    fetchHistory();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Waste Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div>No waste reports found.</div>
          ) : (
            <ul className="space-y-2">
              {reports.map(r => (
                <li key={r.id} className="border-b pb-2">
                  <b>Type:</b> {r.waste_type} | <b>Qty:</b> {r.quantity_kg}kg | <b>Status:</b> {r.status} | <b>Date:</b> {new Date(r.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div>No payments found.</div>
          ) : (
            <ul className="space-y-2">
              {payments.map(p => (
                <li key={p.id} className="border-b pb-2">
                  <b>Amount:</b> KES {p.amount} | <b>Status:</b> {p.status} | <b>Date:</b> {new Date(p.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 