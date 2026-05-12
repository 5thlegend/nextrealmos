"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Owner-only vault toggle for a realm. Vault sends to cold storage; restore
 * brings it back. Both emit federation transmissions (realm.vault /
 * realm.restore) via the API.
 */
export function VaultControls({
  slug,
  vaulted,
}: {
  slug: string;
  vaulted: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const vault = () => {
    startTransition(async () => {
      try {
        const r = await fetch(`/api/federation/realms/${encodeURIComponent(slug)}/vault`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason || undefined }),
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Vault failed");
        toast.success("Realm sent to vault", { description: "Records preserved. Deploy frozen." });
        setConfirming(false);
        setReason("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Vault failed");
      }
    });
  };

  const restore = () => {
    startTransition(async () => {
      try {
        const r = await fetch(`/api/federation/realms/${encodeURIComponent(slug)}/vault`, {
          method: "DELETE",
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Restore failed");
        toast.success("Realm restored", { description: "Status returned to ACTIVE" });
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Restore failed");
      }
    });
  };

  if (vaulted) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          This realm is in cold storage. Restore returns it to ACTIVE and emits a <code className="font-mono text-primary">realm.restore</code> event.
        </p>
        <Button size="sm" onClick={restore} disabled={pending}>
          <ArchiveRestore className="h-3 w-3" /> {pending ? "Restoring…" : "Restore"}
        </Button>
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Vault preserves all records and freezes the deploy. Operators can still see the realm at <code className="font-mono text-primary">/realms/{slug}</code>, marked vaulted.
        </p>
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          <Archive className="h-3 w-3" /> Vault realm
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-amber-300">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-xs">
          Confirm vaulting <code className="font-mono">{slug}</code>. This emits a federation <code className="font-mono">realm.vault</code> event visible to every realm.
        </p>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional, max 280 chars)"
        maxLength={280}
        className="w-full bg-secondary/40 border border-border/60 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => { setConfirming(false); setReason(""); }} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={vault} disabled={pending}>
          {pending ? "Vaulting…" : "Confirm vault"}
        </Button>
      </div>
    </div>
  );
}
