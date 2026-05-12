import { RealmGraphEngine } from "@/components/grid/realm-graph-engine";
import {
  getCivilizationOverview,
  listAgents,
  listEliteLeaders,
  listRealmNodes,
} from "@/services/civilization-service";

export const runtime = "edge";

export default async function GridPage() {
  const [overview, realms, leaders, agents] = await Promise.all([
    getCivilizationOverview(),
    listRealmNodes(),
    listEliteLeaders(),
    listAgents(),
  ]);

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

      <RealmGraphEngine
        realms={realms}
        leaders={leaders}
        agents={agents}
        overview={overview}
      />
    </div>
  );
}
