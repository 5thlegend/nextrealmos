import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { AchievementCard } from "@/components/nros/achievement-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listOperatorAchievementsByCallsign, type AchievementRarity } from "@/services/achievement-service";

export const runtime = "edge";

const RARITY_ORDER: AchievementRarity[] = ["MYTHIC", "EPIC", "RARE", "UNCOMMON", "COMMON"];

export default async function PublicOperatorAchievements({ params }: { params: Promise<{ callsign: string }> }) {
  const { callsign } = await params;
  const decoded = decodeURIComponent(callsign);
  const result = await listOperatorAchievementsByCallsign(decoded);
  if (!result) notFound();

  const total = result.unlocked.length + result.locked.length;
  const pct = total > 0 ? Math.round((result.unlocked.length / total) * 100) : 0;

  const byRarity = (rarity: AchievementRarity) => ({
    unlocked: result.unlocked.filter((a) => a.rarity === rarity).length,
    total:    result.unlocked.filter((a) => a.rarity === rarity).length + result.locked.filter((a) => a.rarity === rarity).length,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/operator/${encodeURIComponent(result.callsign)}`}><ArrowLeft className="h-3 w-3" /> {result.callsign} dossier</Link>
        </Button>
        <p className="nros-eyebrow">// civilization · trophy hall</p>
        <h1 className="text-2xl font-semibold tracking-tight">{result.callsign} · achievements</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// completion" value={`${pct}%`} hint={`${result.unlocked.length} of ${total}`} trend="up" />
        <Stat label="// mythic" value={`${byRarity("MYTHIC").unlocked}/${byRarity("MYTHIC").total}`} hint="rarest tier" />
        <Stat label="// epic" value={`${byRarity("EPIC").unlocked}/${byRarity("EPIC").total}`} hint="federation echelon" />
        <Stat label="// rare" value={`${byRarity("RARE").unlocked}/${byRarity("RARE").total}`} hint="" />
      </div>

      <Panel eyebrow={`// unlocked · ${result.unlocked.length}`} title="Earned achievements">
        {result.unlocked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">// no achievements yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {RARITY_ORDER.flatMap((r) => result.unlocked.filter((a) => a.rarity === r)).map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </Panel>

      <Panel eyebrow={`// locked · ${result.locked.length}`} title="Yet to unlock">
        {result.locked.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm">// 100% completion. <Badge variant="accent">SOVEREIGN</Badge></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {result.locked.map((a) => <AchievementCard key={a.id} a={a} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
