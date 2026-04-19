import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/** GET /api/admin/settings — return all platform settings */
export async function GET() {
  const ctx = await requireAdmin();

  const { data, error } = await ctx.client
    .from("platform_settings")
    .select("key, value")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

/** PATCH /api/admin/settings — upsert one or more settings */
export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be a key/value object" }, { status: 400 });
  }

  const allowed = new Set(["teams_webhook_url", "teams_notify_enabled"]);
  const rows = Object.entries(body)
    .filter(([k]) => allowed.has(k))
    .map(([key, value]) => ({ key, value: String(value) }));

  if (!rows.length) return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });

  const { error } = await ctx.client
    .from("platform_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
