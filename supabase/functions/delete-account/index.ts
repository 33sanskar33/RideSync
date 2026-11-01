import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);

    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") return json({ error: "Explicit DELETE confirmation is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !publishableKeys || !secretKeys) {
      throw new Error("Supabase function credentials are not configured");
    }

    const publishableKey = JSON.parse(publishableKeys).default;
    const secretKey = JSON.parse(secretKeys).default;
    if (!publishableKey || !secretKey) throw new Error("Supabase API keys are unavailable");

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Your session is invalid. Sign in again and retry." }, 401);

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Preserve rooms created by this user, but close them and remove the creator identity.
    const { error: roomsError } = await admin
      .from("ride_rooms")
      .update({ created_by: null, status: "ended", ended_at: new Date().toISOString(), active_since: null, paused_at: null })
      .eq("created_by", user.id);
    if (roomsError) throw roomsError;

    // These references otherwise prevent deletion when this user acknowledged another rider's SOS.
    const { error: acknowledgedError } = await admin
      .from("ride_sos_alerts")
      .update({ acknowledged_by: null })
      .eq("acknowledged_by", user.id);
    if (acknowledgedError) throw acknowledgedError;

    const { error: resolvedError } = await admin
      .from("ride_sos_alerts")
      .update({ resolved_by: null })
      .eq("resolved_by", user.id);
    if (resolvedError) throw resolvedError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json({ success: true });
  } catch (error) {
    console.error("delete-account failed:", error);
    return json({ error: error instanceof Error ? error.message : "Account deletion failed" }, 500);
  }
});
