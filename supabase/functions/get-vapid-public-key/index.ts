import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  if (!publicKey) {
    return Response.json({ error: "Push notifications are not configured" }, { status: 503, headers: cors });
  }

  return Response.json({ publicKey }, { headers: cors });
});
