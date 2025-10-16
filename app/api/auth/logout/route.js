export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const headers = new Headers({
    "Set-Cookie": `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    "Content-Type": "application/json",
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}