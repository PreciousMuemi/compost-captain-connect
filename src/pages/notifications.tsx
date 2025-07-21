import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from("notifications").select("*");
    setNotifications(data || []);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchNotifications();
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div>No notifications found.</div>
          ) : (
            <ul>
              {notifications.map(n => (
                <li key={n.id} className="flex justify-between items-center border-b py-2">
                  <span>{n.title} - {n.message} {n.read ? "(Read)" : "(Unread)"}</span>
                  <div className="flex gap-2">
                    {!n.read && <Button onClick={() => markAsRead(n.id)}>Mark as Read</Button>}
                    <Button variant="destructive" onClick={() => deleteNotification(n.id)}>Delete</Button>
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