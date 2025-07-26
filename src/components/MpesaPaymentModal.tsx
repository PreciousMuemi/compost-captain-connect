import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, CreditCard, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  price_per_kg: number;
  available_kg: number;
  description: string;
}

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export function MpesaPaymentModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: MpesaPaymentModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stk_push' | 'c2b'>('stk_push');

  if (!product) return null;

  const totalAmount = product.price_per_kg * quantity;

  const handleSTKPush = async () => {
    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    if (!cleanPhone) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    // Check if phone number starts with valid prefixes
    if (!cleanPhone.match(/^(254|07|7)\d{8}$/)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number starting with 254, 07, or 7 (e.g., 254712345678, 0712345678, or 712345678)",
        variant: "destructive",
      });
      return;
    }

    // Format phone number to 254 format
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('07')) {
      formattedPhone = '254' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('7')) {
      formattedPhone = '254' + cleanPhone;
    }

    setLoading(true);
    try {
      // First create customer record if it doesn't exist
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', profile?.phone_number)
        .maybeSingle();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: profile?.full_name || 'Unknown',
            phone_number: profile?.phone_number || formattedPhone,
            is_farmer: true
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          farmer_id: profile?.id,
          quantity_kg: quantity,
          price_per_kg: product.price_per_kg,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Initiate M-Pesa STK Push
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phoneNumber: formattedPhone,
          amount: totalAmount,
          orderId: order.id,
          farmerId: profile?.id,
          paymentType: 'manure_sale'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Initiated",
          description: "Please complete the payment on your phone",
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleC2BPayment = async () => {
    setLoading(true);
    try {
      // Create customer record if it doesn't exist
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', profile?.phone_number)
        .maybeSingle();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: profile?.full_name || 'Unknown',
            phone_number: profile?.phone_number || phoneNumber,
            is_farmer: true
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          farmer_id: profile?.id,
          quantity_kg: quantity,
          price_per_kg: product.price_per_kg,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      toast({
        title: "Order Created",
        description: `Order created. Please send KES ${totalAmount} to our Paybill number. Reference: CC-${order.id}`,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Product:</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per kg:</span>
                <span>KES {product.price_per_kg}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{quantity} kg</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>KES {totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quantity Selection */}
          <div>
            <Label htmlFor="quantity">Quantity (kg)</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.available_kg}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone">M-Pesa Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              defaultValue={profile?.phone_number || ""}
            />
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer border-2 ${paymentMethod === 'stk_push' ? 'border-primary' : 'border-muted'}`}
                onClick={() => setPaymentMethod('stk_push')}
              >
                <CardContent className="p-4 text-center">
                  <Smartphone className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">STK Push</p>
                  <p className="text-xs text-muted-foreground">Instant payment</p>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer border-2 ${paymentMethod === 'c2b' ? 'border-primary' : 'border-muted'}`}
                onClick={() => setPaymentMethod('c2b')}
              >
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Paybill</p>
                  <p className="text-xs text-muted-foreground">Manual payment</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Instructions */}
          {paymentMethod === 'c2b' && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Paybill Instructions:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to M-Pesa</li>
                      <li>Select Lipa na M-Pesa</li>
                      <li>Select Pay Bill</li>
                      <li>Enter Business Number: <strong>174379</strong></li>
                      <li>Account Number: <strong>Your order reference</strong></li>
                      <li>Amount: <strong>KES {totalAmount}</strong></li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={paymentMethod === 'stk_push' ? handleSTKPush : handleC2BPayment}
              disabled={loading || !phoneNumber}
              className="flex-1"
            >
              {loading ? 'Processing...' : paymentMethod === 'stk_push' ? 'Pay Now' : 'Create Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}