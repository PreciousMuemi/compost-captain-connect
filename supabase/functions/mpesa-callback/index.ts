import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('M-Pesa Callback received:', body);

    // Handle STK Push callback
    if (body.Body && body.Body.stkCallback) {
      const callback = body.Body.stkCallback;
      const resultCode = callback.ResultCode;
      const merchantRequestID = callback.MerchantRequestID;
      const checkoutRequestID = callback.CheckoutRequestID;

      if (resultCode === 0) {
        // Payment successful
        const callbackMetadata = callback.CallbackMetadata;
        let transactionId = '';
        let phoneNumber = '';
        let amount = 0;

        callbackMetadata.Item.forEach((item: any) => {
          switch (item.Name) {
            case 'MpesaReceiptNumber':
              transactionId = item.Value;
              break;
            case 'PhoneNumber':
              phoneNumber = item.Value;
              break;
            case 'Amount':
              amount = item.Value;
              break;
          }
        });

        // Update payment record
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            mpesa_transaction_id: transactionId
          })
          .eq('mpesa_transaction_id', checkoutRequestID);

        if (error) {
          console.error('Error updating payment:', error);
        }

        console.log('Payment completed:', { transactionId, phoneNumber, amount });
      } else {
        // Payment failed
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'failed'
          })
          .eq('mpesa_transaction_id', checkoutRequestID);

        if (error) {
          console.error('Error updating failed payment:', error);
        }

        console.log('Payment failed:', { merchantRequestID, checkoutRequestID });
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('M-Pesa Callback Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);