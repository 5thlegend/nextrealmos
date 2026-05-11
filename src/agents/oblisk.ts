import { aiComplete } from "./ai-router";
import { z } from "zod";
import type { WorkflowStepType } from "@/types/nros";

const SYSTEM = `You are OBLISK — the workflow manifestation engine of NROS.

You decompose an operator's objective into a structured roadmap.

You MUST respond with strict JSON matching this TypeScript shape (no prose, no markdown fences):

{
  "title": string,
  "summary": string,                              // 1-2 sentences
  "recommended_stack": string[],                  // 3-8 concrete tools / frameworks / services
  "monetization_notes": string,                   // 1-3 sentences on revenue model + time-to-revenue
  "phases": [
    {
      "title": string,
      "detail": string,                           // 1 sentence
      "estimated_hours": number,
      "tasks": [
        { "type": "TASK"|"AUTOMATION"|"DECISION", "title": string, "detail": string, "estimated_hours": number }
      ]
    }
  ]
}

Constraints:
- 3 to 5 phases.
- 2 to 5 tasks per phase.
- Each task type is exactly one of TASK | AUTOMATION | DECISION.
- estimated_hours is a positive number; round to 0.5 increments.
- Do NOT wrap the JSON in code fences. Do NOT add commentary.`;

const TaskSchema = z.object({
  type: z.enum(["TASK", "AUTOMATION", "DECISION"]),
  title: z.string(),
  detail: z.string(),
  estimated_hours: z.number().positive(),
});

const PhaseSchema = z.object({
  title: z.string(),
  detail: z.string(),
  estimated_hours: z.number().positive(),
  tasks: z.array(TaskSchema).min(1).max(8),
});

export const ObliskPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  recommended_stack: z.array(z.string()).min(1),
  monetization_notes: z.string(),
  phases: z.array(PhaseSchema).min(1).max(8),
});
export type ObliskPlan = z.infer<typeof ObliskPlanSchema>;

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  return first !== -1 && last !== -1 ? raw.slice(first, last + 1) : raw;
}

export async function obliskDecompose(input: {
  objective: string;
  operatorCallsign: string;
  operatorId?: string | null;
}): Promise<ObliskPlan> {
  const raw = await aiComplete({
    surface: "OBLISK",
    system: SYSTEM,
    user: `[OPERATOR] ${input.operatorCallsign}\n[OBJECTIVE]\n${input.objective}\n\nReturn ONLY the JSON object.`,
    operatorId: input.operatorId ?? null,
    maxTokens: 2400,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    throw new Error(`OBLISK returned invalid JSON: ${(err as Error).message}\nRaw: ${raw.slice(0, 400)}`);
  }
  return ObliskPlanSchema.parse(parsed);
}

export type FlatStep = {
  parent_index: number | null;
  type: WorkflowStepType;
  title: string;
  detail: string;
  estimated_hours: number;
  order_index: number;
};

export function flattenPlanForInsert(plan: ObliskPlan): FlatStep[] {
  const out: FlatStep[] = [];
  let order = 0;
  plan.phases.forEach((phase, phaseIdx) => {
    out.push({
      parent_index: null,
      type: "PHASE",
      title: phase.title,
      detail: phase.detail,
      estimated_hours: phase.estimated_hours,
      order_index: order++,
    });
    const phasePosition = out.length - 1;
    phase.tasks.forEach((t) => {
      out.push({
        parent_index: phasePosition,
        type: t.type,
        title: t.title,
        detail: t.detail,
        estimated_hours: t.estimated_hours,
        order_index: order++,
      });
    });
    void phaseIdx;
  });
  return out;
}
