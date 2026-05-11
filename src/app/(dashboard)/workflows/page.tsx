import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow as WorkflowIcon } from "lucide-react";
import { listWorkflows } from "@/services/workflow-service";
import { getCurrentOperator } from "@/services/operator-service";
import { relativeTime } from "@/lib/utils";

export default async function WorkflowsPage() {
  const op = (await getCurrentOperator())!;
  const workflows = await listWorkflows(op.profile.id);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="nros-eyebrow">// oblisk</p>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">Decompose objectives into phases, tasks, and automations.</p>
        </div>
        <Button asChild><Link href="/workflows/new"><WorkflowIcon className="h-4 w-4" /> Forge new</Link></Button>
      </header>

      <Panel eyebrow={`// stored · ${workflows.length}`}>
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no workflows forged yet</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {workflows.map((w) => (
              <li key={w.id} className="py-3">
                <Link href={`/workflows/${w.id}`} className="block hover:text-primary">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{w.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{w.objective}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="muted">{w.status}</Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(w.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
