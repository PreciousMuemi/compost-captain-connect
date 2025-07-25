// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
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

// Add this at the top of your file for local linting:
declare const Deno: any;
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
1. Register as Farmer
2. Report Waste
3. Check Status  
4. My Profile
5. My Payments
6. Buy Products`;
    } else if (inputs[0] === '1') {
      // Farmer registration flow
      if (level === 1) {
        response = `CON Enter your full name:`;
      } else if (level === 2) {
        response = `CON Enter your location (village/town):`;
      } else if (level === 3) {
        response = `CON Enter your farm type:
1. Dairy Farm
2. Coffee Farm
3. Maize Farm
4. Mixed Farming
5. Other`;
      } else if (level === 4) {
        response = `CON Enter your ID number:`;
      } else if (level === 5) {
        response = `CON Enter farm size (acres):`;
      } else if (level === 6) {
        // Process the registration
        const fullName = inputs[1];
        const location = inputs[2];
        const farmTypeIndex = parseInt(inputs[3]);
        const farmTypes = ['', 'dairy', 'coffee', 'maize', 'mixed', 'other'];
        const farmType = farmTypes[farmTypeIndex];
        const idNumber = inputs[4];
        const farmSize = inputs[5];

        if (!fullName || !location || !farmType || !idNumber || !farmSize) {
          response = `END Invalid input. Please try again.`;
        } else {
          // Check if farmer already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, full_name, location')
            .eq('phone_number', phoneNumber)
            .single();

          if (existingProfile) {
            response = `END You are already registered!
Name: ${existingProfile.full_name}
Location: ${existingProfile.location}
Phone: ${phoneNumber}`;
          } else {
            // Create new farmer profile
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert({
                full_name: fullName,
                phone_number: phoneNumber,
                location: location,
                role: 'farmer',
                farm_type: farmType,
                id_number: idNumber,
                farm_size: farmSize
              })
              .select('id, full_name, location')
              .single();

            if (profileError) {
              console.error('Profile creation error:', profileError);
              response = `END Error creating profile. Please try again.`;
            } else {
              response = `END Registration successful!
Name: ${newProfile.full_name}
Location: ${newProfile.location}
Phone: ${phoneNumber}
Farm Type: ${farmType}
ID Number: ${idNumber}
Farm Size: ${farmSize} acres

You can now report waste and earn money!`;
            }
          }
        }
      }
    } else if (inputs[0] === '2') {
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
                role: 'farmer',
                location: location
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
    } else if (inputs[0] === '3') {
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
        response = `END No profile found. Please register first.`;
      }
    } else if (inputs[0] === '4') {
      // My Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone_number, location, created_at, farm_type, id_number, farm_size')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        const { data: reports } = await supabase
          .from('waste_reports')
          .select('quantity_kg, status')
          .eq('farmer_id', profile.id);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('farmer_id', profile.id)
          .eq('status', 'completed');

        const totalReports = reports?.length || 0;
        const totalEarnings = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const joinDate = new Date(profile.created_at).toLocaleDateString();

        response = `END Your Profile:
Name: ${profile.full_name}
Phone: ${profile.phone_number}
Location: ${profile.location || 'Not set'}
Farm Type: ${profile.farm_type || 'Not set'}
Joined: ${joinDate}
Total Reports: ${totalReports}
Total Earnings: KES ${totalEarnings.toFixed(2)}`;
      } else {
        response = `END No profile found. Please register first.`;
      }
    } else if (inputs[0] === '5') {
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
        response = `END No profile found. Please register first.`;
      }
    } else if (inputs[0] === '6') {
      // Buy products flow
      if (level === 1) {
        response = `CON Select product:
1. Processed Manure (KES 50/kg)
2. Organic Pellets (KES 80/kg)
3. Compost Mix (KES 60/kg)`;
      } else if (level === 2) {
        response = `CON Enter quantity in KG:`;
      } else if (level === 3) {
        response = `CON Enter delivery location:`;
      } else if (level === 4) {
        // Process the product order
        const products = ['', 'processed_manure', 'organic_pellets', 'compost_mix'];
        const prices = [0, 50, 80, 60];
        const productIndex = parseInt(inputs[1]);
        const product = products[productIndex];
        const pricePerKg = prices[productIndex];
        const quantity = parseFloat(inputs[2]);
        const location = inputs[3];

        if (!product || isNaN(quantity) || quantity <= 0) {
          response = `END Invalid input. Please try again.`;
        } else {
          const totalAmount = quantity * pricePerKg;
          
          // Find or create customer profile
          let { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

          if (!customer) {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                name: `Customer ${phoneNumber}`,
                phone_number: phoneNumber,
                location: location
              })
              .select('id')
              .single();

            if (customerError) {
              console.error('Customer creation error:', customerError);
              response = `END Error creating customer profile. Please try again.`;
            } else {
              customer = newCustomer;
            }
          }

          if (customer) {
            // Create order
            const { error: orderError } = await supabase
              .from('orders')
              .insert({
                customer_id: customer.id,
                quantity_kg: quantity,
                price_per_kg: pricePerKg,
                total_amount: totalAmount,
                status: 'pending'
              });

            if (orderError) {
              console.error('Order creation error:', orderError);
              response = `END Error creating order. Please try again.`;
            } else {
              response = `END Order placed successfully!
Product: ${product.replace('_', ' ')}
Quantity: ${quantity}kg
Total: KES ${totalAmount}
Location: ${location}

Pay via M-Pesa: 0700000000
We will deliver within 2-3 days.`;
            }
          }
        }
      }
    } else if (inputs[0] === '7') {
      // Update Profile
      if (level === 1) {
        response = `CON Enter your full name:`;
      } else if (level === 2) {
        response = `CON Enter your location (village/town):`;
      } else if (level === 3) {
        response = `CON Enter your farm type:
1. Dairy Farm
2. Coffee Farm
3. Maize Farm
4. Mixed Farming
5. Other`;
      } else if (level === 4) {
        response = `CON Enter your ID number:`;
      } else if (level === 5) {
        response = `CON Enter farm size (acres):`;
      } else if (level === 6) {
        // Process the update
        const fullName = inputs[1];
        const location = inputs[2];
        const farmTypeIndex = parseInt(inputs[3]);
        const farmTypes = ['', 'dairy', 'coffee', 'maize', 'mixed', 'other'];
        const farmType = farmTypes[farmTypeIndex];
        const idNumber = inputs[4];
        const farmSize = inputs[5];

        if (!fullName || !location || !farmType || !idNumber || !farmSize) {
          response = `END Invalid input. Please try again.`;
        } else {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              location: location,
              farm_type: farmType,
              id_number: idNumber,
              farm_size: farmSize
            })
            .eq('phone_number', phoneNumber);

          if (updateError) {
            console.error('Profile update error:', updateError);
            response = `END Error updating profile. Please try again.`;
          } else {
            response = `END Profile updated successfully!
Name: ${fullName}
Location: ${location}
Farm Type: ${farmType}
ID Number: ${idNumber}
Farm Size: ${farmSize} acres`;
          }
        }
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