// GET /api/federation/operators/check?callsign=<x>
//
// Public callsign-availability check. Returns:
//   { available: bool, taken: bool, taken_by_realm?: string,
//     normalized: string, suggestions?: string[] }
//
// Realm signup forms call this in real-time as the user types so callsigns
// stay globally unique across the federation. Two-pass: try the rich query
// (with source_realm_id join, V3.10+); if that errors because migration
// 0015 hasn't been applied yet, fall back to a plain callsign existence
// check so the surface stays useful even pre-migration.

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const VALID = /^[A-Za-z0-9_.\-]{2,48}$/;

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:ops:check", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const raw = (url.searchParams.get("callsign") ?? "").trim();
  if (!raw) return NextResponse.json({ available: false, taken: false, error: "callsign required" }, { status: 400 });
  if (!VALID.test(raw)) {
    return NextResponse.json({
      available: false, taken: false, normalized: raw,
      error: "callsign must be 2-48 chars; letters, digits, _ . - only",
    }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  type CheckRow = { callsign?: string; realms?: { slug?: string } | null };

  // Pass 1 (V3.10+): rich query with source_realm join
  let row: CheckRow | null = null;
  let queryErrored = false;
  try {
    const { data, error } = await supabase
      .from("operator_profiles")
      .select("callsign, source_realm_id, realms:source_realm_id(slug)")
      .eq("callsign", raw)
      .maybeSingle();
    if (error) queryErrored = true;
    else row = (data ?? null) as CheckRow | null;
  } catch {
    queryErrored = true;
  }

  // Pass 2 fallback: plain existence check (works pre-migration-0015)
  if (queryErrored) {
    const { data } = await supabase
      .from("operator_profiles")
      .select("callsign")
      .eq("callsign", raw)
      .maybeSingle();
    row = (data ?? null) as CheckRow | null;
  }

  if (!row) {
    return NextResponse.json({ available: true, taken: false, normalized: raw });
  }

  return NextResponse.json({
    available: false,
    taken: true,
    normalized: row.callsign ?? raw,
    taken_by_realm: row.realms?.slug ?? null,
    suggestions: [
      `${raw}_1`,
      `${raw}.${Math.floor(Math.random() * 90 + 10)}`,
      `${raw}-${Date.now().toString(36).slice(-3)}`,
    ],
  });
}
