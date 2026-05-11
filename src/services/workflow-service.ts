import { createSupabaseServer } from "@/lib/supabase/server";
import { obliskDecompose, flattenPlanForInsert, type ObliskPlan } from "@/agents/oblisk";
import { awardXp } from "./xp-service";
import type { Workflow, WorkflowStep } from "@/types/nros";

export async function listWorkflows(operatorId: string): Promise<Workflow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("workflows")
    .select("*")
    .eq("operator_id", operatorId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Workflow[];
}

export async function getWorkflowWithSteps(workflowId: string) {
  const supabase = await createSupabaseServer();
  const { data: workflow } = await supabase.from("workflows").select("*").eq("id", workflowId).maybeSingle();
  if (!workflow) return null;
  const { data: steps } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("order_index");
  return { workflow: workflow as Workflow, steps: (steps ?? []) as WorkflowStep[] };
}

export async function createWorkflowFromObjective(input: {
  operatorId: string;
  operatorCallsign: string;
  objective: string;
}): Promise<{ workflowId: string; plan: ObliskPlan }> {
  const plan = await obliskDecompose({
    objective: input.objective,
    operatorCallsign: input.operatorCallsign,
    operatorId: input.operatorId,
  });

  const supabase = await createSupabaseServer();
  const { data: wf, error } = await supabase
    .from("workflows")
    .insert({
      operator_id: input.operatorId,
      title: plan.title,
      objective: input.objective,
      status: "ACTIVE",
      ai_summary: plan.summary,
      monetization_notes: plan.monetization_notes,
      recommended_stack: plan.recommended_stack,
    })
    .select("id")
    .single();
  if (error) throw error;

  const flat = flattenPlanForInsert(plan);

  // Insert phases first to obtain ids, then tasks with correct parent_id.
  const phaseRows = flat.filter((s) => s.type === "PHASE");
  const insertedPhaseIds: string[] = [];
  for (const phase of phaseRows) {
    const { data: row, error: e } = await supabase
      .from("workflow_steps")
      .insert({
        workflow_id: wf.id,
        type: phase.type,
        title: phase.title,
        detail: phase.detail,
        estimated_hours: phase.estimated_hours,
        order_index: phase.order_index,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (e) throw e;
    insertedPhaseIds.push(row.id);
  }

  // Tasks reference their parent phase by parent_index (= position in `flat` array).
  const taskRows = flat
    .filter((s) => s.type !== "PHASE")
    .map((task) => {
      // find the phase whose position in `flat` matches task.parent_index
      const parentFlatIdx = task.parent_index!;
      const parentPhaseSlot = phaseRows.findIndex((p, i) => {
        const pos = flat.indexOf(p);
        return pos === parentFlatIdx;
      });
      const parent_id = insertedPhaseIds[parentPhaseSlot] ?? null;
      return {
        workflow_id: wf.id,
        parent_id,
        type: task.type,
        title: task.title,
        detail: task.detail,
        estimated_hours: task.estimated_hours,
        order_index: task.order_index,
        status: "PENDING" as const,
      };
    });

  if (taskRows.length > 0) {
    const { error: tErr } = await supabase.from("workflow_steps").insert(taskRows);
    if (tErr) throw tErr;
  }

  // Reward XP for first workflow in this kernel session.
  await awardXp({
    operatorId: input.operatorId,
    delta: 100,
    reason: `OBLISK workflow forged: ${plan.title}`,
    sourceType: "WORKFLOW",
    sourceId: wf.id,
  }).catch(() => undefined);

  return { workflowId: wf.id, plan };
}

export async function updateStepStatus(stepId: string, status: WorkflowStep["status"]) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("workflow_steps").update({ status }).eq("id", stepId);
  if (error) throw error;
}
