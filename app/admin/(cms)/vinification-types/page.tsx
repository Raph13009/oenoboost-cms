import { WorkspacePage } from "@/components/admin/WorkspacePage";
import { getVinificationTypes } from "./actions";
import { VinificationTypesView } from "@/components/admin/vinification-types/VinificationTypesView";

export default async function VinificationTypesPage() {
  let vinificationTypes: Awaited<ReturnType<typeof getVinificationTypes>> = [];
  try {
    vinificationTypes = await getVinificationTypes();
  } catch {
    vinificationTypes = [];
  }

  return (
    <WorkspacePage
      title="Vinification"
      description="Gérez les types de vinification. Sélectionnez une ligne pour modifier le panneau."
      flushLeft
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <VinificationTypesView vinificationTypes={vinificationTypes} />
      </div>
    </WorkspacePage>
  );
}
