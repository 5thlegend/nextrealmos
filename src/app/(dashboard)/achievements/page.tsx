import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { Badge } from "@/components/ui/badge";
import { AchievementCard } from "@/components/nros/achievement-card";
import { listOperatorAchievements, getCivilizationProgress, type AchievementRarity } from "@/services/achievement-service";
import { getCurrentOperator } from "@/services/operator-service";

export const runtime = "edge";

const RARITY_ORDER: AchievementRarity[] = ["MYTHIC", "EPIC", "RARE", "UNCOMMON", "COMMON"];

const ERA_ORDER = [
  "ANCIENT", "CLASSICAL", "MEDIEVAL", "RENAISSANCE",
  "INDUSTRIAL", "MODERN", "INFORMATION", "FUTURE",
] as const;

export default async function AchievementsPage() {
  const op = (await getCurrentOperator())!;
  const [list, progress] = await Promise.all([
    listOperatorAchievements(op.profile.id),
    getCivilizationProgress(op.profile.id),
  ]);

  const unlocked = list.filter((a) => a.unlocked);
  const visibleLocked = list.filter((a) => !a.unlocked && !a.secret);
  const hiddenCount = list.filter((a) => !a.unlocked && a.secret).length;

  // Group locked by era so the "tech tree to unlock" reads as eras
  const lockedByEra = new Map<string, typeof visibleLocked>();
  for (const era of ERA_ORDER) lockedByEra.set(era, []);
  for (const a of visibleLocked) lockedByEra.get(a.era)!.push(a);

  const recent = [...unlocked]
    .sort((a, b) => (b.awarded_at ?? "").localeCompare(a.awarded_at ?? ""))
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// civilization · trophy hall</p>
        <h1 className="text-2xl font-semibold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted-foreground">
          Permanent civilization marks. Unlock to earn bonus XP and federation-visible recognition.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// completion" value={`${progress.pct}%`} hint={`${progress.unlocked} of ${progress.total}`} trend="up" />
        <Stat label="// mythic" value={`${progress.byRarity.MYTHIC.unlocked}/${progress.byRarity.MYTHIC.total}`} hint="rarest tier" />
        <Stat label="// epic" value={`${progress.byRarity.EPIC.unlocked}/${progress.byRarity.EPIC.total}`} hint="federation echelon" />
        <Stat label="// hidden" value={hiddenCount} hint="secrets remaining" />
      </div>

      {recent.length > 0 && (
        <Panel eyebrow="// recent unlocks" title="Latest civilization marks" scanlines>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((a) => <AchievementCard key={a.id} a={a} />)}
          </div>
        </Panel>
      )}

      <Panel eyebrow={`// unlocked · ${unlocked.length}`} title="Unlocked achievements">
        {unlocked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">// no achievements unlocked yet — accept a mission, push a transmission, or forge a workflow.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {RARITY_ORDER.flatMap((r) => unlocked.filter((a) => a.rarity === r)).map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </Panel>

      <Panel eyebrow={`// locked · ${visibleLocked.length}${hiddenCount > 0 ? ` (+${hiddenCount} hidden)` : ""}`} title="Locked — civilization tech tree">
        <div className="space-y-6">
          {ERA_ORDER.filter((era) => (lockedByEra.get(era)?.length ?? 0) > 0).map((era) => (
            <div key={era}>
              <div className="flex items-center gap-3 mb-3">
                <p className="nros-eyebrow">// {era.toLowerCase()} era</p>
                <Badge variant="muted">{lockedByEra.get(era)!.length} to unlock</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {lockedByEra.get(era)!.map((a) => <AchievementCard key={a.id} a={a} />)}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="nros-eyebrow">// hidden</p>
                <Badge variant="muted">{hiddenCount} secret</Badge>
              </div>
              <p className="text-xs text-muted-foreground">// {hiddenCount} hidden achievement{hiddenCount === 1 ? "" : "s"} await discovery. play the civilization to reveal them.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
