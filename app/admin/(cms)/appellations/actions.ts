"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Appellation = {
  id: string;
  subregion_id?: string | null;
  slug: string;
  name_fr: string;
  name_en: string | null;
  area_hectares: number | null;
  producer_count: number | null;
  production_volume_hl: number | null;
  price_range_min_eur: number | null;
  price_range_max_eur: number | null;
  history_fr: string | null;
  history_en: string | null;
  colors_grapes_fr: string | null;
  colors_grapes_en: string | null;
  soils_description_fr: string | null;
  soils_description_en: string | null;
  geojson: unknown;
  centroid_lat: number | null;
  centroid_lng: number | null;
  is_premium: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** From join: wine_subregions.name_fr */
  subregion_name_fr?: string | null;
  /** From join through subregion: wine_regions.name_fr */
  region_name_fr?: string | null;
  /** From join through subregion: wine_subregions.region_id */
  region_id?: string | null;
};

export type AppellationListItem = Pick<
  Appellation,
  "id" | "slug" | "name_fr" | "name_en" | "status" | "updated_at" | "subregion_id" | "subregion_name_fr" | "region_name_fr" | "region_id"
>;

export type AppellationLinkedSoilType = {
  id: string;
  name_fr: string;
  slug: string;
};

type LinkedSoilRow = {
  id: string;
  name_fr: string;
  slug: string;
};

type AppellationRegionRelation = { name_fr: string | null } | { name_fr: string | null }[] | null;
type AppellationSubregionFetchRow = {
  appellation_id: string;
  subregion_id: string;
  wine_subregions:
    | {
        id: string;
        name_fr: string | null;
        region_id: string | null;
        wine_regions: AppellationRegionRelation;
      }
    | {
        id: string;
        name_fr: string | null;
        region_id: string | null;
        wine_regions: AppellationRegionRelation;
      }[]
    | null;
};

function getFirstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const APPELLATION_LIST_COLUMNS = "id,slug,name_fr,name_en,status,updated_at";
const APPELLATION_DETAIL_COLUMNS =
  "id,slug,name_fr,name_en,area_hectares,producer_count,production_volume_hl,price_range_min_eur,price_range_max_eur,history_fr,history_en,colors_grapes_fr,colors_grapes_en,soils_description_fr,soils_description_en,geojson,centroid_lat,centroid_lng,is_premium,status,published_at,created_at,updated_at,deleted_at";

export async function getAppellations(options?: {
  limit?: number;
  offset?: number;
  query?: string;
  status?: string;
  regionId?: string;
  subregionId?: string;
}): Promise<{ appellations: AppellationListItem[]; hasPrev: boolean; hasNext: boolean; totalCount: number }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const query = (options?.query ?? "").trim();
  const status = (options?.status ?? "all").trim();
  const regionId = (options?.regionId ?? "").trim();
  const subregionId = (options?.subregionId ?? "").trim();
  const fetchLimit = limit + 1;
  const from = offset;
  const to = offset + fetchLimit - 1;

  let allowedAppellationIds: string[] | null = null;
  if (subregionId && subregionId !== "all") {
    const { data: subregionLinks, error: subregionLinksError } = await supabase
      .from("appellation_subregion_links")
      .select("appellation_id")
      .eq("subregion_id", subregionId);
    if (subregionLinksError) throw new Error(subregionLinksError.message);
    allowedAppellationIds = Array.from(
      new Set((subregionLinks ?? []).map((row) => (row as { appellation_id: string }).appellation_id))
    );
  } else if (regionId && regionId !== "all") {
    const { data: regionSubregions, error: regionSubregionsError } = await supabase
      .from("wine_subregions")
      .select("id")
      .is("deleted_at", null)
      .eq("region_id", regionId);
    if (regionSubregionsError) throw new Error(regionSubregionsError.message);

    const regionSubregionIds = (regionSubregions ?? []).map((row) => (row as { id: string }).id);
    if (regionSubregionIds.length === 0) {
      return {
        appellations: [],
        hasPrev: offset > 0,
        hasNext: false,
        totalCount: 0,
      };
    }

    const { data: regionLinks, error: regionLinksError } = await supabase
      .from("appellation_subregion_links")
      .select("appellation_id")
      .in("subregion_id", regionSubregionIds);
    if (regionLinksError) throw new Error(regionLinksError.message);

    allowedAppellationIds = Array.from(
      new Set((regionLinks ?? []).map((row) => (row as { appellation_id: string }).appellation_id))
    );
  }

  if (Array.isArray(allowedAppellationIds) && allowedAppellationIds.length === 0) {
    return {
      appellations: [],
      hasPrev: offset > 0,
      hasNext: false,
      totalCount: 0,
    };
  }

  let countQuery = supabase
    .from("appellations")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (query) {
    const escaped = query.replaceAll(",", " ");
    countQuery = countQuery.or(
      `name_fr.ilike.%${escaped}%,name_en.ilike.%${escaped}%,slug.ilike.%${escaped}%`
    );
  }
  if (status && status !== "all") {
    countQuery = countQuery.eq("status", status);
  }
  if (Array.isArray(allowedAppellationIds)) {
    countQuery = countQuery.in("id", allowedAppellationIds);
  }
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);
  const totalCount = count ?? 0;

  let queryBuilder = supabase
    .from("appellations")
    .select(APPELLATION_LIST_COLUMNS)
    .is("deleted_at", null);

  if (query) {
    const escaped = query.replaceAll(",", " ");
    queryBuilder = queryBuilder.or(
      `name_fr.ilike.%${escaped}%,name_en.ilike.%${escaped}%,slug.ilike.%${escaped}%`
    );
  }

  if (status && status !== "all") {
    queryBuilder = queryBuilder.eq("status", status);
  }

  if (Array.isArray(allowedAppellationIds)) {
    queryBuilder = queryBuilder.in("id", allowedAppellationIds);
  }

  const { data, error } = await queryBuilder
    .order("name_fr", { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Array<Pick<Appellation, "id" | "slug" | "name_fr" | "name_en" | "status" | "updated_at">>).slice(0, limit);
  const hasNext = (data ?? []).length > limit;
  const hasPrev = offset > 0;
  const appellationIds = rows.map((row) => row.id);

  if (appellationIds.length === 0) {
    return {
      appellations: [],
      hasPrev,
      hasNext,
      totalCount,
    };
  }

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
    return {
      appellations: rows.map((row) => ({
        ...row,
        subregion_id: null,
        subregion_name_fr: null,
        region_name_fr: null,
        region_id: null,
      })) as AppellationListItem[],
      hasPrev,
      hasNext,
      totalCount,
    };
  }

  const firstSubregionByAppellation = new Map<
    string,
    { id: string; name_fr: string | null; region_id: string | null; region_name_fr: string | null }
  >();

  for (const link of (linkData ?? []) as AppellationSubregionFetchRow[]) {
    if (firstSubregionByAppellation.has(link.appellation_id)) continue;
    const subregion = getFirstRelation(link.wine_subregions);
    const region = getFirstRelation(subregion?.wine_regions);
    firstSubregionByAppellation.set(link.appellation_id, {
      id: subregion?.id ?? link.subregion_id,
      name_fr: subregion?.name_fr ?? null,
      region_id: subregion?.region_id ?? null,
      region_name_fr: region?.name_fr ?? null,
    });
  }

  return {
    appellations: rows.map((row) => {
      const sr = firstSubregionByAppellation.get(row.id);
      return {
        ...row,
        subregion_id: sr?.id ?? null,
        subregion_name_fr: sr?.name_fr ?? null,
        region_name_fr: sr?.region_name_fr ?? null,
        region_id: sr?.region_id ?? null,
      };
    }) as AppellationListItem[],
    hasPrev,
    hasNext,
    totalCount,
  };
}

export async function getAppellation(id: string): Promise<Appellation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appellations")
    .select(APPELLATION_DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Appellation;
}

type AppellationForm = Omit<
  Appellation,
  | "geojson"
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "subregion_name_fr"
  | "region_name_fr"
  | "region_id"
> & {
  id?: string;
  geojson?: unknown;
};

function formToRow(form: AppellationForm): Record<string, unknown> {
  const row: Record<string, unknown> = {
    slug: form.slug || null,
    name_fr: form.name_fr || "",
    name_en: form.name_en || null,
    area_hectares: form.area_hectares ?? null,
    producer_count: form.producer_count ?? null,
    production_volume_hl: form.production_volume_hl ?? null,
    price_range_min_eur: form.price_range_min_eur ?? null,
    price_range_max_eur: form.price_range_max_eur ?? null,
    history_fr: form.history_fr || null,
    history_en: form.history_en || null,
    colors_grapes_fr: form.colors_grapes_fr || null,
    colors_grapes_en: form.colors_grapes_en || null,
    soils_description_fr: form.soils_description_fr || null,
    soils_description_en: form.soils_description_en || null,
    centroid_lat: form.centroid_lat ?? null,
    centroid_lng: form.centroid_lng ?? null,
    is_premium: !!form.is_premium,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };

  if (Object.prototype.hasOwnProperty.call(form, "geojson")) {
    let geojson: unknown = form.geojson ?? null;
    if (typeof geojson === "string" && geojson.trim()) {
      try {
        geojson = JSON.parse(geojson);
      } catch {
        geojson = null;
      }
    }
    row.geojson = geojson;
  }

  return row;
}

async function syncAppellationSubregionLink(
  appellationId: string,
  subregionId?: string | null
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("appellation_subregion_links")
    .delete()
    .eq("appellation_id", appellationId);
  if (deleteError) return { error: deleteError.message };

  if (!subregionId) return {};

  const { error: insertError } = await supabase
    .from("appellation_subregion_links")
    .insert([{ appellation_id: appellationId, subregion_id: subregionId }]);
  if (insertError) return { error: insertError.message };

  return {};
}

export async function createAppellation(
  form: AppellationForm
): Promise<{ error?: string; id?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { data, error } = await supabase.from("appellations").insert(row).select("id").single();
  if (error) return { error: error.message };
  const createdId = (data as { id: string } | null)?.id;
  if (!createdId) return { error: "Unable to read created appellation id." };
  const linkRes = await syncAppellationSubregionLink(createdId, form.subregion_id ?? null);
  if (linkRes.error) return { error: linkRes.error };
  revalidatePath("/admin/appellations");
  return { id: createdId };
}

export async function updateAppellation(
  id: string,
  form: AppellationForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("appellations").update(row).eq("id", id);
  if (error) return { error: error.message };
  const linkRes = await syncAppellationSubregionLink(id, form.subregion_id ?? null);
  if (linkRes.error) return { error: linkRes.error };
  revalidatePath("/admin/appellations");
  return {};
}

export async function deleteAppellation(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("appellations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function getAppellationSoilLinks(appellationId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appellation_soil_links")
    .select("soil_type_id")
    .eq("appellation_id", appellationId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => (r as { soil_type_id: string }).soil_type_id);
}

export async function getAppellationSoilLinkItems(
  appellationId: string
): Promise<AppellationLinkedSoilType[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appellation_soil_links")
    .select(
      `
      soil_type_id,
      soil_types!soil_type_id(
        id,
        name_fr,
        slug
      )
    `
    )
    .eq("appellation_id", appellationId);
  if (error) throw new Error(error.message);

  const results = (data ?? [])
    .map((row) => {
      const soilType = getFirstRelation(
        (row as { soil_types: LinkedSoilRow | LinkedSoilRow[] | null }).soil_types
      );
      if (!soilType?.id || !soilType.name_fr || !soilType.slug) return null;
      return {
        id: soilType.id,
        name_fr: soilType.name_fr,
        slug: soilType.slug,
      };
    })
    .filter((row): row is AppellationLinkedSoilType => row !== null);

  return results.sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr", { sensitivity: "base" }));
}

export async function searchSoilTypesForAppellationLinks(
  query: string
): Promise<AppellationLinkedSoilType[]> {
  const supabase = getSupabaseAdmin();
  const trimmed = query.trim();

  let request = supabase
    .from("soil_types")
    .select("id,name_fr,slug")
    .is("deleted_at", null)
    .order("name_fr", { ascending: true })
    .limit(10);

  if (trimmed) {
    const escaped = trimmed.replaceAll(",", " ");
    request = request.or(`name_fr.ilike.%${escaped}%,name_en.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as LinkedSoilRow[]).map((row) => ({
    id: row.id,
    name_fr: row.name_fr,
    slug: row.slug,
  }));
}

export async function addAppellationSoilLink(
  appellationId: string,
  soilTypeId: string
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("appellation_soil_links")
    .upsert(
      {
        appellation_id: appellationId,
        soil_type_id: soilTypeId,
      },
      { onConflict: "appellation_id,soil_type_id", ignoreDuplicates: true }
    );
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function removeAppellationSoilLink(
  appellationId: string,
  soilTypeId: string
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("appellation_soil_links")
    .delete()
    .eq("appellation_id", appellationId)
    .eq("soil_type_id", soilTypeId);
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function setAppellationSoilLinks(
  appellationId: string,
  soilTypeIds: string[]
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error: delError } = await supabase
    .from("appellation_soil_links")
    .delete()
    .eq("appellation_id", appellationId);
  if (delError) return { error: delError.message };

  if (soilTypeIds.length > 0) {
    const rows = soilTypeIds.map((soil_type_id) => ({ appellation_id: appellationId, soil_type_id }));
    const { error: insError } = await supabase.from("appellation_soil_links").insert(rows);
    if (insError) return { error: insError.message };
  }

  revalidatePath("/admin/appellations");
  return {};
}
