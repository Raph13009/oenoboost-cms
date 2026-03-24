import { WorkspacePage } from "@/components/admin/WorkspacePage";
import { getWineRegionsLite } from "@/app/admin/(cms)/wine-regions/actions";
import { getWineSubregionsLite } from "@/app/admin/(cms)/wine-subregions/actions";
import { getAppellations } from "./actions";
import { AppellationsView } from "@/components/admin/appellations/AppellationsView";

export default async function AppellationsPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string; status?: string; region?: string };
}) {
  const pageSize = 14;
  const pageNumRaw = searchParams?.page ?? "1";
  const searchQuery = (searchParams?.q ?? "").trim();
  const statusFilter = (searchParams?.status ?? "all").trim();
  const regionFilter = (searchParams?.region ?? "all").trim();
  const pageNum = Number.parseInt(pageNumRaw, 10);
  const currentPage = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
  const offset = (currentPage - 1) * pageSize;

  let appellations: Awaited<ReturnType<typeof getAppellations>>["appellations"] = [];
  let hasPrev = false;
  let hasNext = false;
  let totalCount = 0;
  let regions: Awaited<ReturnType<typeof getWineRegionsLite>> = [];
  let subregions: Awaited<ReturnType<typeof getWineSubregionsLite>> = [];
  try {
    const res = await getAppellations({
      limit: pageSize,
      offset,
      query: searchQuery,
      status: statusFilter,
      regionId: regionFilter,
    });
    ({ appellations, hasPrev, hasNext, totalCount } = res);
  } catch {
    appellations = [];
    hasPrev = false;
    hasNext = false;
    totalCount = 0;
  }

  const [regionsRes, subregionsRes] = await Promise.allSettled([
    getWineRegionsLite(),
    getWineSubregionsLite(),
  ]);

  regions = regionsRes.status === "fulfilled" ? regionsRes.value : [];
  subregions = subregionsRes.status === "fulfilled" ? subregionsRes.value : [];

  return (
    <WorkspacePage
      title="AOP"
      description="Gérez les AOP. Sélectionnez une ligne pour modifier le panneau."
      flushLeft
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppellationsView
          appellations={appellations}
          regions={regions}
          subregions={subregions}
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
          hasPrev={hasPrev}
          hasNext={hasNext}
          initialSearch={searchQuery}
          initialStatusFilter={statusFilter}
          initialRegionFilter={regionFilter}
        />
      </div>
    </WorkspacePage>
  );
}
