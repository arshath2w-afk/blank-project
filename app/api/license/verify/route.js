export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getDb } from "../../../lib/mongo";

/**
 * Verify a license by key or identity (email/passthrough).
 * Binds first successful verification to an email, preventing reuse across accounts.
 * Expired licenses return ok: false.
 * Request body: { licenseKey?: string, email?: string, passthrough?: string }
 * Returns: { ok: boolean, expiresAt?: number }
 */

async function kvGet(id) {
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.result || null;
}

async function kvSet(id, value) {
  const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error("KV set failed");
}

async function getLicense(id) {
  const db = await getDb();
  if (db) {
    const col = db.collection("licenses");
    return await col.findOne({ $or: [{ licenseKey: id }, { email: id }, { passthrough: id }] });
  }
  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return await kvGet(id);
  } else {
    const store = globalThis.__LICENSES__;
    if (!store) return null;
    return store.get(id) || null;
  }
}

async function putLicense(id, value) {
  const db = await getDb();
  if (db) {
    const col = db.collection("licenses");
    await col.updateOne({ licenseKey: value.licenseKey }, { $set: value }, { upsert: true });
    if (value.email) await col.updateOne({ email: value.email }, { $set: value }, { upsert: true });
    if (value.passthrough) await col.updateOne({ passthrough: value.passthrough }, { $set: value }, { upsert: true });
    return;
  }
  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    await kvSet(id, value);
  } else {
    globalThis.__LICENSES__ = globalThis.__LICENSES__ || new Map();
    globalThis.__LICENSES__.set(id, value);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { licenseKey, email, passthrough } = body || {};

    // Try licenseKey first (primary storage key)
    if (licenseKey) {
      const rec = await getLicense(licenseKey);
      if (rec) {
        const now = Date.now();
        const exp = rec.expiresAt || now;
        const valid = now <= exp;
        if (!valid) {
          return new Response(JSON.stringify({ ok: false, expiresAt: exp }), { status: 200 });
        }
        // Enforce single-account binding
        if (rec.email && email && rec.email !== email) {
          return new Response(JSON.stringify({ ok: false, error: "license_bound_to_different_email", expiresAt: exp }), { status: 200 });
        }
        // Bind to email if first time and email provided
        if (!rec.email && email) {
          const bound = { ...rec, email };
          // Save under licenseKey and convenience email key
          await putLicense(licenseKey, bound);
          await putLicense(email, bound);
          return new Response(JSON.stringify({ ok: true, expiresAt: bound.expiresAt }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true, expiresAt: exp }), { status: 200 });
      }
    }

    // Fallback to email/passthrough (legacy keys)
    const idCandidates = [passthrough, email].filter(Boolean);
    for (const id of idCandidates) {
      const rec = await getLicense(id);
      if (rec && (rec.email === email || rec.passthrough === passthrough)) {
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