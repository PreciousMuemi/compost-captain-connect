import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function WasteReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      supabase
        .from("waste_reports")
        .select("*")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setReports(data || []));
    }
  }, [profile]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">My Waste Reports</h1>
      {reports.length === 0 ? (
        <div>No reports found.</div>
      ) : (
        reports.map((report: any) => (
          <div key={report.id} className="bg-gray-100 p-4 rounded-lg mb-2">
            <p>Waste Type: {report.waste_type}</p>
            <p>Quantity: {report.quantity_kg} kg</p>
            <p>Location: {report.location}</p>
            <p>Status: {report.status}</p>
            <p>Reported At: {new Date(report.created_at).toLocaleDateString()}</p>
          </div>
        ))
      )}
    </div>
  );
}
