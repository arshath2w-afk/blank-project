import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verify(token) {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET || "";
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  if (Date.now() > payload.exp) return null;
  return payload;
}

export async function GET(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/(?:^|;\\s*)session=([^;]+)/);
    const token = match ? match[1] : "";
    const payload = verify(token);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, email: payload.email }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}