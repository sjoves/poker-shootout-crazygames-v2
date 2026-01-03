import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

const logStep = (step: string) => {
  console.log(`[USERNAME-LOOKUP] ${step}`);
};

const getClientIp = (req: Request): string => {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
};

const isRateLimited = (clientIp: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const clientIp = getClientIp(req);
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      logStep("Rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const { username } = await req.json();
    
    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate username format to prevent injection
    const sanitizedUsername = username.trim();
    if (sanitizedUsername.length < 2 || sanitizedUsername.length > 20) {
      // Return generic error - don't reveal validation details
      return new Response(
        JSON.stringify({ email: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      return new Response(
        JSON.stringify({ email: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Use service role to lookup user email securely
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // First get the user_id from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", sanitizedUsername)
      .maybeSingle();

    if (profileError || !profile) {
      logStep("Username not found or error");
      // Return null email - don't reveal if username exists
      return new Response(
        JSON.stringify({ email: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get the user's email using admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      profile.user_id
    );

    if (userError || !userData?.user?.email) {
      logStep("User data not found");
      return new Response(
        JSON.stringify({ email: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Lookup completed successfully");
    
    return new Response(
      JSON.stringify({ email: userData.user.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    logStep("ERROR occurred");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
