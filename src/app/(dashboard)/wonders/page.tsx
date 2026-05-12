import Link from "next/link";
import { Landmark, Compass, Crown, Globe, Network, Star, Workflow as WorkflowIcon } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { listWonders } from "@/services/wonder-service";

export const runtime = "edge";

const ICON_MAP = {
  landmark: Landmark,
  compass:  Compass,
  crown:    Crown,
  globe:    Globe,
  network:  Network,
  star:     Star,
  workflow: WorkflowIcon,
} as const;

const ERA_ORDER = [
  "ANCIENT", "CLASSICAL", "MEDIEVAL", "RENAISSANCE",
  "INDUSTRIAL", "MODERN", "INFORMATION", "FUTURE",
] as const;

export default async function WondersPage() {
  const wonders = await listWonders();

  const byEra = new Map<string, typeof wonders>();
  for (const era of ERA_ORDER) byEra.set(era, []);
  for (const w of wonders) byEra.get(w.era)!.push(w);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// federation wonders · permanent marquee builds</p>
        <h1 className="text-2xl font-semibold tracking-tight">Wonders</h1>
        <p className="text-sm text-muted-foreground">
          Wonders are visible to every realm. Each one anchors the federation in an era.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// total wonders" value={wonders.length} hint="federation-visible" trend="up" />
        <Stat label="// realms" value={new Set(wonders.map((w) => w.realm_id)).size} hint="have a wonder" />
        <Stat label="// builders" value={new Set(wonders.map((w) => w.builder_id).filter(Boolean)).size} hint="ascended" />
        <Stat label="// eras represented" value={new Set(wonders.map((w) => w.era)).size} hint="of 8" />
      </div>

      {ERA_ORDER.filter((era) => (byEra.get(era)?.length ?? 0) > 0).map((era) => (
        <Panel key={era} eyebrow={`// ${era.toLowerCase()} era`} title={`${eraDisplay(era)} · ${byEra.get(era)!.length}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {byEra.get(era)!.map((w) => {
              const Icon = (ICON_MAP[w.icon as keyof typeof ICON_MAP] ?? Landmark);
              return (
                <Link
                  key={w.id}
                  href={w.realm_slug ? `/realms/${w.realm_slug}` : "#"}
                  className="rounded-md border bg-card/70 p-4 hover:scale-[1.01] transition-transform relative overflow-hidden"
                  style={{
                    borderLeftColor: w.banner_color,
                    borderLeftWidth: 3,
                    boxShadow: `0 0 22px ${w.banner_color}22`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-12 h-12 rounded-md grid place-items-center border"
                      style={{ borderColor: `${w.banner_color}66`, color: w.banner_color, backgroundColor: `${w.banner_color}11` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight">{w.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{w.tagline}</p>
                      {w.effect && (
                        <p className="text-xs italic mt-2 leading-snug" style={{ color: w.banner_color }}>
                          {w.effect}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          /{w.realm_slug}
                        </span>
                        {w.builder_callsign && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            built by <span className="text-primary">{w.builder_callsign}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>
      ))}

      {wonders.length === 0 && (
        <Panel eyebrow="// no wonders yet">
          <p className="text-sm text-muted-foreground">
            No federation Wonders have been built yet. Wonders are seeded with the V3.3 migration; if you see this in production, the migration hasn&apos;t been applied.
          </p>
        </Panel>
      )}
    </div>
  );
}

function eraDisplay(era: string) {
  return era.charAt(0) + era.slice(1).toLowerCase();
}
