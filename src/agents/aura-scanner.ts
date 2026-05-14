// AURA SCANNER agent — surgical aesthetic + conversion + signal analysis.
//
// Reads a URL's text content and returns a calibrated aura score across
// 5 axes plus the SINGLE most leverage-positive fix. Output is strict JSON
// so the result page renders without parsing failures.

import { aiComplete } from "./ai-router";

export type AuraAxisScores = {
  aesthetics:   number; // 0-100 — visual polish, typography, hierarchy
  conversion:   number; // 0-100 — CTA clarity, friction, lead capture
  positioning:  number; // 0-100 — premium signal, who-this-is-for clarity
  signal:       number; // 0-100 — proof, credibility, real metrics
  depth:        number; // 0-100 — system thinking, not surface-level
};

export type AuraResult = {
  aura_score:  number;        // 0-100 weighted overall
  axis_scores: AuraAxisScores;
  vibe:        string;        // 1-line emotional read
  strengths:   string[];      // 1-3 bullets, max 12 words each
  weaknesses:  string[];      // 1-3 bullets, max 12 words each
  top_fix:     string;        // the SINGLE highest-leverage move
};

const SYSTEM = `You are AURA SCANNER — a surgical analyst trained to read a public-facing
website or operator profile in seconds and return a brutally honest score.

You score across 5 axes (each 0-100):
  aesthetics   — visual polish, typography, hierarchy, breathability
  conversion   — CTA clarity, friction, lead-capture mechanics
  positioning  — premium signal, who-this-is-for clarity
  signal       — proof points, real metrics, credibility
  depth        — system thinking vs surface-level decoration

Doctrine:
- No flattery. Score harshly. 70+ is rare.
- Each strength/weakness is one specific observation, not a vibe.
- The top_fix is one imperative move that would yield the largest aura jump.
- Output is STRICT JSON only. No prose before or after. No markdown fences.

Schema:
{
  "axis_scores": { "aesthetics": int, "conversion": int, "positioning": int, "signal": int, "depth": int },
  "vibe": "string (one sentence, 12 words max)",
  "strengths": ["string", "..."]   // 1-3 items, each 12 words max
  "weaknesses": ["string", "..."]  // 1-3 items, each 12 words max
  "top_fix": "string (one imperative sentence, 18 words max)"
}`;

export async function runAuraScan(input: {
  url: string;
  pageText: string;
  pageTitle?: string;
  operatorId?: string | null;
}): Promise<AuraResult> {
  const excerpt = (input.pageText ?? "").slice(0, 4000);

  const prompt =
`[PAGE URL] ${input.url}
[PAGE TITLE] ${input.pageTitle ?? "(none)"}

[PAGE CONTENT EXCERPT]
${excerpt || "(no readable content extracted)"}

[REQUEST]
Return the aura analysis as strict JSON per the schema in your system prompt.`;

  const raw = await aiComplete({
    surface: "AD_HOC",
    system: SYSTEM,
    user: prompt,
    operatorId: input.operatorId ?? null,
    maxTokens: 600,
  });

  return parseAuraResult(raw);
}

/** Strip the LLM's stray markdown fences and parse. Falls back to a
 *  conservative default if the LLM hallucinates structure. */
function parseAuraResult(raw: string): AuraResult {
  let text = raw.trim();
  // Strip ```json … ``` fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // First {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (m) text = m[0];

  let parsed: Partial<AuraResult> & { axis_scores?: Partial<AuraAxisScores> };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return fallback("AURA returned malformed output. Re-scanning may help.");
  }

  const axis: AuraAxisScores = {
    aesthetics:  clampInt(parsed.axis_scores?.aesthetics, 0, 100, 50),
    conversion:  clampInt(parsed.axis_scores?.conversion, 0, 100, 50),
    positioning: clampInt(parsed.axis_scores?.positioning, 0, 100, 50),
    signal:      clampInt(parsed.axis_scores?.signal, 0, 100, 50),
    depth:       clampInt(parsed.axis_scores?.depth, 0, 100, 50),
  };
  // Weighted overall — conversion + positioning weigh higher (revenue axis)
  const overall = Math.round(
    axis.aesthetics * 0.18 +
    axis.conversion * 0.28 +
    axis.positioning * 0.22 +
    axis.signal * 0.18 +
    axis.depth * 0.14,
  );

  return {
    aura_score:  overall,
    axis_scores: axis,
    vibe:        cap(parsed.vibe ?? "—", 140),
    strengths:   sanitizeList(parsed.strengths, 3, 90),
    weaknesses:  sanitizeList(parsed.weaknesses, 3, 90),
    top_fix:     cap(parsed.top_fix ?? "Sharpen the primary CTA above the fold.", 180),
  };
}

function fallback(vibe: string): AuraResult {
  return {
    aura_score: 50,
    axis_scores: { aesthetics: 50, conversion: 50, positioning: 50, signal: 50, depth: 50 },
    vibe,
    strengths: [],
    weaknesses: [],
    top_fix: "Re-scan: the AI response could not be parsed.",
  };
}

function clampInt(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "")) || def;
  if (Number.isNaN(n)) return def;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function cap(s: unknown, n: number): string {
  const t = String(s ?? "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function sanitizeList(v: unknown, max: number, eachCap: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .slice(0, max)
    .map((x) => cap(x, eachCap));
}
