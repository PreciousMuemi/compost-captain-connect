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

type NotificationFeedProps = { userId: string };

function NotificationFeed({ userId }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: notificationsData, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
      }
      
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading notifications...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div>No notifications found.</div>
          ) : (
            <ul>
              {notifications.map(notification => (
                <li key={notification.id} className="border-b py-4">
                  <div>
                    <b>Type:</b> {notification.type}
                  </div>
                  <div>
                    <b>Message:</b> {notification.message}
                  </div>
                  <div>
                    <b>Date:</b> {new Date(notification.created_at).toLocaleString()}
                  </div>
                  {notification.related_id && (
                    <div>
                      <b>Related ID:</b> {notification.related_id}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationFeed;