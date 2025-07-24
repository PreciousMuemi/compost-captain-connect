import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function WasteReportForm({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("waste_reports").insert({
      farmer_id: profile.id,
      waste_type: wasteType as "animal_manure" | "coffee_husks" | "rice_hulls" | "maize_stalks" | "other",
      quantity_kg: Number(quantity),
      location,
      status: "reported",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Waste report submitted!" });
      setWasteType("");
      setQuantity("");
      setLocation("");
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Waste Type</label>
        <Select value={wasteType} onValueChange={setWasteType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select waste type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="animal_manure">Animal Manure</SelectItem>
            <SelectItem value="coffee_husks">Coffee Husks</SelectItem>
            <SelectItem value="rice_hulls">Rice Hulls</SelectItem>
            <SelectItem value="maize_stalks">Maize Stalks</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Quantity (kg)</label>
        <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1 font-medium">Location</label>
        <Input value={location} onChange={e => setLocation(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Report"}
      </Button>
    </form>
  );
}
