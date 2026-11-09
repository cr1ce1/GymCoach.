import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER_ID = "bd340729-7dd9-4d57-a170-ebb7b22e1a49";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function param(req: Request, name: string) {
  return new URL(req.url).searchParams.get(name) ?? "";
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return respond({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return respond({ error: "Authentication required" }, 401);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!projectUrl || !publishableKey) return respond({ error: "Server configuration is incomplete" }, 500);
  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return respond({ error: "Invalid session" }, 401);
  if (authData.user.id !== OWNER_ID) return respond({ error: "Owner access required" }, 403);
  const action = param(req, "action");
  try {
    if (req.method === "GET" && action === "users") {
      const { data, error } = await client.rpc("admin_search_users", { p_search: param(req, "q").slice(0,120) });
      if (error) throw error;
      return respond({ users: data ?? [] });
    }
    if (req.method === "GET" && action === "stats") {
      const { data, error } = await client.rpc("admin_dashboard_stats");
      if (error) throw error;
      return respond({ stats: data });
    }
    if (req.method === "GET" && action === "history") {
      let query = client.from("subscription_history")
        .select("id,user_id,changed_by,event_type,duration_days,reason,starts_at,expires_at,created_at")
        .order("created_at", { ascending: false }).limit(100);
      const userId = param(req, "user_id");
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return respond({ history: data ?? [] });
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return respond({ error: "Invalid JSON body" }, 400);
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      const reason = typeof body.reason === "string" ? body.reason.slice(0,500) : null;
      if (!userId) return respond({ error: "user_id is required" }, 400);
      if (action === "grant" || action === "set") {
        const days = Number(body.duration_days);
        if (![0,7,30,90,180,365].includes(days)) return respond({ error: "Unsupported duration" }, 400);
        const rpc = action === "grant" ? "admin_grant_plus" : "admin_set_plus";
        const { data, error } = await client.rpc(rpc, {
          p_target_user_id: userId, p_duration_days: days, p_reason: reason,
        });
        if (error) throw error;
        return respond(data);
      }
      if (action === "cancel") {
        const { data, error } = await client.rpc("admin_cancel_plus", {
          p_target_user_id: userId, p_reason: reason,
        });
        if (error) throw error;
        return respond(data);
      }
    }
    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("owner-admin operation failed", error);
    return respond({ error: "Administrative operation failed" }, 400);
  }
});
