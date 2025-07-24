export function ReportStatusTimeline({ report }) {
  const stages = [
    { label: "Reported", done: true },
    { label: "Admin Verified", done: report.admin_verified },
    { label: "Rider Assigned", done: !!report.rider_id },
    { label: "Pickup Started", done: !!report.pickup_started_at },
    { label: "Pickup Completed", done: !!report.pickup_completed_at },
    { label: "Paid", done: report.paid }, // if you track payment
  ];
  return (
    <div className="timeline flex gap-2">
      {stages.map((s, i) => (
        <div key={i} className={`stage px-2 py-1 rounded ${s.done ? "bg-green-500 text-white" : "bg-gray-200"}`}>
          {s.label}
        </div>
      ))}
    </div>
  );
}