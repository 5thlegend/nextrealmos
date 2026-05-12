import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Landmark, Shield } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRealmBySlug } from "@/services/realm-service";
import { listWonders } from "@/services/wonder-service";
import { getCurrentOperator } from "@/services/operator-service";
import { createSupabaseServer } from "@/lib/supabase/server";
import { VaultControls } from "./vault-controls";
import { EliteLeadersPanel } from "./elite-leaders-panel";

export const runtime = "edge";

interface LeaderRow {
  id: string;
  role: "WARDEN" | "ARCHITECT" | "DIPLOMAT" | "OVERSEER";
  appointed_at: string;
  operator_profiles: { callsign?: string } | null;
}

export default async function RealmAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [realm, op] = await Promise.all([getRealmBySlug(slug), getCurrentOperator()]);
  if (!realm) notFound();
  if (!op) redirect(`/sign-in?next=/realms/${slug}/admin`);

  const isOwner = op.profile.id === realm.owner_operator_id;
  if (!isOwner) redirect(`/realms/${slug}`);

  const supabase = await createSupabaseServer();
  const [allWonders, leadersRes] = await Promise.all([
    listWonders(),
    supabase
      .from("elite_leaders")
      .select("id, role, appointed_at, operator_profiles(callsign)")
      .eq("realm_id", realm.id)
      .order("appointed_at", { ascending: false }),
  ]);
  const wonders = allWonders.filter((w) => w.realm_id === realm.id);
  const leaders = ((leadersRes.data ?? []) as LeaderRow[]).map((l) => ({
    id: l.id,
    role: l.role,
    callsign: l.operator_profiles?.callsign ?? "(unknown)",
    appointed_at: l.appointed_at,
  }));

  const isVaulted = !!realm.vaulted_at;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/realms/${realm.slug}`}><ArrowLeft className="h-3 w-3" /> public dossier</Link>
        </Button>
        <p className="nros-eyebrow">// realm admin · /{realm.slug}</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">{realm.name}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="accent">OWNER</Badge>
          <Badge variant={isVaulted ? "warn" : realm.status === "ACTIVE" ? "default" : "muted"}>
            {isVaulted ? "VAULTED" : realm.status}
          </Badge>
          {wonders.length > 0 && (
            <Badge variant="warn"><Landmark className="h-2.5 w-2.5" /> {wonders.length} wonder{wonders.length === 1 ? "" : "s"}</Badge>
          )}
        </div>
      </div>

      <Panel eyebrow="// integration" title="Connect your realm">
        <p className="text-sm text-muted-foreground mb-3">Install the SDK and start pushing transmissions:</p>
        <pre className="nros-deck p-4 text-xs font-mono overflow-x-auto"><code>{`import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "${process.env.NEXT_PUBLIC_APP_URL ?? "https://nextrealmos.pages.dev"}",
  apiKey:  process.env.NROS_API_KEY!,
});

await nros.transmissions.push({
  kind: "MISSION_COMPLETED",
  event_name: "deployment.launch",
  title: "Operator shipped X",
  callsign: "OPERATOR_CALLSIGN",
});`}</code></pre>
      </Panel>

      <Panel eyebrow="// governance · elite leaders" title="Appoint leadership" scanlines>
        <EliteLeadersPanel slug={realm.slug} initialLeaders={leaders} />
      </Panel>

      <Panel eyebrow="// governance · vault" title={isVaulted ? "Vault" : "Vault controls"}>
        <VaultControls slug={realm.slug} vaulted={isVaulted} />
      </Panel>

      {wonders.length > 0 && (
        <Panel eyebrow={`// wonders · ${wonders.length}`} title="Federation marquee">
          <ul className="space-y-2">
            {wonders.map((w) => (
              <li
                key={w.id}
                className="rounded-md border bg-card/70 p-3 flex items-start gap-3"
                style={{ borderLeftColor: w.banner_color, borderLeftWidth: 3 }}
              >
                <Landmark className="h-4 w-4 shrink-0 mt-0.5" style={{ color: w.banner_color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.tagline}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] shrink-0" style={{ color: w.banner_color }}>
                  {w.era.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
