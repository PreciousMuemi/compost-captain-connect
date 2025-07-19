import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerId?: string;
  farmerName?: string;
  defaultAmount?: number;
  onSuccess?: () => void;
}

export function MpesaPaymentModal({
  isOpen,
  onClose,
  farmerId,
  farmerName,
  defaultAmount = 0,
  onSuccess
}: MpesaPaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phoneNumber: formattedPhone,
          amount: parseInt(amount),
          farmerId: farmerId,
          paymentType: 'waste_purchase'
        }
      });

      if (error) {
        throw error;
      }

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
      console.error('M-Pesa payment error:', error);
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
      setAmount(defaultAmount.toString());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            M-Pesa Payment
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {farmerName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Payment for:</p>
              <p className="font-medium">{farmerName}</p>
            </div>
          )}
          
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
            <p className="text-xs text-muted-foreground mt-1">
              Enter Kenyan phone number (Safaricom, Airtel, or Telkom)
            </p>
          </div>
          
          <div>
            <Label htmlFor="amount">Amount (KSh)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isProcessing}
              required
            />
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
                'Send Payment Request'
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
          
          <div className="text-xs text-muted-foreground">
            <p>• You will receive an M-Pesa prompt on your phone</p>
            <p>• Enter your M-Pesa PIN to complete the payment</p>
            <p>• Payment confirmation will be sent via SMS</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}