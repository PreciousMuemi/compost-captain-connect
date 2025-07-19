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

interface PaymentRequest {
  phoneNumber: string;
  amount: number;
  orderId?: string;
  farmerId?: string;
  paymentType: 'waste_purchase' | 'manure_sale';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, orderId, farmerId, paymentType }: PaymentRequest = await req.json();

    // M-Pesa credentials from environment
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const businessShortCode = Deno.env.get('MPESA_BUSINESS_SHORT_CODE');
    const passkey = Deno.env.get('MPESA_PASSKEY');
    const baseUrl = Deno.env.get('MPESA_BASE_URL') || 'https://sandbox.safaricom.co.ke';

    console.log('M-Pesa credentials check:', {
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasBusinessShortCode: !!businessShortCode,
      businessShortCode: businessShortCode,
      hasPasskey: !!passkey
    });

    if (!consumerKey || !consumerSecret || !businessShortCode || !passkey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'M-Pesa credentials not configured properly',
        details: {
          hasConsumerKey: !!consumerKey,
          hasConsumerSecret: !!consumerSecret,
          hasBusinessShortCode: !!businessShortCode,
          hasPasskey: !!passkey
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get access token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(businessShortCode + passkey + timestamp);

    // Create payment record first
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        farmer_id: farmerId || null,
        order_id: orderId || null,
        amount: amount,
        payment_type: paymentType,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return new Response(JSON.stringify({ error: 'Failed to create payment record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Initiate STK Push
    const stkPushData = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: businessShortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      AccountReference: `CC-${payment.id}`,
      TransactionDesc: paymentType === 'waste_purchase' ? 'Waste Collection Payment' : 'Manure Purchase'
    };

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushData),
    });

    const stkData = await stkResponse.json();
    
    console.log('M-Pesa STK Response:', stkData);

    if (stkData.ResponseCode === '0') {
      // Update payment with checkout request ID
      await supabase
        .from('payments')
        .update({
          mpesa_transaction_id: stkData.CheckoutRequestID
        })
        .eq('id', payment.id);

      return new Response(JSON.stringify({
        success: true,
        paymentId: payment.id,
        checkoutRequestId: stkData.CheckoutRequestID,
        message: 'Payment initiated. Please complete on your phone.'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      // Update payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return new Response(JSON.stringify({
        success: false,
        error: stkData.errorMessage || stkData.ResponseDescription || 'Payment initiation failed',
        details: stkData
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error) {
    console.error('M-Pesa Payment Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);