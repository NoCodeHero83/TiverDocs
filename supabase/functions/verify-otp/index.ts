import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  const allowed = (Deno.env.get("SUPABASE_FUNCTIONS_ALLOWED_ORIGINS") || "*").split(",").map(s => s.trim());
  const origin = req.headers.get("origin") || "*";
  const allowOrigin = allowed.includes("*") ? origin : (allowed.includes(origin) ? origin : allowed[0] || "*");
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Client-Info, x-client-info, x-client-version, apikey, Accept, Origin, Referer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    console.log('[verify-otp] request received', { method: req.method });
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    console.log('[verify-otp] headers', {
      origin: req.headers.get('origin'),
      contentType: req.headers.get('content-type'),
      authorizationPresent: !!auth
    });

    if (!token) {
      console.warn('[verify-otp] missing token');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.warn('[verify-otp] invalid token or user not found', { userError });
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    console.log('[verify-otp] authenticated user', { id: userData.user.id, email: userData.user.email });

    if (!req.headers.get("content-type")?.includes("application/json")) {
      console.warn('[verify-otp] invalid content-type', { contentType: req.headers.get('content-type') });
      return new Response(JSON.stringify({ error: "Invalid content-type, expected application/json" }), { status: 400, headers: corsHeaders });
    }

    const body = await req.json().catch(e => {
      console.error('[verify-otp] failed to parse JSON body', e);
      return null;
    });
    console.log('[verify-otp] body', body);

    const code: string = body?.code;
    const documentId: string | null = body?.documentId || null;

    if (!code) {
      console.warn('[verify-otp] missing code in body');
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers: corsHeaders });
    }

    // find matching OTP
    console.log('[verify-otp] querying otp_codes', { code, documentId });
    const { data: rows, error } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('code', code)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[verify-otp] db error', error);
      return new Response(JSON.stringify({ error: 'DB error', details: error }), { status: 500, headers: corsHeaders });
    }

    console.log('[verify-otp] otp query rows', rows);

    const row = (rows && rows[0]) || null;
    if (!row) {
      console.warn('[verify-otp] code not found');
      return new Response(JSON.stringify({ valid: false, error: 'Code not found' }), { status: 400, headers: corsHeaders });
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      console.warn('[verify-otp] code expired', { expires_at: row.expires_at });
      return new Response(JSON.stringify({ valid: false, error: 'Code expired' }), { status: 400, headers: corsHeaders });
    }

    // consume (delete) the OTP
    const { error: delErr } = await supabaseAdmin.from('otp_codes').delete().eq('id', row.id);
    if (delErr) console.error('[verify-otp] delete otp error', delErr);
    else console.log('[verify-otp] otp consumed', { id: row.id });

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ valid: true }), { status: 200, headers });
  } catch (err) {
    console.error('[verify-otp] exception', err);
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
