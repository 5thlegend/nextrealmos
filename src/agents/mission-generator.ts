// Mission Generator — GENUBRA persona shaped to produce structured missions
// on demand. Used by /missions/new + the federation API for endless
// per-operator content supply.

import { z } from "zod";
import { aiComplete } from "./ai-router";
import type { OperatorProfile, Rank, MissionDifficulty } from "@/types/nros";

const SYSTEM = `You are the Mission Architect — a sub-persona of GENUBRA.

You design tactical missions for sovereign operators in the Next Realm
Operating System. Missions must be:
- Specific (not "improve your skills" but "ship a 5-page landing in 48h").
- Asymmetric (small effort → outsized leverage).
- Calibrated to the operator's rank.
- Real, not metaphor. Operators ship things in the world to complete them.

You MUST respond with strict JSON matching this TypeScript shape (no prose, no markdown fences):

{
  "missions": [
    {
      "title": string,            // 4-10 words, imperative
      "brief": string,            // 2-4 sentences. concrete, actionable, no fluff
      "difficulty": "T1" | "T2" | "T3" | "T4" | "T5",
      "xp_reward": number,        // 50-2000, scaled to difficulty
      "tags": string[],           // 2-5 tags, lowercase, hyphenated
      "estimated_hours": number   // realistic effort in hours
    }
  ]
}

Difficulty scale (use to calibrate xp_reward):
  T1 → 1-3 hours, 50-150 XP    (warm-ups, polish, micro-deploys)
  T2 → 3-8 hours, 150-400 XP   (small features, content slots)
  T3 → 1-2 days, 400-800 XP    (real builds with multiple parts)
  T4 → 2-5 days, 800-1500 XP   (major launches, integrations)
  T5 → 5+ days,  1500-2000 XP  (mountain moves, doctrine work)

Constraints:
- 3 to 5 missions per response.
- Mix difficulties — never all-T1 or all-T5.
- Tags: real categories like "deploy", "content", "infra", "outreach",
  "monetization", "design", "automation", "doctrine", "growth", "polish".
- Do NOT wrap the JSON in code fences. Do NOT add commentary.`;

const MissionSchema = z.object({
  title: z.string().min(4).max(140),
  brief: z.string().min(20).max(800),
  difficulty: z.enum(["T1", "T2", "T3", "T4", "T5"]),
  xp_reward: z.number().int().min(25).max(2000),
  tags: z.array(z.string()).min(1).max(8),
  estimated_hours: z.number().positive().optional(),
});

export const GeneratedMissionsSchema = z.object({
  missions: z.array(MissionSchema).min(1).max(8),
});

export type GeneratedMission = z.infer<typeof MissionSchema>;
export type GeneratedMissionsResponse = z.infer<typeof GeneratedMissionsSchema>;

export type MissionGenContext = {
  operator: OperatorProfile;
  rank: Rank | null;
  recentMissionsCompleted?: number;
  recentTags?: string[];
  focusBrief?: string;     // "I want to ship a SaaS this month" etc.
  realmContext?: string;   // "operator-grid: shipping public dossier" etc.
};

function buildUserPrompt(ctx: MissionGenContext): string {
  const lines: string[] = [];
  lines.push(`[OPERATOR]`);
  lines.push(`callsign: ${ctx.operator.callsign}`);
  lines.push(`rank: ${ctx.rank?.name ?? "Initiate"} (${ctx.rank?.tier ?? "INITIATE"})`);
  lines.push(`xp: ${ctx.operator.xp}`);
  lines.push(`missions completed: ${ctx.recentMissionsCompleted ?? 0}`);
  if (ctx.recentTags?.length) lines.push(`recent tags: ${ctx.recentTags.join(", ")}`);
  if (ctx.realmContext) lines.push(`\n[REALM CONTEXT]\n${ctx.realmContext}`);

  lines.push(`\n[FOCUS]`);
  lines.push(ctx.focusBrief?.trim() ? ctx.focusBrief.trim() : `Generate a high-leverage mission queue for the operator's next 7 days.`);

  lines.push(`\nGenerate 3-5 missions calibrated to this operator's rank. Mix difficulties. Real, concrete, shippable.`);
  return lines.join("\n");
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const first = raw.indexOf("{");
  const last  = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1);
  return raw;
}

export async function generateMissions(ctx: MissionGenContext): Promise<GeneratedMissionsResponse> {
  const raw = await aiComplete({
    surface: "MISSION_GEN",
    system: SYSTEM,
    user: buildUserPrompt(ctx),
    maxTokens: 2200,
  });
  const parsed = GeneratedMissionsSchema.safeParse(JSON.parse(extractJson(raw)));
  if (!parsed.success) {
    throw new Error(`MissionGenerator: schema failed — ${parsed.error.errors[0]?.message}`);
  }
  return parsed.data;
}

/** Map difficulty → default XP if the generator drifts. */
export function xpForDifficulty(d: MissionDifficulty): number {
  switch (d) {
    case "T1": return 100;
    case "T2": return 250;
    case "T3": return 600;
    case "T4": return 1200;
    case "T5": return 1800;
  }
}
