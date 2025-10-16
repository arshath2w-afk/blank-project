import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function sign(payload) {
  const secret = process.env.AUTH_SECRET || "";
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400 });
    }
    const user = await getUser(email);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 });
    }
    const salt = Buffer.from(user.salt, "hex");
    const hash = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    if (!crypto.timingSafeEqual(hash, Buffer.from(user.hash, "hex"))) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 });
    }

    const token = sign({ email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }); // 30 days
    const headers = new Headers({
      "Set-Cookie": `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
      "Content-Type": "application/json",
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}