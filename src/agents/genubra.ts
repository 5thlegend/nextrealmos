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

export async function genubraSuggestMissions(input: { ctx: GenubraContext; objective: string; operatorId?: string | null }) {
  return aiComplete({
    surface: "MISSION_GEN",
    system: SYSTEM,
    user: `${operatorBriefing(input.ctx)}\n[REQUEST]\nGenerate 3 actionable missions to advance this objective:\n${input.objective}`,
    operatorId: input.operatorId ?? null,
    maxTokens: 800,
  });
}
