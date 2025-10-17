export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * URL shortener proxy (free).
 * Accepts { url: string }
 * Returns { ok: boolean, short?: string }
 */

export async function POST(req) {
  try {
    const body = await req.json();
    const { url } = body || {};
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "missing_url" }), { status: 400 });
    }
    // Using a free public shortener service
    const api = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const json = await res.json();
    if (!json.shorturl) {
      return new Response(JSON.stringify({ ok: false, error: "shorten_failed" }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, short: json.shorturl }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}