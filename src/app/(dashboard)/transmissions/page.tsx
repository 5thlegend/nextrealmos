import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { listTransmissions } from "@/services/transmission-service";
import { relativeTime } from "@/lib/utils";

export const runtime = "edge";

export default async function TransmissionsPage() {
  const feed = await listTransmissions({ limit: 200 });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// federated feed</p>
        <h1 className="text-2xl font-semibold tracking-tight">Transmissions</h1>
        <p className="text-sm text-muted-foreground">Every event pushed by every realm in the federation. Real-time.</p>
      </header>

      <Panel eyebrow={`// signals · ${feed.length}`}>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">// transmissions feed is silent — realms have not pushed any events</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {feed.map((tx: any) => (
              <li key={tx.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {tx.realms?.slug && (
                      <Link href={`/realms/${tx.realms.slug}`} className="font-mono text-primary hover:underline">
                        /{tx.realms.slug}
                      </Link>
                    )}
                    <span>·</span>
                    <span>{relativeTime(tx.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium mt-0.5">{tx.title}</p>
                  {tx.body && <p className="text-xs text-muted-foreground mt-0.5">{tx.body}</p>}
                </div>
                <Badge variant={kindVariant(tx.kind)}>{tx.kind}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function kindVariant(kind: string): "default" | "accent" | "warn" | "muted" {
  switch (kind) {
    case "RANK_CHANGED": return "accent";
    case "ACHIEVEMENT_UNLOCKED": return "warn";
    case "REALM_REGISTERED": return "default";
    default: return "muted";
  }
}
