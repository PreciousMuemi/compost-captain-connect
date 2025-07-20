// Add this at the top of your file for local linting:
declare const Deno: any;
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
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

    // For sandbox testing - provide better error handling
    if (!consumerKey || !consumerSecret) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'M-Pesa consumer credentials missing. Please configure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in Supabase secrets.',
        guidance: 'Get these from Safaricom Daraja Portal: https://developer.safaricom.co.ke/'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!businessShortCode || businessShortCode === 'N/A') {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Business Short Code not available. In sandbox, you can use 174379 as test shortcode.',
        guidance: 'For production, you need a real Business Short Code from Safaricom.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!passkey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'M-Pesa passkey missing. For sandbox use: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        guidance: 'For production, get your passkey from Safaricom Daraja Portal.'
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