import { getSupabaseAdmin } from "@/lib/supabase";
import { AopFranceMap } from "@/components/test/AopFranceMap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RegionPoint = {
  id: string;
  slug: string;
  name_fr: string;
  centroid_lat: number;
  centroid_lng: number;
  subregion_count: number;
};

async function getRegionPoints(): Promise<RegionPoint[]> {
  const supabase = getSupabaseAdmin();
  const pageSize = 500;
  let from = 0;
  const allRows: Array<{
    region_id: string;
    centroid_lat: number;
    centroid_lng: number;
    wine_regions:
      | { name_fr: string; slug: string }
      | { name_fr: string; slug: string }[]
      | null;
  }> = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("wine_subregions")
      .select("region_id, centroid_lat, centroid_lng, wine_regions!region_id(name_fr,slug)")
      .is("deleted_at", null)
      .not("centroid_lat", "is", null)
      .not("centroid_lng", "is", null)
      .range(from, to);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      region_id: string | null;
      centroid_lat: number | null;
      centroid_lng: number | null;
      wine_regions:
        | { name_fr: string; slug: string }
        | { name_fr: string; slug: string }[]
        | null;
    }>;

    if (rows.length === 0) break;

    allRows.push(
      ...rows.filter(
        (row): row is {
          region_id: string;
          centroid_lat: number;
          centroid_lng: number;
          wine_regions:
            | { name_fr: string; slug: string }
            | { name_fr: string; slug: string }[]
            | null;
        } =>
          row.region_id != null &&
          row.centroid_lat != null &&
          row.centroid_lng != null
      )
    );

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const grouped = new Map<string, RegionPoint>();
  const accum = new Map<
    string,
    { latSum: number; lngSum: number; count: number; name_fr: string; slug: string }
  >();

  for (const row of allRows) {
    const region = Array.isArray(row.wine_regions) ? row.wine_regions[0] : row.wine_regions;
    if (!region?.name_fr || !region.slug) continue;

    const current = accum.get(row.region_id) ?? {
      latSum: 0,
      lngSum: 0,
      count: 0,
      name_fr: region.name_fr,
      slug: region.slug,
    };
    current.latSum += row.centroid_lat;
    current.lngSum += row.centroid_lng;
    current.count += 1;
    accum.set(row.region_id, current);
  }

  for (const [id, entry] of Array.from(accum.entries())) {
    grouped.set(id, {
      id,
      slug: entry.slug,
      name_fr: entry.name_fr,
      centroid_lat: entry.latSum / entry.count,
      centroid_lng: entry.lngSum / entry.count,
      subregion_count: entry.count,
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr"));
}

export default async function AopMapTestPage() {
  const regions = await getRegionPoints();

  return (
    <main className="h-[calc(100vh-64px)] p-4">
      <h1 className="mb-3 text-lg font-semibold text-slate-900">Test Map Subregions France</h1>
      <div className="h-[calc(100%-2.25rem)] overflow-hidden rounded-lg border border-slate-200">
        <AopFranceMap regions={regions} />
      </div>
    </main>
  );
}
