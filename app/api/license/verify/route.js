export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verify a license by key or identity (email/passthrough).
 * Expired licenses return ok: false.
 * Request body: { licenseKey?: string, email?: string, passthrough?: string }
 * Returns: { ok: boolean, expiresAt?: number }
 */

async function getLicense(id) {
  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result || null;
  } else {
    const store = globalThis.__LICENSES__;
    if (!store) return null;
    return store.get(id) || null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { licenseKey, email, passthrough } = body || {};

    // Try id resolution in order of passthrough > email > licenseKey
    const idCandidates = [passthrough, email, licenseKey].filter(Boolean);
    for (const id of idCandidates) {
      const rec = await getLicense(id);
      if (rec && (rec.licenseKey === licenseKey || rec.email === email || rec.passthrough === passthrough)) {
        const now = Date.now();
        const exp = rec.expiresAt || now;
        const valid = now <= exp;
        return new Response(JSON.stringify({ ok: !!valid, expiresAt: exp }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}