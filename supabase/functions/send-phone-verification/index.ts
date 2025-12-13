import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";
import { Resend } from "resend";



const corsHeaders = {
  "Access-Control-Allow-Origin": "https://theronm22.sg-host.com",
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
      throw new Error("Missing environment variable: PROJECT_SUPABASE_URL");
    }
    if (!supabaseServiceKey) {
      throw new Error("Missing environment variable: PROJECT_SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "send") {
      const { email, newPhone }: SendVerificationRequest = await req.json();

      if (!email || !newPhone) {
        return new Response(
          JSON.stringify({ error: "Email and new phone are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      console.log(`Generating verification code for ${email}, new phone: ${newPhone}`);

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
        console.error("Error inserting verification code:", insertError);
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
      const { data, error } = (await resend.emails.send({
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
        console.error("Error sending email:", error);
        return new Response(
          JSON.stringify({ error: "Failed to send verification email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Email sent successfully:", data);

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      const { email, code }: VerifyCodeRequest = await req.json();

      if (!email || !code) {
        return new Response(
          JSON.stringify({ error: "Email and code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Verifying code for ${email}`);

      // Get the verification record
      const { data: verificationData, error: fetchError } = await supabase
        .from("phone_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .single();

      if (fetchError || !verificationData) {
        console.error("Verification code not found or invalid:", fetchError);
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

      console.log(`Verification successful for ${email}, new phone: ${newPhone}`);

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
    console.error("Error in send-phone-verification function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
