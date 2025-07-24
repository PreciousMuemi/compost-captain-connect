import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function TicketForm({ onSuccess }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Get the current user's auth ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("tickets").insert({
        user_id: user.id, // Use auth user ID instead of profile.id
        subject,
        message,
        status: "open"
      });

      if (error) throw error;

      toast({
        title: "Ticket Submitted",
        description: "Your ticket has been submitted successfully. We'll get back to you soon.",
      });

      setSubject("");
      setMessage("");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Ticket submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue in detail..."
          rows={4}
          required
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Ticket"}
      </Button>
    </form>
  );
}