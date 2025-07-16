import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const sessionId = params.get('sessionId') || '';
    const serviceCode = params.get('serviceCode') || '';
    const phoneNumber = params.get('phoneNumber') || '';
    const text = params.get('text') || '';

    console.log('USSD Request:', { sessionId, serviceCode, phoneNumber, text });

    let response = '';
    const inputs = text.split('*');
    const level = inputs.length;

    if (text === '') {
      // Main menu
      response = `CON Welcome to Captain Compost
1. Report Waste
2. Check Status
3. My Payments`;
    } else if (inputs[0] === '1') {
      // Report waste flow
      if (level === 1) {
        response = `CON Select waste type:
1. Animal Manure
2. Coffee Husks
3. Rice Hulls
4. Maize Stalks
5. Other`;
      } else if (level === 2) {
        response = `CON Enter quantity in KG:`;
      } else if (level === 3) {
        response = `CON Enter your location:`;
      } else if (level === 4) {
        // Process the waste report
        const wasteTypes = ['', 'animal_manure', 'coffee_husks', 'rice_hulls', 'maize_stalks', 'other'];
        const wasteType = wasteTypes[parseInt(inputs[1])];
        const quantity = parseFloat(inputs[2]);
        const location = inputs[3];

        if (!wasteType || isNaN(quantity) || quantity <= 0) {
          response = `END Invalid input. Please try again.`;
        } else {
          // Find or create farmer profile
          let { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

          if (!profile) {
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert({
                full_name: `Farmer ${phoneNumber}`,
                phone_number: phoneNumber,
                role: 'farmer'
              })
              .select('id')
              .single();

            if (profileError) {
              console.error('Profile creation error:', profileError);
              response = `END Error creating profile. Please try again.`;
            } else {
              profile = newProfile;
            }
          }

          if (profile) {
            // Create waste report
            const { error: reportError } = await supabase
              .from('waste_reports')
              .insert({
                farmer_id: profile.id,
                waste_type: wasteType,
                quantity_kg: quantity,
                location: location,
                status: 'reported'
              });

            if (reportError) {
              console.error('Waste report error:', reportError);
              response = `END Error submitting report. Please try again.`;
            } else {
              response = `END Waste report submitted successfully!
Type: ${wasteType.replace('_', ' ')}
Quantity: ${quantity}kg
Location: ${location}

We will contact you for pickup.`;
            }
          }
        }
      }
    } else if (inputs[0] === '2') {
      // Check status
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        const { data: reports } = await supabase
          .from('waste_reports')
          .select('waste_type, quantity_kg, status, created_at')
          .eq('farmer_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (reports && reports.length > 0) {
          let statusText = 'CON Your recent reports:\n';
          reports.forEach((report, index) => {
            statusText += `${index + 1}. ${report.waste_type} - ${report.quantity_kg}kg - ${report.status}\n`;
          });
          statusText += '0. Back to main menu';
          response = statusText;
        } else {
          response = `END No waste reports found for your number.`;
        }
      } else {
        response = `END No profile found. Please report waste first.`;
      }
    } else if (inputs[0] === '3') {
      // Check payments
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status, created_at')
          .eq('farmer_id', profile.id)
          .eq('payment_type', 'waste_purchase')
          .order('created_at', { ascending: false })
          .limit(3);

        if (payments && payments.length > 0) {
          let paymentText = 'CON Your recent payments:\n';
          payments.forEach((payment, index) => {
            paymentText += `${index + 1}. KES ${payment.amount} - ${payment.status}\n`;
          });
          paymentText += '0. Back to main menu';
          response = paymentText;
        } else {
          response = `END No payments found.`;
        }
      } else {
        response = `END No profile found. Please report waste first.`;
      }
    } else {
      response = `END Invalid option. Please try again.`;
    }

    return new Response(response, {
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('USSD Handler Error:', error);
    return new Response('END Service temporarily unavailable. Please try again later.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);