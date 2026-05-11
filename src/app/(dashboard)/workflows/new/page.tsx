import { Panel } from "@/components/nros/panel";
import { NewWorkflowForm } from "./new-workflow-form";

export default function NewWorkflowPage() {
  return (
    <div className="max-w-2xl">
      <Panel eyebrow="// oblisk · forge" title="Decompose an objective" scanlines>
        <p className="text-sm text-muted-foreground mb-4">
          State your objective. OBLISK will return a structured roadmap — phases, tasks, automations,
          recommended stack, and monetization notes.
        </p>
        <NewWorkflowForm />
      </Panel>
    </div>
  );
}
