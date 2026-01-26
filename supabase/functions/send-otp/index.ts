import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || null;
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || null;
// Token for https://api2mail.vercel.app/send-email
const SENDAPI_TOKEN = Deno.env.get("SENDAPI_TOKEN") || null;
const SMTP_HOST = Deno.env.get("SMTP_HOST") || null;
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER") || null;
const SMTP_PASS = Deno.env.get("SMTP_PASS") || null;
const SMTP_SECURE = (Deno.env.get("SMTP_SECURE") || "false") === "true";
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
    console.log('[send-otp] request received', { method: req.method });
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    console.log('[send-otp] headers', { origin: req.headers.get('origin'), contentType: req.headers.get('content-type'), authorizationPresent: !!auth });

    if (!token) {
      console.warn('[send-otp] missing token');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.warn('[send-otp] invalid token or user not found', { userError });
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    console.log('[send-otp] authenticated user', { id: userData.user.id, email: userData.user.email });

    if (!req.headers.get("content-type")?.includes("application/json")) {
      console.warn('[send-otp] invalid content-type', { contentType: req.headers.get('content-type') });
      return new Response(JSON.stringify({ error: "Invalid content-type, expected application/json" }), { status: 400, headers: corsHeaders });
    }

    const body = await req.json().catch(e => {
      console.error('[send-otp] failed to parse JSON body', e);
      return null;
    });
    console.log('[send-otp] body', body);

    const email: string | null = body?.email || userData.user.email || null;
    const documentId: string | null = body?.documentId || null;

    if (!documentId) {
      console.warn('[send-otp] missing documentId');
      return new Response(JSON.stringify({ error: "Missing documentId" }), { status: 400, headers: corsHeaders });
    }

    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    console.log('[send-otp] generated code', { code, expiresAt });

    // insert into otp_codes
    const payload = {
      email,
      code,
      document_id: documentId,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error: insertError } = await supabaseAdmin.from('otp_codes').insert(payload).select().limit(1);
    if (insertError) {
      console.error('[send-otp] db insert error', insertError);
      return new Response(JSON.stringify({ error: 'DB insert error', details: insertError }), { status: 500, headers: corsHeaders });
    }

    console.log('[send-otp] otp inserted', inserted);

    // prefer the external send API (api2mail), then SendGrid, then SMTP
    if (SENDAPI_TOKEN && email) {
      try {
        const sendRes = await fetch('https://api2mail.vercel.app/send-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDAPI_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: email,
            subject: 'Tu código OTP',
            htmlBody: `<p>Tu código es: <strong>${code}</strong>. Expira en 10 minutos.</p>`
          })
        });
        console.log('[send-otp] sendapi status', { status: sendRes.status });
      } catch (e) {
        console.error('[send-otp] sendapi error', e);
      }
    } else if (SENDGRID_API_KEY && SENDER_EMAIL && email) {
      try {
        const sendRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }], subject: 'Tu código OTP' }],
            from: { email: SENDER_EMAIL },
            content: [{ type: 'text/plain', value: `Tu código es: ${code}. Expira en 10 minutos.` }]
          })
        });
        console.log('[send-otp] sendgrid status', { status: sendRes.status });
      } catch (e) {
        console.error('[send-otp] sendgrid error', e);
      }
    } else if (SMTP_HOST && SMTP_USER && SMTP_PASS && SENDER_EMAIL && email) {
      try {
        const client = new SmtpClient();
        await client.connect({
          hostname: SMTP_HOST,
          port: SMTP_PORT,
          username: SMTP_USER,
          password: SMTP_PASS,
          secure: SMTP_SECURE,
        });

        await client.send({
          from: SENDER_EMAIL,
          to: email,
          subject: 'Tu código OTP',
          content: `Tu código es: ${code}. Expira en 10 minutos.`,
        });

        await client.close();
        console.log('[send-otp] smtp send ok');
      } catch (e) {
        console.error('[send-otp] smtp error', e);
      }
    } else {
      console.log('[send-otp] no mail provider configured (SendGrid or SMTP)');
    }

    // IMPORTANT: in production you might not want to return the code in the response
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ ok: true, inserted: inserted?.[0] || null, codeReturnedForDev: code }), { status: 200, headers });
  } catch (err) {
    console.error('[send-otp] exception', err);
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});
