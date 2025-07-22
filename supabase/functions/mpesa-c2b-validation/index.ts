// supabase/functions/mpesa-c2b-validation/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // Optionally, parse and validate the request body here
  return new Response(
    JSON.stringify({
      ResultCode: "0",
      ResultDesc: "Accepted"
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
