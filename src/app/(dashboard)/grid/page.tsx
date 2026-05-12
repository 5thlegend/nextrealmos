import { RealmGraphEngine } from "@/components/grid/realm-graph-engine";
import { WondersStrip } from "@/components/nros/wonders-strip";
import {
  getCivilizationOverview,
  listAgents,
  listEliteLeaders,
  listRealmNodes,
} from "@/services/civilization-service";
import { listWonders, getWonderCountsByRealm } from "@/services/wonder-service";

export const runtime = "edge";

export default async function GridPage() {
  const [overview, realms, leaders, agents, wonders, wonderCountsMap] = await Promise.all([
    getCivilizationOverview(),
    listRealmNodes(),
    listEliteLeaders(),
    listAgents(),
    listWonders(),
    getWonderCountsByRealm(),
  ]);

  const wonderCounts: Record<string, number> = {};
  for (const [k, v] of wonderCountsMap.entries()) wonderCounts[k] = v;

  return (
    <div className="space-y-3 max-w-full">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="nros-eyebrow">// realm graph engine · v3</p>
          <h1 className="text-2xl font-semibold tracking-tight">Civilization</h1>
          <p className="text-sm text-muted-foreground">
            Sovereign realms, elite leaders, agents, and operators. Click any realm node for detail.
          </p>
        </div>
      </header>

      <WondersStrip wonders={wonders} />

      <RealmGraphEngine
        realms={realms}
        leaders={leaders}
        agents={agents}
        overview={overview}
        wonderCounts={wonderCounts}
      />
    </div>
  );
}
