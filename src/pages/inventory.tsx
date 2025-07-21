import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");

  const fetchItems = async () => {
    const { data } = await supabase.from("inventory").select("*");
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!name || !stock || !unit || !price) return;
    await supabase.from("inventory").insert([{ name, stock_quantity: Number(stock), unit, price_per_unit: Number(price) }]);
    setName(""); setStock(""); setUnit(""); setPrice("");
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("inventory").delete().eq("id", id);
    fetchItems();
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Inventory Item</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Stock" value={stock} onChange={e => setStock(e.target.value)} type="number" />
          <Input placeholder="Unit" value={unit} onChange={e => setUnit(e.target.value)} />
          <Input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} type="number" />
          <Button onClick={addItem}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div>No inventory found.</div>
          ) : (
            <ul>
              {items.map(item => (
                <li key={item.id} className="flex justify-between items-center border-b py-2">
                  <span>{item.name} ({item.stock_quantity} {item.unit}) - KES {item.price_per_unit}</span>
                  <Button variant="destructive" onClick={() => deleteItem(item.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 