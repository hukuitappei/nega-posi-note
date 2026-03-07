import { SignJWT, importJWK } from 'jose';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const RETENTION_DAYS = 92; // 約3か月

function corsHeaders(env, origin) {
  const allowOrigin = origin && origin.startsWith(env.APP_ORIGIN) ? origin : env.APP_ORIGIN;
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(data, env, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(env, origin) },
  });
}

function sanitizeSub(sub) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return null;
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  };
}

async function digestKey(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSubKey(sub) {
  return digestKey(sub.endpoint);
}

async function buildVapidJwt(env, aud) {
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await importJWK(privateJwk, 'ES256');
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(aud)
    .setSubject(env.SUBJECT || 'mailto:admin@example.com')
    .setExpirationTime(exp)
    .sign(key);
}

async function sendWebPush(env, subscription) {
  const endpoint = new URL(subscription.endpoint);
  const aud = endpoint.origin;
  const token = await buildVapidJwt(env, aud);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '60',
      Urgency: 'normal',
      Authorization: `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Length': '0',
    },
  });

  return res.status;
}

async function handleSubscribe(req, env, origin) {
  const body = await req.json().catch(() => null);
  const subscription = sanitizeSub(body?.subscription);
  if (!subscription) return json({ ok: false, error: 'invalid_subscription' }, env, origin, 400);

  const key = await getSubKey(subscription);
  const value = {
    subscription,
    timezone: body?.timezone || 'Asia/Tokyo',
    hour: Number.isInteger(body?.hour) ? body.hour : 21,
    minute: Number.isInteger(body?.minute) ? body.minute : 0,
    updatedAt: new Date().toISOString(),
  };
  await env.SUBSCRIPTIONS.put(key, JSON.stringify(value));
  return json({ ok: true }, env, origin);
}

async function handleUnsubscribe(req, env, origin) {
  const body = await req.json().catch(() => null);
  const subscription = sanitizeSub(body?.subscription);
  if (!subscription) return json({ ok: false, error: 'invalid_subscription' }, env, origin, 400);
  const key = await getSubKey(subscription);
  await env.SUBSCRIPTIONS.delete(key);
  return json({ ok: true }, env, origin);
}

async function runScheduled(env) {
  const now = Date.now();
  const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let cursor;
  do {
    const page = await env.SUBSCRIPTIONS.list({ cursor, limit: 1000 });
    cursor = page.cursor;
    for (const item of page.keys) {
      const raw = await env.SUBSCRIPTIONS.get(item.name);
      if (!raw) continue;
      try {
        const saved = JSON.parse(raw);
        const ts = Date.parse(saved.updatedAt || saved.createdAt || '');
        if (!Number.isNaN(ts) && now - ts > retentionMs) {
          await env.SUBSCRIPTIONS.delete(item.name);
          continue;
        }
        const status = await sendWebPush(env, saved.subscription);
        if (status === 404 || status === 410) {
          await env.SUBSCRIPTIONS.delete(item.name);
        }
      } catch {
        await env.SUBSCRIPTIONS.delete(item.name);
      }
    }
  } while (cursor);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || '';

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, origin) });
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({ ok: true }, env, origin);
    }
    if (url.pathname === '/vapid-public-key' && req.method === 'GET') {
      return json({ publicKey: env.VAPID_PUBLIC_KEY || '' }, env, origin);
    }
    if (url.pathname === '/subscribe' && req.method === 'POST') {
      return handleSubscribe(req, env, origin);
    }
    if (url.pathname === '/unsubscribe' && req.method === 'POST') {
      return handleUnsubscribe(req, env, origin);
    }

    return json({ ok: false, error: 'not_found' }, env, origin, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
};
