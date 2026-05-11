import { Panel } from "@/components/nros/panel";
import { NewRealmForm } from "./new-realm-form";

export const runtime = "edge";

export default function NewRealmPage() {
  return (
    <div className="max-w-2xl">
      <Panel eyebrow="// federation · register" title="Bring a realm online" scanlines>
        <p className="text-sm text-muted-foreground mb-4">
          A realm is any independently deployable operator-facing app. Register it with NROS to inherit
          shared identity, federated XP, and the transmissions feed.
        </p>
        <NewRealmForm />
      </Panel>
    </div>
  );
}
