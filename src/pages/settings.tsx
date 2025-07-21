import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const [threshold, setThreshold] = useState("");
  // You can wire this up to a settings table if you have one
  const updateSetting = () => {
    alert(`Would update default low stock threshold to: ${threshold}`);
  };
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); updateSetting(); }}>
            <Input placeholder="Default Low Stock Threshold" value={threshold} onChange={e => setThreshold(e.target.value)} />
            <Button type="submit">Update</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 