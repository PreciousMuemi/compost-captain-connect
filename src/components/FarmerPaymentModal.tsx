import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  price_per_kg: number;
  available_kg: number;
  description: string;
}

interface FarmerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess?: () => void;
}

export function FarmerPaymentModal({
  isOpen,
  onClose,
  product,
  onSuccess
}: FarmerPaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const totalAmount = product ? parseInt(quantity) * product.price_per_kg : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !quantity || !product) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(quantity) > product.available_kg) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.available_kg}kg available`,
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 9 && cleanPhone.length !== 12) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678)",
        variant: "destructive",
      });
      return;
    }

    // Format phone number for M-Pesa
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 9) {
      formattedPhone = `254${cleanPhone}`;
    } else if (cleanPhone.startsWith('0')) {
      formattedPhone = `254${cleanPhone.substring(1)}`;
    }

    setIsProcessing(true);

    try {
      // First create/get customer record
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', profile?.phone_number)
        .single();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: profile?.full_name || 'Unknown',
            phone_number: profile?.phone_number || '',
            location: profile?.location || '',
            is_farmer: true,
            discount_percentage: 10 // Farmer discount
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
          quantity_kg: parseInt(quantity),
          price_per_kg: product.price_per_kg,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Initiate M-Pesa payment
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phoneNumber: formattedPhone,
          amount: totalAmount,
          orderId: order.id,
          paymentType: 'manure_sale'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Initiated",
          description: "Check your phone for the M-Pesa prompt to complete the payment",
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(data.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Product payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setPhoneNumber("");
      setQuantity("10");
      onClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Product:</p>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm">KES {product.price_per_kg}/kg</p>
            <p className="text-xs text-muted-foreground">{product.available_kg}kg available</p>
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isProcessing}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantity (kg)</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.available_kg}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isProcessing}
              required
            />
          </div>

          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium">Total: KES {totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {quantity}kg × KES {product.price_per_kg}/kg
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay with M-Pesa'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}