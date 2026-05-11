"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function NewWorkflowForm() {
  const router = useRouter();
  const [objective, setObjective] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (objective.trim().length < 10) {
      toast.error("Objective must be at least 10 characters.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objective }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "OBLISK failed");
        toast.success("Workflow forged");
        router.push(`/workflows/${data.workflowId}`);
      } catch (e: any) {
        toast.error(e?.message ?? "OBLISK failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="objective">Objective</Label>
        <Textarea
          id="objective"
          rows={6}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Launch a paid newsletter for AI operators with 500 subscribers in 60 days."
        />
      </div>
      <Button onClick={submit} disabled={pending}>
        {pending ? "Decomposing…" : "Forge with OBLISK"}
      </Button>
    </div>
  );
}
