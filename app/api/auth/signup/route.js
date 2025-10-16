import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signup: { email, password }
 * Stores user with scrypt-hashed password.
 */

async function putUser(email, user) {
  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(`user:${email}`)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("KV set user failed");
    return true;
  } else {
    globalThis.__USERS__ = globalThis.__USERS__ || new Map();
    globalThis.__USERS__.set(email, user);
    return true;
  }
}

async function getUser(email) {
  if (process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(`user:${email}`)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result || null;
  } else {
    const store = globalThis.__USERS__;
    if (!store) return null;
    return store.get(email) || null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400 });
    }
    const existing = await getUser(email);
    if (existing) {
      return new Response(JSON.stringify({ ok: false, error: "email_exists" }), { status: 409 });
    }
    const salt = crypto.randomBytes(16);
    const hash = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    const user = { email, hash: hash.toString("hex"), salt: salt.toString("hex"), createdAt: Date.now() };
    await putUser(email, user);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}