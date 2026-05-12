import { Panel } from "@/components/nros/panel";
import { MissionGeneratorForm } from "@/components/nros/mission-generator-form";
import { getCurrentOperator } from "@/services/operator-service";

export const runtime = "edge";

export default async function NewMissionPage() {
  const op = (await getCurrentOperator())!;
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// mission architect · genubra</p>
        <h1 className="text-2xl font-semibold tracking-tight">Generate missions</h1>
        <p className="text-sm text-muted-foreground">
          Tell GENUBRA your focus. It produces 3–5 calibrated, shippable missions for your rank.
          Preview them, then publish the ones you want into the mission queue.
        </p>
      </header>

      <Panel eyebrow="// focus · what should the week move?" scanlines>
        <MissionGeneratorForm
          operatorRank={op.rank?.name ?? "Initiate"}
          operatorCallsign={op.profile.callsign}
        />
      </Panel>
    </div>
  );
}
