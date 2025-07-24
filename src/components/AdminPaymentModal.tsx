import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, DollarSign, User, AlertCircle } from "lucide-react";

interface AdminPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: { id: string; name: string; phone_number: string } | null;
  onSuccess: () => void;
}

export function AdminPaymentModal({
  isOpen,
  onClose,
  farmer,
  onSuccess,
}: AdminPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentReason, setPaymentReason] = useState("waste_purchase");

  if (!farmer) return null;

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          farmer_id: farmer.id,
          amount: parseFloat(amount),
          payment_type: paymentReason,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Initiate B2C payout via edge function
      const { data, error } = await supabase.functions.invoke('mpesa-b2c-payout', {
        body: {
          phoneNumber: farmer.phone_number,
          amount: parseFloat(amount),
          paymentId: payment.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Initiated",
          description: `Payment of KES ${parseFloat(amount).toLocaleString()} initiated to ${farmer.name}`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
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
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Send M-Pesa Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Farmer Info */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Farmer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                <span className="font-medium">{farmer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="font-mono text-sm">{farmer.phone_number}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <div>
            <Label htmlFor="amount">Payment Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Payment Reason */}
          <div>
            <Label htmlFor="reason">Payment Reason</Label>
            <select
              id="reason"
              value={paymentReason}
              onChange={(e) => setPaymentReason(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="waste_purchase">Waste Purchase</option>
              <option value="bonus">Bonus Payment</option>
              <option value="refund">Refund</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Payment Process:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Payment will be sent directly to the farmer's phone</li>
                    <li>Farmer will receive an M-Pesa notification</li>
                    <li>Payment status will be updated automatically</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Send Payment
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 