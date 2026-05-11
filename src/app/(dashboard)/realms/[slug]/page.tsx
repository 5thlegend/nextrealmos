import { notFound } from "next/navigation";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { getRealmBySlug } from "@/services/realm-service";
import { listTransmissions } from "@/services/transmission-service";
import { getCurrentOperator } from "@/services/operator-service";
import { relativeTime } from "@/lib/utils";

export const runtime = "edge";

export default async function RealmDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) notFound();

  const [feed, op] = await Promise.all([
    listTransmissions({ realmId: realm.id, limit: 30 }),
    getCurrentOperator(),
  ]);
  const isOwner = op?.profile.id === realm.owner_operator_id;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="nros-eyebrow">// realm · /{realm.slug}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{realm.name}</h1>
        {realm.description && <p className="text-sm text-muted-foreground">{realm.description}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={realm.status === "ACTIVE" ? "default" : "muted"}>{realm.status}</Badge>
          {isOwner && <Badge variant="accent">YOU OWN THIS</Badge>}
          {realm.base_url && (
            <a href={realm.base_url} target="_blank" rel="noreferrer" className="badge-outline text-primary hover:underline">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">↗ {new URL(realm.base_url).host}</span>
            </a>
          )}
        </div>
      </header>

      {isOwner && (
        <Panel eyebrow="// integration" title="Connect your realm">
          <p className="text-sm text-muted-foreground mb-3">Install the SDK and start pushing transmissions:</p>
          <pre className="nros-deck p-4 text-xs font-mono overflow-x-auto"><code>{`import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "${process.env.NEXT_PUBLIC_APP_URL ?? "https://nextrealmos.pages.dev"}",
  apiKey:  process.env.NROS_API_KEY!,
});

await nros.transmissions.push({
  kind: "MISSION_COMPLETED",
  title: "Operator did the thing",
  operator_id: "<uuid>",
});`}</code></pre>
        </Panel>
      )}

      <Panel eyebrow={`// transmissions · ${feed.length}`} title="Realm activity">
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no transmissions yet — the realm has not pushed events</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {feed.map((tx: any) => (
              <li key={tx.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx.title}</p>
                  {tx.body && <p className="text-xs text-muted-foreground mt-0.5">{tx.body}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="muted">{tx.kind}</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(tx.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
