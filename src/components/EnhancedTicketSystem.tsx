import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  Send,
  FileText,
  Phone,
  Mail,
  Truck,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    phone_number: string;
    role: string;
  };
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  message: string;
  created_at: string;
  is_admin_response: boolean;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export function EnhancedTicketSystem() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [newResponse, setNewResponse] = useState("");
  const [filter, setFilter] = useState("all");
  
  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    type: "general"
  });

  useEffect(() => {
    fetchTickets();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('tickets')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: profile?.role === 'admin' ? undefined : `user_id=eq.${profile?.id}`
        },
        (payload) => {
          console.log('Ticket update:', payload);
          fetchTickets();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_responses'
        },
        (payload) => {
          console.log('Ticket response update:', payload);
          if (selectedTicket) {
            fetchResponses(selectedTicket.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          profiles:user_id(full_name, phone_number, role)
        `)
        .order('created_at', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('user_id', profile?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select(`
          *,
          profiles:user_id(full_name, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const createTicket = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .insert({
          user_id: profile.id,
          subject: newTicket.subject,
          message: newTicket.message,
          type: newTicket.type,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Ticket Created",
        description: "Your ticket has been submitted successfully",
      });

      setNewTicket({ subject: "", message: "", type: "general" });
      setIsCreateModalOpen(false);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  const addResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: profile?.id,
          message: newResponse,
          is_admin_response: profile?.role === 'admin'
        });

      if (error) throw error;

      // Update ticket status if admin responds
      if (profile?.role === 'admin') {
        await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      setNewResponse("");
      fetchResponses(selectedTicket.id);
      fetchTickets();
      
      toast({
        title: "Response Added",
        description: "Your response has been added to the ticket",
      });
    } catch (error) {
      console.error('Error adding response:', error);
      toast({
        title: "Error",
        description: "Failed to add response",
        variant: "destructive",
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      fetchTickets();
      toast({
        title: "Status Updated",
        description: `Ticket status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery_issue': return <Truck className="h-4 w-4" />;
      case 'payment_issue': return <DollarSign className="h-4 w-4" />;
      case 'technical': return <FileText className="h-4 w-4" />;
      case 'feedback': return <MessageCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchResponses(ticket.id);
    setIsResponseModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {profile?.role === 'admin' ? 'Manage customer support tickets' : 'Get help and support'}
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newTicket.type} onValueChange={(value) => setNewTicket(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
                    <SelectItem value="payment_issue">Payment Issue</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTicket} disabled={!newTicket.subject || !newTicket.message}>
                  Create Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="glassmorphism border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(ticket.type)}
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {ticket.subject}
                    </h3>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {ticket.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.profiles?.full_name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" onClick={() => openTicket(ticket)}>
                    View
                  </Button>
                  {profile?.role === 'admin' && (
                    <Select value={ticket.status} onValueChange={(status) => updateTicketStatus(ticket.id, status)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Original Ticket */}
              <Card className="bg-gray-50 dark:bg-gray-900/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedTicket.profiles?.full_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedTicket.profiles?.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTicket.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* Responses */}
              <div className="space-y-3">
                {responses.map((response) => (
                  <Card key={response.id} className={`${
                    response.is_admin_response 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-900/50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{response.profiles?.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {response.is_admin_response ? 'Admin' : response.profiles?.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {response.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(response.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add Response */}
              <div className="space-y-3">
                <Textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="Type your response..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsResponseModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={addResponse} disabled={!newResponse.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Response
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 