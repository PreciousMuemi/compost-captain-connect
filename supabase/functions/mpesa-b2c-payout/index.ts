// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface PayoutRequest {
  phoneNumber: string;
  amount: number;
  paymentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, paymentId }: PayoutRequest = await req.json();

    // M-Pesa credentials from environment
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const initiatorName = Deno.env.get('MPESA_INITIATOR_NAME');
    const initiatorPassword = Deno.env.get('MPESA_INITIATOR_PASSWORD');
    const shortCode = Deno.env.get('MPESA_B2C_SHORT_CODE');
    const baseUrl = Deno.env.get('MPESA_BASE_URL') || 'https://sandbox.safaricom.co.ke';

    if (!consumerKey || !consumerSecret || !initiatorName || !initiatorPassword || !shortCode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing M-Pesa B2C credentials. Please set all required environment variables.'
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

    // Initiate B2C payment
    const b2cData = {
      InitiatorName: initiatorName,
      SecurityCredential: initiatorPassword, // For sandbox, use plain password; for prod, use encrypted
      CommandID: 'BusinessPayment',
      Amount: amount,
      PartyA: shortCode,
      PartyB: phoneNumber,
      Remarks: 'Waste payout',
      QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      Occasion: paymentId
    };

    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(b2cData),
    });

    const b2cResult = await b2cResponse.json();
    console.log('M-Pesa B2C Response:', b2cResult);

    if (b2cResult.ResponseCode === '0') {
      // Update payment record as pending
      await supabase
        .from('payments')
        .update({ status: 'pending', mpesa_transaction_id: b2cResult.ConversationID })
        .eq('id', paymentId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Payout initiated. Farmer will receive funds shortly.',
        conversationId: b2cResult.ConversationID
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      // Update payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      return new Response(JSON.stringify({
        success: false,
        error: b2cResult.errorMessage || b2cResult.ResponseDescription || 'Payout initiation failed',
        details: b2cResult
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (error) {
    console.error('M-Pesa B2C Payout Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler); 