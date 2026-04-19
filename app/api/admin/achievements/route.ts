import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/** GET /api/admin/achievements — list all achievement definitions */
export async function GET() {
  const ctx = await requireAdmin();

  const { data, error } = await ctx.client
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ achievements: data ?? [] });
}

/** POST /api/admin/achievements — create a new achievement */
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const { name, description, icon, condition_type, condition_value, scope, earner_type, card_type } = body;
  if (!name || !description || !icon || !condition_type || !condition_value || !scope || !card_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await ctx.client
    .from("achievements")
    .insert({ name, description, icon, condition_type, condition_value, scope, earner_type: earner_type ?? "self", card_type })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ achievement: data }, { status: 201 });
}
