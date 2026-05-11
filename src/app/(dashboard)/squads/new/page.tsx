import { Panel } from "@/components/nros/panel";
import { NewSquadForm } from "./new-squad-form";

export default function NewSquadPage() {
  return (
    <div className="max-w-xl">
      <Panel eyebrow="// federation · new" title="Found a Squad">
        <NewSquadForm />
      </Panel>
    </div>
  );
}
