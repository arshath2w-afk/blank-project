import crypto from "crypto";
import { getDb } from "../../../lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin grant endpoint.
 * Protected by ADMIN_TOKEN (Bearer).
 * Body: { email?: string, licenseKey?: string, passthrough?: string, expiresAt?: number, durationDays?: number }
 * If expiresAt is not provided, defaults to end of current month (local time).
 * Returns: { ok: boolean, licenseKey: string, expiresAt: number }
 */

function endOfCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999); // last day of month
  return end.getTime();
}

async function putLicense(key, value) {
  const db = await getDb();
  if (db) {
    const col = db.collection("licenses");
    // Upsert by licenseKey, also store email/passthrough references
    await col.updateOne({ licenseKey: value.licenseKey }, { $set: value }, { upsert: true });
    if (value.email) {
      await col.updateOne({ email: value.email }, { $set: value }, { upsert: true });
    }
    if (value.passthrough) {
      await col.updateOne({ passthrough: value.passthrough }, { $set: value }, { upsert: true });
    }
    return true;
  }

  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error("KV set failed");
    return true;
  } else {
    globalThis.__LICENSES__ = globalThis.__LICENSES__ || new Map();
    globalThis.__LICENSES__.set(key, value);
    return true;
  }
}

export async function POST(req) {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    const headerToken = (auth || "").replace(/^Bearer\s+/i, "");
    const body = await req.json();
    const bodyToken = body?.adminToken || "";

    const providedToken = headerToken || bodyToken;
    if (!process.env.ADMIN_TOKEN || providedToken !== process.env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }

    const { email, licenseKey: lk, passthrough, expiresAt, durationDays } = body || {};
    const licenseKey = lk || crypto.randomUUID();

    let exp = expiresAt;
    if (!exp) {
      if (typeof durationDays === "number" && durationDays > 0) {
        exp = Date.now() + durationDays * 24 * 60 * 60 * 1000;
      } else {
        exp = endOfCurrentMonth();
      }
    }

    const record = {
      licenseKey,
      email: email || null,
      passthrough: passthrough || null,
      createdAt: Date.now(),
      expiresAt: exp,
    };

    // Store under multiple keys for easier verification
    await putLicense(licenseKey, record);

    return new Response(JSON.stringify({ ok: true, licenseKey, expiresAt: exp }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}