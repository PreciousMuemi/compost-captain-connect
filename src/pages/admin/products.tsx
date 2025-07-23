// src/pages/admin/products.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", image_url: "" });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    supabase.from("products").select("*").then(({ data }) => setProducts(data || []));
  }, []);

  const handleAdd = async () => {
    const { data, error } = await supabase.from("products").insert([{
      ...form,
      price: Number(form.price),
    }]);
    if (!error) {
      setProducts([...products, ...(data || [])]);
      setForm({ name: "", description: "", price: "", image_url: "" });
    } else {
      alert(error.message);
    }
  };

  const handleEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
    });
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("products")
      .update({
        ...form,
        price: Number(form.price),
      })
      .eq("id", editing.id);
    if (!error) {
      setProducts(products.map(p => p.id === editing.id ? { ...p, ...form, price: Number(form.price) } : p));
      setEditing(null);
      setForm({ name: "", description: "", price: "", image_url: "" });
    } else {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Admin: Products</h1>
      <div>
        <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Input placeholder="Price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        <Input placeholder="Image URL" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
        <Button onClick={editing ? handleUpdate : handleAdd}>
          {editing ? "Update Product" : "Add Product"}
        </Button>
        {editing && (
          <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", price: "", image_url: "" }); }}>
            Cancel
          </Button>
        )}
      </div>
      <ul>
        {products.map(p => (
          <li key={p.id}>
            <img src={p.image_url} alt={p.name} width={50} style={{ verticalAlign: "middle" }} />
            <b>{p.name}</b> - {p.description} - KES {p.price}
            <Button onClick={() => handleEdit(p)}>Edit</Button>
            <Button onClick={() => handleDelete(p.id)} variant="destructive">Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
