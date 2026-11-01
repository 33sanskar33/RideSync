import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "Missing authorization" }, { status: 401, headers: cors });
    const url = Deno.env.get("SUPABASE_URL")!;
    const publicApiKey = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default;
    const secretApiKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    if (!publicApiKey || !secretApiKey) throw new Error("Supabase API keys are not configured");
    const userClient = createClient(url, publicApiKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return Response.json({ error: "Unauthenticated" }, { status: 401, headers: cors });
    const { alertId } = await req.json();
    if (typeof alertId !== "string" || alertId.length > 64) return Response.json({ error: "Invalid alertId" }, { status: 400, headers: cors });
    const admin = createClient(url, secretApiKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: alert, error: alertError } = await admin.from("ride_sos_alerts").select("id, room_id, user_id, rider_name, message, latitude, longitude").eq("id", alertId).maybeSingle();
    if (alertError) throw alertError;
    if (!alert || alert.user_id !== user.id) return Response.json({ error: "SOS alert not found for this user" }, { status: 403, headers: cors });
    const { data: members, error: membersError } = await admin.from("ride_members").select("user_id").eq("room_id", alert.room_id).neq("user_id", user.id).not("user_id", "is", null);
    if (membersError) throw membersError;
    const recipientIds = [...new Set((members ?? []).map((member) => member.user_id).filter(Boolean))];
    if (!recipientIds.length) return Response.json({ sent: 0 }, { headers: cors });
    const { data: subscriptions, error: subError } = await admin.from("ride_push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", recipientIds);
    if (subError) throw subError;
    if (!subscriptions?.length) return Response.json({ sent: 0 }, { headers: cors });
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) throw new Error("VAPID keys are not configured");
    webpush.setVapidDetails("https://github.com/33sanskar33/RideSync", vapidPublic, vapidPrivate);
    const appBaseUrl = "https://ride-sync-7lik.vercel.app";
    const payload = JSON.stringify({ title: `🚨 SOS: ${alert.rider_name} needs help`, body: alert.message || "Emergency assistance needed", url: `${appBaseUrl}/room/${alert.room_id}`, tag: `ridesync-sos-${alert.id}`, latitude: alert.latitude, longitude: alert.longitude });
    const results = await Promise.allSettled(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600, urgency: "high" },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        const message = error instanceof Error ? error.message : "Unknown Web Push error";
        console.error("Web Push delivery failed:", { status, message });
        if (status === 404 || status === 410) {
          await admin.from("ride_push_subscriptions").delete().eq("id", sub.id);
        }
        throw error;
      }
    }));
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    console.info("SOS Web Push delivery summary:", { recipients: subscriptions.length, sent, failed });
    return Response.json({ sent, failed }, { headers: cors });
  } catch (error) {
    console.error("send-sos-push failed:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Push delivery failed" }, { status: 500, headers: cors });
  }
});
