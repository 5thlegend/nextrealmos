// GET /api/federation/operators?q=<query>&limit=20
//   Public operator search by callsign prefix. Useful for autocomplete in
//   UI. Returns only public-safe fields.

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:ops:search", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);
  if (q.length < 1) return NextResponse.json({ operators: [] });

  const supabase = await createSupabaseServer();
  // ilike with escaped wildcards — prefix + contains hybrid
  const esc = q.replace(/[%_]/g, (m) => `\\${m}`);
  const { data } = await supabase
    .from("operator_profiles")
    .select("id, callsign, xp, rank_id, avatar_url, ranks(name, badge_color)")
    .or(`callsign.ilike.${esc}%,callsign.ilike.%${esc}%`)
    .order("xp", { ascending: false })
    .limit(limit);

  type Row = { id: string; callsign: string; xp: number; rank_id: string | null; avatar_url: string | null; ranks: { name?: string; badge_color?: string } | null };
  const operators = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    callsign: r.callsign,
    xp: r.xp,
    avatar_url: r.avatar_url,
    rank: r.ranks?.name ?? null,
    rank_color: r.ranks?.badge_color ?? null,
  }));

  return NextResponse.json({ operators });
}
