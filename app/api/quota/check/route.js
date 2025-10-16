export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily quota checker/incrementer.
 * Body: { tool: "image" | "pdfMerge" | "zipFolder" | "heic" | "imagePro" | "pdftools", increment?: number, email?: string }
 * Returns: { ok: boolean, remaining: number, limit: number, day: string }
 *
 * Storage uses KV if configured, else in-memory Map. Keyed by user id and day.
 */

const DEFAULT_LIMITS = {
  image: parseInt(process.env.FREE_DAILY_IMAGE || "2", 10),
  pdfMerge: parseInt(process.env.FREE_DAILY_PDFMERGE || "2", 10),
  zipFolder: parseInt(process.env.FREE_DAILY_ZIPFOLDER || "2", 10),
  heic: parseInt(process.env.FREE_DAILY_HEIC || "0", 10),
  imagePro: parseInt(process.env.FREE_DAILY_IMAGEPRO || "0", 10),
  pdftools: parseInt(process.env.FREE_DAILY_PDFTOOLS || "0", 10),
};

function dayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function kvGet(key) {
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.result || null;
}

async function kvSet(key, value) {
  const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error("KV set failed");
}

function getIdFromReq(req, email) {
  if (email) return `email:${email}`;
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("X-Forwarded-For") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("X-Real-IP") ||
    "anon";
  return `ip:${ip.split(",")[0].trim()}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { tool, increment = 1, email } = body || {};
    if (!tool || !(tool in DEFAULT_LIMITS)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_tool" }), { status: 400 });
    }
    const limit = DEFAULT_LIMITS[tool];
    const id = getIdFromReq(req, email);
    const day = dayKey();

    const useKv = process.env.LICENSE_STORE === "kv" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    const key = `quota:${id}:${day}`;
    let record = null;

    if (useKv) {
      record = (await kvGet(key)) || {};
    } else {
      globalThis.__QUOTA__ = globalThis.__QUOTA__ || new Map();
      record = globalThis.__QUOTA__.get(key) || {};
    }

    const current = parseInt(record[tool] || 0, 10);
    const next = current + increment;

    if (next > limit) {
      const remaining = Math.max(0, limit - current);
      return new Response(JSON.stringify({ ok: false, remaining, limit, day }), { status: 200 });
    }

    const updated = { ...record, [tool]: next };
    if (useKv) {
      await kvSet(key, updated);
    } else {
      globalThis.__QUOTA__.set(key, updated);
    }

    const remaining = Math.max(0, limit - next);
    return new Response(JSON.stringify({ ok: true, remaining, limit, day }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}