import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FloatingTicketButton() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('ticketButtonPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  // Save position to localStorage
  const savePosition = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
    localStorage.setItem('ticketButtonPosition', JSON.stringify(newPosition));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === buttonRef.current || buttonRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - 30));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - 30));
      savePosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleSubmit = async (e: React.FormEvent) => {
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

      // Reset form
      setSubject("");
      setMessage("");
      setIsOpen(false);
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
    <>
      {/* Floating Button */}
      <div
        ref={buttonRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        className="select-none"
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Submit Support Ticket</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
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
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Ticket"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
} 