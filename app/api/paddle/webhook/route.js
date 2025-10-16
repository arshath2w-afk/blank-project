import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal Paddle webhook handler.
 * Verifies HMAC signature using PADDLE_WEBHOOK_SECRET (new Paddle),
 * then issues a license key and stores entitlement mapped to the buyer.
 *
 * NOTE: This uses an in-memory store by default. Configure persistent storage
 * by setting LICENSE_STORE to "kv" and providing KV_REST_API_URL and KV_REST_API_TOKEN
 * (Upstash-like REST KV). See README for deployment notes.
 */

function verifySignature(reqBody, headerSig, secret) {
  if (!secret || !headerSig) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(reqBody);
  const digest = hmac.digest("hex");
  // Header may be like: t=timestamp,s=signature
  const sig = headerSig.split(",").find((p) => p.startsWith("s="))?.split("=")[1] || headerSig;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig));
}

async function putLicense(key, value) {
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
    const raw = await req.text();
    const headerSig =
      req.headers.get("Paddle-Signature") ||
      req.headers.get("paddle-signature") ||
      req.headers.get("X-Paddle-Signature") ||
      req.headers.get("x-paddle-signature");

    const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
    const ok = verifySignature(raw, headerSig, secret);
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), { status: 401 });
    }

    const payload = JSON.parse(raw);
    // Try to extract identity
    const email =
      payload?.data?.customer?.email ||
      payload?.email ||
      payload?.customer_email ||
      payload?.checkout?.customer?.email ||
      null;

    const passthrough =
      payload?.data?.checkout?.passthrough ||
      payload?.passthrough ||
      null;

    // Generate license key
    const licenseKey = crypto.randomUUID();

    const licenseRecord = {
      licenseKey,
      email,
      passthrough,
      productId: payload?.data?.product?.id || payload?.product_id || null,
      createdAt: Date.now(),
    };

    // Use passthrough as id if present, else email, else product+timestamp
    const id = passthrough || email || `${licenseRecord.productId}:${licenseKey}`;
    await putLicense(id, licenseRecord);

    return new Response(JSON.stringify({ ok: true, licenseKey }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}