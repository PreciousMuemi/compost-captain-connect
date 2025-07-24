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

interface B2CPayoutRequest {
  phoneNumber: string;
  amount: number;
  paymentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, paymentId }: B2CPayoutRequest = await req.json();

    // Validate required fields
    if (!phoneNumber || !amount || !paymentId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required fields: phoneNumber, amount, paymentId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // M-Pesa credentials from environment
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const businessShortCode = Deno.env.get('MPESA_BUSINESS_SHORT_CODE');
    const initiatorName = Deno.env.get('MPESA_INITIATOR_NAME') || 'testapi';
    const securityCredential = Deno.env.get('MPESA_SECURITY_CREDENTIAL') || 'Safaricom999!*!';
    const baseUrl = Deno.env.get('MPESA_BASE_URL') || 'https://sandbox.safaricom.co.ke';

    console.log('M-Pesa B2C credentials check:', {
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasBusinessShortCode: !!businessShortCode,
      businessShortCode: businessShortCode,
      hasInitiatorName: !!initiatorName,
      hasSecurityCredential: !!securityCredential
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
        error: 'Business Short Code not available. For B2C, you need a real Business Short Code from Safaricom.',
        guidance: 'B2C requires a real Business Short Code, not the sandbox test code. For testing, we will simulate the payment.',
        sandboxMode: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if we're in sandbox mode (using test shortcode)
    const isSandboxMode = businessShortCode === '174379' || businessShortCode === '600000';
    
    if (isSandboxMode) {
      // For sandbox testing, simulate the B2C payout
      console.log('Sandbox mode detected - simulating B2C payout');
      
      // Update payment as completed (simulated)
      await supabase
        .from('payments')
        .update({
          mpesa_transaction_id: `SANDBOX-${Date.now()}`,
          status: 'completed'
        })
        .eq('id', paymentId);

      return new Response(JSON.stringify({
        success: true,
        paymentId: paymentId,
        transactionId: `SANDBOX-${Date.now()}`,
        conversationId: `SANDBOX-CONV-${Date.now()}`,
        originatorConversationId: `SANDBOX-ORIG-${Date.now()}`,
        message: 'B2C payout simulated successfully (Sandbox Mode)',
        sandboxMode: true,
        note: 'This is a sandbox simulation. Real B2C payouts require a production Business Short Code.'
      }), {
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

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to get M-Pesa access token',
        details: tokenData
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);

    // B2C Payout Request
    const b2cData = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: amount,
      PartyA: businessShortCode,
      PartyB: phoneNumber,
      Remarks: `Payment for waste collection - Ref: ${paymentId}`,
      QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-timeout`,
      ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-b2c-result`,
      Occasion: `Waste Collection Payment - ${paymentId}`
    };

    console.log('B2C Request Data:', b2cData);

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
      // Update payment with transaction ID
      await supabase
        .from('payments')
        .update({
          mpesa_transaction_id: b2cResult.TransactionID,
          status: 'completed'
        })
        .eq('id', paymentId);

      return new Response(JSON.stringify({
        success: true,
        paymentId: paymentId,
        transactionId: b2cResult.TransactionID,
        conversationId: b2cResult.ConversationID,
        originatorConversationId: b2cResult.OriginatorConversationID,
        message: 'B2C payout initiated successfully'
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
        error: b2cResult.ResponseDescription || 'B2C payout failed',
        details: b2cResult
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error) {
    console.error('M-Pesa B2C Payout Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler); 