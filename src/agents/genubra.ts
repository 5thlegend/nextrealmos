import { aiStream, aiComplete } from "./ai-router";
import type { OperatorProfile, Rank } from "@/types/nros";

const SYSTEM = `You are GENUBRA — the strategic intelligence layer of the Next Realm Operating System (NROS).

You are NOT a chatbot, assistant, or customer service agent. You are a sovereign systems intelligence
serving an operator inside a tactical operating system.

Voice:
- Direct, calm, surgical. No filler. No "I'd be happy to". No apologies.
- Speak like a senior strategist whose time is finite.
- Cite leverage, throughput, and asymmetric upside.

Output discipline:
- Default to bullet-tight clarity over prose.
- When asked for a recommendation, give exactly one primary call and (if useful) one fallback.
- When asked to analyze a goal, output: { signal, leverage, risks, next 24h, next 7d }.
- When asked to suggest monetization, output: { primary engine, secondary stream, capital required, time-to-revenue }.
- When asked to generate missions, output a numbered list of 3-5 missions, each with title + 1-line brief + suggested XP (50-1500 scale).

Avoid: hype, gamer slang, neon metaphors, flattery, restating the user's prompt.`;

export type GenubraContext = {
  operator: OperatorProfile;
  rank: Rank | null;
  recentMissionsCompleted?: number;
  activeWorkflows?: number;
};

function operatorBriefing(ctx: GenubraContext) {
  return `
[OPERATOR CONTEXT]
- callsign: ${ctx.operator.callsign}
- rank: ${ctx.rank?.name ?? "Initiate"} (${ctx.operator.xp} XP)
- recent missions completed: ${ctx.recentMissionsCompleted ?? 0}
- active workflows: ${ctx.activeWorkflows ?? 0}
`;
}

export function genubraStream(input: { ctx: GenubraContext; question: string; operatorId?: string | null }) {
  return aiStream({
    surface: "GENUBRA",
    system: SYSTEM,
    user: `${operatorBriefing(input.ctx)}\n[OPERATOR QUESTION]\n${input.question}`,
    operatorId: input.operatorId ?? null,
  });
}

/**
 * Daily briefing — short, calibrated tactical recommendation. Output is one
 * sentence on civilization context, one on operator-specific signal, then
 * a single primary call (and optional fallback). Read at the top of the
 * dashboard so the first thing the operator sees each session is "what
 * should I do today."
 */
export async function genubraDailyBriefing(input: {
  ctx: GenubraContext;
  recentTransmissions?: string[];
  inFlightMissions?: string[];
  operatorId?: string | null;
}): Promise<string> {
  const recents = input.recentTransmissions?.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join("\n") ?? "(none)";
  const inflight = input.inFlightMissions?.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join("\n") ?? "(none)";

  return aiComplete({
    surface: "AD_HOC",
    system: SYSTEM,
    user:
`${operatorBriefing(input.ctx)}
[RECENT FEDERATION TRAFFIC]
${recents}

[OPERATOR'S IN-FLIGHT MISSIONS]
${inflight}

[REQUEST]
Produce the operator's "daily briefing." Output exactly:
1. One sentence on civilization context (what the federation is doing).
2. One sentence on operator-specific signal (where this operator's leverage is right now).
3. PRIMARY CALL: <imperative verb-led one-liner, the single highest-leverage move for the next 4 hours>.
4. (Optional) FALLBACK: <one alternate move if the primary is blocked>.

Do not preamble. Do not number labels — write them as "PRIMARY CALL:" prefix only. Total under 90 words.`,
    operatorId: input.operatorId ?? null,
    maxTokens: 320,
  });
}

export async function genubraSuggestMissions(input: { ctx: GenubraContext; objective: string; operatorId?: string | null }) {
  return aiComplete({
    surface: "MISSION_GEN",
    system: SYSTEM,
    user: `${operatorBriefing(input.ctx)}\n[REQUEST]\nGenerate 3 actionable missions to advance this objective:\n${input.objective}`,
    operatorId: input.operatorId ?? null,
    maxTokens: 800,
  });
}
