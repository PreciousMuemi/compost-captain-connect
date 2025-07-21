import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Riders() {
  const [riders, setRiders] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  const fetchRiders = async () => {
    const { data } = await supabase.from("riders").select("*");
    setRiders(data || []);
  };

  useEffect(() => { fetchRiders(); }, []);

  const addRider = async () => {
    if (!name || !phone || !vehicle) return;
    await supabase.from("riders").insert([{ name, phone_number: phone, vehicle_type: vehicle }]);
    setName(""); setPhone(""); setVehicle("");
    fetchRiders();
  };

  const deleteRider = async (id: string) => {
    await supabase.from("riders").delete().eq("id", id);
    fetchRiders();
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Rider</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input placeholder="Vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)} />
          <Button onClick={addRider}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Riders</CardTitle>
        </CardHeader>
        <CardContent>
          {riders.length === 0 ? (
            <div>No riders found.</div>
          ) : (
            <ul>
              {riders.map(r => (
                <li key={r.id} className="flex justify-between items-center border-b py-2">
                  <span>{r.name} ({r.vehicle_type}) - {r.phone_number}</span>
                  <Button variant="destructive" onClick={() => deleteRider(r.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
