// Aura Scanner service — fetches target URL, runs scan, persists, returns token.

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { runAuraScan, type AuraResult } from "@/agents/aura-scanner";

export type AuraScanRow = {
  id: string;
  url: string;
  url_normalized: string;
  email: string | null;
  aura_score: number | null;
  axis_scores: AuraResult["axis_scores"] | null;
  strengths: string[];
  weaknesses: string[];
  top_fix: string | null;
  vibe: string | null;
  raw_excerpt: string | null;
  share_token: string;
  status: "PENDING" | "COMPLETE" | "FAILED";
  error: string | null;
  model: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
};

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    parsed.hash = "";
    let s = parsed.toString();
    if (s.endsWith("/") && parsed.pathname === "/") s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

/** Best-effort fetch + strip-to-text. Bounded by 8s timeout + 200KB cap. */
async function fetchPageText(url: string): Promise<{ title?: string; text: string; ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0 (NextRealm AuraScanner/1.0; +https://nextrealmos.pages.dev/aura)",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return { text: "", ok: false, error: `fetch ${res.status}` };
    const html = (await res.text()).slice(0, 200_000);

    // Extract title
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

    // Extract OG description as a fallback
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";

    // Strip script/style blocks
    let body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
    // Strip tags
    body = body.replace(/<[^>]+>/g, " ");
    // Decode common entities + collapse whitespace
    body = body
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    const composed = [title, ogDesc, metaDesc, body].filter(Boolean).join(" · ");
    return { title, text: composed.slice(0, 8000), ok: true };
  } catch (e) {
    return { text: "", ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function startAuraScan(input: {
  url: string;
  email?: string | null;
  ipHash?: string | null;
}): Promise<{ row: AuraScanRow; result?: AuraResult }> {
  const admin = createSupabaseAdmin();
  const url_normalized = normalizeUrl(input.url);

  // Insert as PENDING
  const { data: ins, error: insErr } = await admin
    .from("aura_scans")
    .insert({
      url: input.url.trim(),
      url_normalized,
      email: input.email?.trim().toLowerCase() || null,
      ip_hash: input.ipHash ?? null,
      status: "PENDING",
    })
    .select("*")
    .single();
  if (insErr) throw new Error(`scan insert failed: ${insErr.message}`);
  const row = ins as AuraScanRow;

  const t0 = Date.now();
  const fetched = await fetchPageText(url_normalized);

  if (!fetched.ok) {
    await admin
      .from("aura_scans")
      .update({
        status: "FAILED",
        error: fetched.error ?? "fetch failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - t0,
      })
      .eq("id", row.id);
    return { row: { ...row, status: "FAILED", error: fetched.error ?? "fetch failed" } };
  }

  let result: AuraResult;
  try {
    result = await runAuraScan({
      url: url_normalized,
      pageText: fetched.text,
      pageTitle: fetched.title,
    });
  } catch (e) {
    await admin
      .from("aura_scans")
      .update({
        status: "FAILED",
        error: e instanceof Error ? e.message : "scan failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - t0,
        raw_excerpt: fetched.text.slice(0, 400),
      })
      .eq("id", row.id);
    return { row: { ...row, status: "FAILED", error: e instanceof Error ? e.message : "scan failed" } };
  }

  const { data: upd } = await admin
    .from("aura_scans")
    .update({
      status: "COMPLETE",
      aura_score: result.aura_score,
      axis_scores: result.axis_scores,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      top_fix: result.top_fix,
      vibe: result.vibe,
      raw_excerpt: fetched.text.slice(0, 400),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      model: process.env.NROS_AI_DEFAULT_MODEL ?? "cloudflare-default",
    })
    .eq("id", row.id)
    .select("*")
    .single();

  return { row: (upd ?? row) as AuraScanRow, result };
}

export async function getAuraScanByToken(token: string): Promise<AuraScanRow | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("aura_scans")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as AuraScanRow) ?? null;
}

export async function listRecentAuraScans(limit = 8): Promise<Array<Pick<AuraScanRow, "share_token" | "url" | "aura_score" | "vibe" | "created_at">>> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("aura_recent_scans")
    .select("share_token, url, aura_score, vibe, created_at")
    .limit(limit);
  return (data ?? []) as Array<Pick<AuraScanRow, "share_token" | "url" | "aura_score" | "vibe" | "created_at">>;
}

/** Captures the email post-result. Idempotent. */
export async function attachEmailToScan(token: string, email: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(clean)) {
    throw new Error("Invalid email");
  }
  await admin.from("aura_scans").update({ email: clean }).eq("share_token", token);
}
