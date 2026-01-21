import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";
import { Resend } from "resend";



const allowedOrigins = [
  "https://ipr-web.lovable.app",
  "https://theronm22.sg-host.com",
];

const getCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.some(o => origin.includes(o.replace('https://', ''))) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface SendVerificationRequest {
  email: string;
  newPhone: string;
}

  interface ResendEmailData {
    id: string;
  }

  interface ResendEmailError {
    name: string;
    message: string;
    statusCode: number;
  }

  interface VerifyCodeRequest {
  email: string;
  code: string;
}

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("PROJECT_SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      console.error("Missing PROJECT_SUPABASE_URL");
      throw new Error("Missing environment variable: PROJECT_SUPABASE_URL");
    }
    if (!supabaseServiceKey) {
      console.error("Missing PROJECT_SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Missing environment variable: PROJECT_SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    
    // Parse body safely - handle case where body might be empty or invalid
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!action && body.action) {
      action = body.action as string;
    }
    
    console.log('Edge function called with action:', action, 'body:', JSON.stringify(body));

    if (action === "send") {
      const { email, newPhone } = body as unknown as SendVerificationRequest;

      if (!email || !newPhone) {
        return new Response(
          JSON.stringify({ error: "Email and new phone are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry



      // Delete any existing codes for this email
      await supabase
        .from("phone_verification_codes")
        .delete()
        .eq("email", email);

      // Insert new code
      const { error: insertError } = await supabase
        .from("phone_verification_codes")
        .insert({
          email,
          code,
          new_phone: newPhone,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {

        return new Response(
          JSON.stringify({ error: "Failed to generate verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        throw new Error("Missing environment variable: RESEND_API_KEY");
      }
      const resend = new Resend(RESEND_API_KEY);
      
      // Send email with code using Resend API
      const { data: _data, error } = (await resend.emails.send({
        from: "IPR Verification <onboarding@resend.dev>",
        to: [email],
        subject: "Profile Change Verification Code",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Phone Number Change Verification</h1>
              <p>You have requested to change your phone number. Please use the following 6-digit code to verify this change:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
              </div>
              <p style="color: #666;">This code will expire in 10 minutes.</p>
              <p style="color: #666;">If you did not request this change, please ignore this email or contact support.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #999; font-size: 12px;">IPR - Investment Property Rentals</p>
            </div>
          `,
      })) as unknown as { data: ResendEmailData | null; error: ResendEmailError | null };

      if (error) {

        return new Response(
          JSON.stringify({ error: "Failed to send verification email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }


      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      const { email, code } = body as unknown as VerifyCodeRequest;

      if (!email || !code) {
        return new Response(
          JSON.stringify({ error: "Email and code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }



      // Get the verification record
      const { data: verificationData, error: fetchError } = await supabase
        .from("phone_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .single();

      if (fetchError || !verificationData) {

        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if code is expired
      if (new Date(verificationData.expires_at) < new Date()) {
        // Delete expired code
        await supabase
          .from("phone_verification_codes")
          .delete()
          .eq("id", verificationData.id);

        return new Response(
          JSON.stringify({ error: "Verification code has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Code is valid - return the new phone number for the frontend to update
      const newPhone = verificationData.new_phone;

      // Delete the used code
      await supabase
        .from("phone_verification_codes")
        .delete()
        .eq("id", verificationData.id);



      return new Response(
        JSON.stringify({ success: true, newPhone }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
