import { notFound } from "next/navigation";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { getWorkflowWithSteps } from "@/services/workflow-service";
import type { WorkflowStep } from "@/types/nros";

export default async function WorkflowDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkflowWithSteps(id);
  if (!data) notFound();
  const { workflow, steps } = data;

  const phases = steps.filter((s) => s.type === "PHASE").sort((a, b) => a.order_index - b.order_index);
  const tasksByPhase = new Map<string | null, WorkflowStep[]>();
  steps.filter((s) => s.type !== "PHASE").forEach((t) => {
    const list = tasksByPhase.get(t.parent_id) ?? [];
    list.push(t);
    tasksByPhase.set(t.parent_id, list);
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="nros-eyebrow">// oblisk · workflow</p>
        <h1 className="text-3xl font-semibold tracking-tight">{workflow.title}</h1>
        <p className="text-sm text-muted-foreground">{workflow.objective}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="muted">{workflow.status}</Badge>
        </div>
      </header>

      {workflow.ai_summary && (
        <Panel eyebrow="// summary"><p className="text-sm leading-relaxed">{workflow.ai_summary}</p></Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel eyebrow="// recommended stack">
          <ul className="flex flex-wrap gap-2">
            {workflow.recommended_stack.map((s) => <li key={s}><Badge>{s}</Badge></li>)}
          </ul>
        </Panel>
        <Panel eyebrow="// monetization notes">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {workflow.monetization_notes ?? "—"}
          </p>
        </Panel>
      </div>

      <div className="space-y-4">
        {phases.map((phase, i) => {
          const tasks = (tasksByPhase.get(phase.id) ?? []).sort((a, b) => a.order_index - b.order_index);
          return (
            <Panel
              key={phase.id}
              eyebrow={`// phase ${i + 1} · ${phase.estimated_hours ?? "?"}h`}
              title={phase.title}
              action={<Badge variant="muted">{phase.status}</Badge>}
            >
              {phase.detail && <p className="text-sm text-muted-foreground mb-4">{phase.detail}</p>}
              <ul className="divide-y divide-border/40">
                {tasks.map((t) => (
                  <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.detail && <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={t.type === "AUTOMATION" ? "accent" : t.type === "DECISION" ? "warn" : "muted"}>
                        {t.type}
                      </Badge>
                      {t.estimated_hours && (
                        <span className="font-mono text-[10px] text-muted-foreground">{t.estimated_hours}h</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
