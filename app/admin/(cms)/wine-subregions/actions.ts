"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type WineSubregion = {
  id: string;
  region_id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  area_hectares: number | null;
  description_fr: string | null;
  description_en: string | null;
  geojson: unknown;
  centroid_lat: number | null;
  centroid_lng: number | null;
  map_order: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** From join: wine_regions.name_fr (set when fetching list) */
  region_name_fr?: string | null;
};

export type WineSubregionListItem = Pick<
  WineSubregion,
  "id" | "region_id" | "slug" | "name_fr" | "name_en" | "status" | "updated_at" | "region_name_fr"
>;

const WINE_SUBREGION_LIST_COLUMNS = `
  id,
  region_id,
  slug,
  name_fr,
  name_en,
  status,
  updated_at,
  wine_regions!region_id(name_fr)
`;

const WINE_SUBREGION_DETAIL_COLUMNS = `
  id,
  region_id,
  slug,
  name_fr,
  name_en,
  area_hectares,
  description_fr,
  description_en,
  geojson,
  centroid_lat,
  centroid_lng,
  map_order,
  status,
  published_at,
  created_at,
  updated_at,
  deleted_at
`;

function mapSubregionRows(
  rows: Array<
    Omit<WineSubregionListItem, "region_name_fr"> & {
      wine_regions: { name_fr: string } | { name_fr: string }[] | null;
    }
  >
): WineSubregionListItem[] {
  return rows.map((r) => {
    const { wine_regions, ...rest } = r;
    const region =
      wine_regions == null
        ? null
        : Array.isArray(wine_regions)
          ? wine_regions[0]
          : wine_regions;
    return {
      ...rest,
      region_name_fr: region?.name_fr ?? null,
    };
  }) as WineSubregionListItem[];
}

export async function getWineSubregionsLite(): Promise<
  Array<Pick<WineSubregion, "id" | "region_id" | "name_fr">>
> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wine_subregions")
    .select(
      `
      id,
      region_id,
      name_fr,
    `
    )
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<{ id: string; region_id: string; name_fr: string }>;
  return rows.map((row) => ({
    id: row.id,
    region_id: row.region_id,
    name_fr: row.name_fr,
  }));
}

export async function getWineSubregionsPaginated(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ subregions: WineSubregionListItem[]; hasPrev: boolean; hasNext: boolean }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const fetchLimit = limit + 1;
  const from = offset;
  const to = offset + fetchLimit - 1;

  const { data, error } = await supabase
    .from("wine_subregions")
    .select(WINE_SUBREGION_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("name_fr", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as (Omit<WineSubregionListItem, "region_name_fr"> & {
    wine_regions: { name_fr: string } | { name_fr: string }[] | null;
  })[];
  const hasNext = rows.length > limit;
  const hasPrev = offset > 0;
  const limitedRows = rows.slice(0, limit);

  return {
    subregions: mapSubregionRows(limitedRows),
    hasPrev,
    hasNext,
  };
}

export async function getWineSubregion(id: string): Promise<WineSubregion | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wine_subregions")
    .select(WINE_SUBREGION_DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as WineSubregion;
}

type WineSubregionForm = Omit<
  WineSubregion,
  "id" | "created_at" | "updated_at" | "deleted_at" | "region_name_fr"
> & {
  id?: string;
};

function formToRow(form: WineSubregionForm): Record<string, unknown> {
  let geojson: unknown = form.geojson ?? null;
  if (typeof geojson === "string" && geojson.trim()) {
    try {
      geojson = JSON.parse(geojson);
    } catch {
      geojson = null;
    }
  }
  return {
    region_id: form.region_id || null,
    slug: form.slug || null,
    name_fr: form.name_fr || "",
    name_en: form.name_en || null,
    area_hectares: form.area_hectares ?? null,
    description_fr: form.description_fr || null,
    description_en: form.description_en || null,
    geojson,
    centroid_lat: form.centroid_lat ?? null,
    centroid_lng: form.centroid_lng ?? null,
    map_order: form.map_order ?? null,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };
}

export async function createWineSubregion(
  form: WineSubregionForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("wine_subregions").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/wine-subregions");
  return {};
}

export async function updateWineSubregion(
  id: string,
  form: WineSubregionForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("wine_subregions").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/wine-subregions");
  return {};
}

export async function deleteWineSubregion(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("wine_subregions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/wine-subregions");
  return {};
}
