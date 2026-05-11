"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy } from "lucide-react";

export function NewRealmForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ slug: string; key: string } | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await fetch("/api/federation/realms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: String(fd.get("slug") ?? "").toLowerCase(),
            name: String(fd.get("name") ?? ""),
            description: String(fd.get("description") ?? "") || undefined,
            base_url: String(fd.get("base_url") ?? "") || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Could not register realm");
        setIssued({ slug: data.realm.slug, key: data.api_key.value });
        toast.success("Realm registered. Save the API key — it won't be shown again.");
      } catch (err: any) {
        toast.error(err?.message ?? "Could not register realm");
      }
    });
  }

  if (issued) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="nros-eyebrow">// realm · {issued.slug}</p>
          <p className="text-sm">Save this key in your realm's secrets as <code className="font-mono text-primary">NROS_API_KEY</code>. It will not be shown again.</p>
        </div>
        <div className="nros-deck p-3 font-mono text-xs flex items-center justify-between gap-3 border-primary/40">
          <code className="break-all text-primary">{issued.key}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { navigator.clipboard.writeText(issued.key); toast.success("Copied"); }}
          >
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push(`/realms`)}>Continue</Button>
          <Button variant="outline" onClick={() => router.push(`/realms/${issued.slug}`)}>Open realm</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required minLength={2} maxLength={48} placeholder="lastmile-os" pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" />
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.14em]">// lowercase, digits, hyphens — your realm's url-safe id</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required minLength={2} maxLength={64} placeholder="LastMile OS" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" maxLength={280} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="base_url">Base URL (optional)</Label>
        <Input id="base_url" name="base_url" type="url" placeholder="https://lastmile.example.com" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Registering…" : "Register & issue API key"}</Button>
    </form>
  );
}
