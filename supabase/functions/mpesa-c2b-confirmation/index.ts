// supabase/functions/mpesa-c2b-confirmation/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const body = await req.json();

  // Extract details from M-Pesa confirmation
  const {
    TransID,
    TransAmount,
    MSISDN,
    BillRefNumber,
    TransTime,
    BusinessShortCode,
    FirstName,
    MiddleName,
    LastName
  } = body;

  // Example: Update order/payment in your DB
  // You may need to adjust table/column names to match your schema
  await supabase
    .from("orders")
    .update({
      status: "paid",
      mpesa_transaction_id: TransID,
      paid_at: new Date().toISOString(),
      payer_phone: MSISDN,
      payer_name: [FirstName, MiddleName, LastName].filter(Boolean).join(" ")
    })
    .eq("account_no", BillRefNumber);

  // You can also log the payment in a payments table if needed

  return new Response(
    JSON.stringify({
      ResultCode: 0,
      ResultDesc: "Success"
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
