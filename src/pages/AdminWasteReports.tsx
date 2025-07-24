import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ReportStatusTimeline({ report }) {
  const stages = [
    { label: "Reported", done: true },
    { label: "Admin Verified", done: report.admin_verified },
    { label: "Rider Assigned", done: !!report.rider_id },
    { label: "Pickup Started", done: !!report.pickup_started_at },
    { label: "Pickup Completed", done: !!report.pickup_completed_at },
    { label: "Paid", done: report.paid },
  ];
  return (
    <div className="flex gap-2 my-2">
      {stages.map((s, i) => (
        <div key={i} className={`px-2 py-1 rounded ${s.done ? "bg-green-500 text-white" : "bg-gray-200"}`}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

export default function AdminWasteReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: reportsData } = await supabase
      .from("waste_reports")
      .select("*, profiles:farmer_id(full_name, phone_number)")
      .order("created_at", { ascending: false });
    setReports(reportsData || []);
    const { data: ridersData } = await supabase.from("riders").select("*");
    setRiders(ridersData || []);
    setLoading(false);
  };

  const handleVerify = async (reportId: string) => {
    await supabase.from("waste_reports").update({ admin_verified: true, status: "approved" }).eq("id", reportId);
    // Fetch the report to get farmer_id
    const { data: report } = await supabase.from("waste_reports").select("farmer_id").eq("id", reportId).single();
    // Send notification
    await supabase.from("notifications").insert({
      profile_id: report.farmer_id, // <-- use the actual column name
      type: "approval",
      message: "Your waste report has been approved. A rider will reach out soon.",
      related_id: reportId
    });
    fetchData();
  };

  const handleAssignRider = async (reportId: string, riderId: string) => {
    await supabase.from("waste_reports").update({ rider_id: riderId, status: "assigned" }).eq("id", reportId);
    // Fetch the report to get farmer_id
    const { data: report } = await supabase.from("waste_reports").select("farmer_id").eq("id", reportId).single();
    // Send notification
    await supabase.from("notifications").insert({
      profile_id: report.farmer_id, // <-- use the actual column name
      type: "rider_assigned",
      message: "A rider has been assigned to your pickup.",
      related_id: reportId
    });
    fetchData();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>All Waste Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div>No reports found.</div>
          ) : (
            <ul>
              {reports.map(report => (
                <li key={report.id} className="border-b py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div>
                        <b>Farmer:</b> {report.profiles?.full_name} ({report.profiles?.phone_number})
                      </div>
                      <div>
                        <b>Type:</b> {report.waste_type} | <b>Qty:</b> {report.quantity_kg}kg | <b>Status:</b>{" "}
                        <Badge>{report.status}</Badge>
                      </div>
                      <div>
                        <b>Location:</b> {report.location}
                      </div>
                      <div>
                        <b>Date:</b> {new Date(report.created_at).toLocaleString()}
                      </div>
                      <ReportStatusTimeline report={report} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {!report.admin_verified && (
                        <Button onClick={() => handleVerify(report.id)}>Verify</Button>
                      )}
                      {report.admin_verified && !report.rider_id && (
                        <select
                          onChange={e => handleAssignRider(report.id, e.target.value)}
                          defaultValue=""
                          className="border rounded px-2 py-1"
                        >
                          <option value="" disabled>
                            Assign Rider
                          </option>
                          {riders.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {report.rider_id && (
                        <span className="text-green-600">Rider Assigned</span>
                      )}
                    </div>
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