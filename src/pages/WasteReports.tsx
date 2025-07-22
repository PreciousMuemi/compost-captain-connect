import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function WasteReports() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // If farmer, show waste report form
  if (profile?.role === "farmer") {
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
      }
    };
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Report Waste</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Waste Type</label>
                <Select value={wasteType} onValueChange={setWasteType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manure">Manure</SelectItem>
                    <SelectItem value="crop_residue">Crop Residue</SelectItem>
                    <SelectItem value="kitchen_waste">Kitchen Waste</SelectItem>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // If admin, show existing admin view (placeholder)
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Waste Reports (Admin View)</h1>
      {/* Existing admin table/list here */}
    </div>
  );
}
