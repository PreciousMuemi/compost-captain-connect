import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    phone_number: string;
    role: string;
  };
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          profiles!user_id (
            full_name,
            phone_number,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Ticket status updated to ${status}`,
      });

      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground">Manage user support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold">{tickets.length} Tickets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ticket #{ticket.id.slice(-8)}
                  </p>
                </div>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground line-clamp-3">
                  {ticket.message}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{ticket.profiles?.full_name || "Unknown User"}</span>
                  <Badge variant="outline" className="text-xs">
                    {ticket.profiles?.role || "Unknown"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {ticket.status === "open" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                      className="flex-1"
                    >
                      Start Working
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(ticket.id, "resolved")}
                    >
                      Resolve
                    </Button>
                  </>
                )}
                {ticket.status === "in_progress" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateTicketStatus(ticket.id, "resolved")}
                      className="flex-1"
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(ticket.id, "open")}
                    >
                      Reopen
                    </Button>
                  </>
                )}
                {ticket.status === "resolved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateTicketStatus(ticket.id, "closed")}
                    className="w-full"
                  >
                    Close Ticket
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tickets Found</h3>
            <p className="text-muted-foreground">
              No support tickets have been submitted yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 