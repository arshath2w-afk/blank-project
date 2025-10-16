export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OCR proxy using OCR.space (free API).
 * Accepts { base64?: string, url?: string, language?: string }
 * Returns { ok: boolean, text?: string }
 *
 * Set OCR_SPACE_API_KEY in environment for production.
 * Fallback key "helloworld" is rate-limited and for testing only.
 */

export async function POST(req) {
  try {
    const body = await req.json();
    const { base64, url, language = "eng" } = body || {};
    const apiKey = process.env.OCR_SPACE_API_KEY || "helloworld";

    const form = new URLSearchParams();
    form.append("language", language);
    form.append("isOverlayRequired", "false");
    form.append("OCREngine", "2");
    form.append("apikey", apiKey);

    if (base64) {
      form.append("base64Image", base64);
    } else if (url) {
      form.append("url", url);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "missing_input" }), { status: 400 });
    }

    const resp = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, error: "ocr_failed" }), { status: 200 });
    }
    const json = await resp.json();
    const parsed = json?.ParsedResults?.[0]?.ParsedText || "";
    return new Response(JSON.stringify({ ok: true, text: parsed }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}