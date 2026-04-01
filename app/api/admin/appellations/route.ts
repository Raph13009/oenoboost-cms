import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: appellationData, error: appellationError } = await supabase
    .from("appellations")
    .select("id,slug,name_fr,name_en,status,updated_at")
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (appellationError) {
    return NextResponse.json({ error: appellationError.message }, { status: 500 });
  }

  const appellationRows = (appellationData ?? []) as unknown as Array<{
    id: string;
    slug: string;
    name_fr: string;
    name_en: string | null;
    status: string;
    updated_at: string;
  }>;
  const appellationIds = appellationRows.map((row) => row.id);
  const { data: linkData, error: linkError } = await supabase
    .from("appellation_subregion_links")
    .select(
      `
      appellation_id,
      subregion_id,
      wine_subregions!subregion_id(
        id,
        name_fr,
        region_id,
        wine_regions!region_id(name_fr)
      )
    `
    )
    .in("appellation_id", appellationIds);
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const firstSubregionByAppellation = new Map<
    string,
    { id: string; name_fr: string | null; region_id: string | null; region_name_fr: string | null }
  >();
  const appellationLinks = (linkData ?? []) as unknown as Array<{
    appellation_id: string;
    subregion_id: string;
    wine_subregions:
      | {
          id: string;
          name_fr: string | null;
          region_id: string | null;
          wine_regions: { name_fr: string | null } | { name_fr: string | null }[] | null;
        }
      | null;
  }>;
  for (const link of appellationLinks) {
    if (firstSubregionByAppellation.has(link.appellation_id)) continue;
    const subregion = link.wine_subregions;
    const region = Array.isArray(subregion?.wine_regions)
      ? subregion?.wine_regions[0]
      : subregion?.wine_regions;
    firstSubregionByAppellation.set(link.appellation_id, {
      id: subregion?.id ?? link.subregion_id,
      name_fr: subregion?.name_fr ?? null,
      region_id: subregion?.region_id ?? null,
      region_name_fr: region?.name_fr ?? null,
    });
  }

  const appellations = appellationRows.map((row) => {
    const sr = firstSubregionByAppellation.get(row.id);

    return {
      ...row,
      subregion_id: sr?.id ?? null,
      subregion_name_fr: sr?.name_fr ?? null,
      region_name_fr: sr?.region_name_fr ?? null,
      region_id: sr?.region_id ?? null,
    };
  });

  return NextResponse.json({ appellations });
}
