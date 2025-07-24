import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function TicketForm({ onSuccess }) {
  const { profile } = useAuth();
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from("tickets").insert({ user_id: profile.id, type, subject, message });
    alert("Ticket submitted!");
    setType("feedback");
    setSubject("");
    setMessage("");
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-6 rounded-xl">
      <select value={type} onChange={e=>setType(e.target.value)}>
        <option value="feedback">Feedback</option>
        <option value="delay">Delay</option>
        <option value="delivery">Delivery Issue</option>
      </select>
      <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" required />
      <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe your issue..." required />
      <button type="submit">Submit Ticket</button>
    </form>
  );
}