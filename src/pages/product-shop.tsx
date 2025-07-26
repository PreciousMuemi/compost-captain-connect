import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function ProductShop({ profile }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("products" as any)
      .select("*")
      .then(({ data }) => setProducts(data || []));
  }, []);

  // Add item to cart
  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    console.log(product.id, cart)
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Adjust quantity
  const updateQuantity = (productId, quantity) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const getTotal = () =>
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // STK Push Checkout
  const handleCheckout = async () => {
    if (!phoneNumber) return alert("Enter phone number");
    if (cart.length === 0) return alert("Your cart is empty.");

    // Check for invalid product prices
    if (cart.some(item => !item.product.price && item.product.price !== 0)) {
      return alert("One or more products in your cart have no price.");
    }

    setLoading(true);
    try {
      // 1. Create customer if needed
      let { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();
      
      if (!customer) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: profile?.full_name || "Unknown",
            phone_number: phoneNumber,
            location: profile?.location || "",
          })
          .select("id")
          .single();
        
        if (customerError) {
          console.error("Customer creation error:", customerError);
          alert("Error creating customer profile. Please try again.");
          setLoading(false);
          return;
        }
        customer = newCustomer;
      }
      // 2. Create order
      const totalAmount = getTotal();
      const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate avgPrice safely
      const avgPrice =
        cart.length > 0
          ? cart.reduce((sum, item) => sum + (item.product.price || 0), 0) / cart.length
          : 0;

      // Prevent order if avgPrice is 0 (shouldn't happen if you check above, but double safety)
      if (avgPrice === 0) {
        alert("Invalid product price. Cannot proceed with checkout.");
        setLoading(false);
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customer.id,
          total_amount: totalAmount,
          status: "pending",
          price_per_kg: avgPrice,
          quantity_kg: totalQuantity,
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        alert("Error creating order. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Create order items
      for (const item of cart) {
        await supabase
          .from(
            "order_items")
          .insert({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          });
      }
      // 4. Trigger STK Push
      const { data, error } = await supabase.functions.invoke("mpesa-payment", {
        body: {
          phoneNumber,
          amount: totalAmount,
          orderId: order.id,
          paymentType: "product_purchase",
        },
      });
      if (data?.success) {
        alert("Payment initiated! Check your phone for M-Pesa prompt.");
        setCart([]);
        setIsCartOpen(false);
      } else {
        alert(data?.error || "Payment initiation failed");
      }
    } catch (err) {
      alert("Error during checkout");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Organic Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent>
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-32 object-cover rounded"
              />
              <CardTitle className="mt-2">{product.name}</CardTitle>
              <div>{product.description}</div>
              <div className="font-bold mt-2">KES {product.price}</div>
              <Button onClick={() => addToCart(product)} className="mt-2">
                Add to Cart
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="fixed bottom-4 right-4">
        <Button onClick={() => setIsCartOpen(true)}>
          Cart ({cart.length})
        </Button>
      </div>
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <div>Your cart is empty.</div>
          ) : (
            <div>
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-2 items-center mb-2">
                  <img src={item.product.image_url} alt={item.product.name} className="w-10 h-10 object-cover rounded" />
                  <div className="flex-1">
                    <div>{item.product.name}</div>
                    <div>KES {item.product.price} x </div>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.product.id, Number(e.target.value))
                    }
                    className="w-16"
                  />
                  <Button size="sm" onClick={() => removeFromCart(item.product.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              <div className="font-bold mt-4">Total: KES {getTotal()}</div>
              <div className="mt-4">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="254712345678 or 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your M-Pesa registered phone number
                </p>
              </div>
              <Button className="mt-4" onClick={handleCheckout} disabled={loading}>
                {loading ? "Processing..." : "Checkout & Pay"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductShop;