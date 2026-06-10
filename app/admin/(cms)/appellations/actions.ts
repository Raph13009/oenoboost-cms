"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import {
  buildAppellationSubregionLinkSyncPlan,
  normalizeSubregionIds,
  validatePublishedAppellationLinkState,
} from "./link-sync";
import { validateRecognitionYear } from "@/lib/aop-recognition-year";
import { validateWineColorBreakdown } from "@/lib/aop-wine-color-breakdown";

/**
 * Type representing a row of the new `aop` table (int4 ids).
 *
 * IDs are exposed as strings on the boundary (URLs, props, state) and
 * converted to numbers only when calling Supabase. This keeps the rest of the
 * CMS code (router params, drawer ids, etc.) unchanged after the migration
 * from the previous `appellations` (uuid) table.
 */
export type Appellation = {
  id: string;
  /** From join with `aop_subregion_link` (int4). */
  subregion_id?: string | null;
  slug: string;
  /** Single name field replacing the previous bilingual `name_fr` / `name_en`. */
  name: string;
  area_hectares: number | null;
  /** Année de reconnaissance AOP (`recognition_year`, smallint nullable). */
  recognition_year: number | null;
  area_m2: number | null;
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
  climate_fr: string | null;
  climate_en: string | null;
  is_premium: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  wine_pct_red: number | null;
  wine_pct_white: number | null;
  wine_pct_sparkling: number | null;
  wine_pct_liqueur: number | null;
  /** From join: subregions.name_fr (new int4 table). */
  subregion_name_fr?: string | null;
  /** From join through subregion: wine_regions.name_fr (uuid). */
  region_name_fr?: string | null;
  /** From join through subregion: subregions.region_id (uuid → wine_regions). */
  region_id?: string | null;
};

export type AppellationListItem = Pick<
  Appellation,
  "id" | "slug" | "name" | "status" | "updated_at" | "subregion_id" | "subregion_name_fr" | "region_name_fr" | "region_id"
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

type AopRegionRelation = { name_fr: string | null } | { name_fr: string | null }[] | null;
type AopSubregionFetchRow = {
  aop_id: number;
  subregion_id: number;
  subregions:
    | {
        id: number;
        name_fr: string | null;
        region_id: string | null;
        wine_regions: AopRegionRelation;
      }
    | {
        id: number;
        name_fr: string | null;
        region_id: string | null;
        wine_regions: AopRegionRelation;
      }[]
    | null;
};

function getFirstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumberId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === "") return null;
  const n = typeof id === "number" ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

const AOP_LIST_COLUMNS = "id,slug,name,status,updated_at";
const AOP_DETAIL_COLUMNS =
  "id,slug,name,area_m2,area_hectares,recognition_year,producer_count,production_volume_hl,price_range_min_eur,price_range_max_eur,history_fr,history_en,colors_grapes_fr,colors_grapes_en,soils_description_fr,soils_description_en,climate_fr,climate_en,wine_pct_red,wine_pct_white,wine_pct_sparkling,wine_pct_liqueur,is_premium,status,published_at,created_at,updated_at,deleted_at";

function trimNullableText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export type SubregionLite = { id: string; region_id: string; name_fr: string };

/**
 * Loads the lightweight list of (new) `subregions` (int4) needed to drive the
 * AOP cascade (region → subregion). Region id remains uuid (`wine_regions`).
 */
export async function getSubregionsLite(): Promise<SubregionLite[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subregions")
    .select("id,region_id,name_fr")
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: number | string; region_id: string; name_fr: string | null }>)
    .filter((row) => row.name_fr != null)
    .map((row) => ({
      id: String(row.id),
      region_id: row.region_id,
      name_fr: row.name_fr ?? "",
    }));
}

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

  let allowedAopIds: number[] | null = null;
  if (subregionId && subregionId !== "all") {
    const subregionIdNum = toNumberId(subregionId);
    if (subregionIdNum === null) {
      return { appellations: [], hasPrev: offset > 0, hasNext: false, totalCount: 0 };
    }
    const { data: subregionLinks, error: subregionLinksError } = await supabase
      .from("aop_subregion_link")
      .select("aop_id")
      .eq("subregion_id", subregionIdNum);
    if (subregionLinksError) throw new Error(subregionLinksError.message);
    allowedAopIds = Array.from(
      new Set((subregionLinks ?? []).map((row) => (row as { aop_id: number }).aop_id))
    );
  } else if (regionId && regionId !== "all") {
    const { data: regionSubregions, error: regionSubregionsError } = await supabase
      .from("subregions")
      .select("id")
      .is("deleted_at", null)
      .eq("region_id", regionId);
    if (regionSubregionsError) throw new Error(regionSubregionsError.message);

    const regionSubregionIds = (regionSubregions ?? []).map((row) => (row as { id: number }).id);
    if (regionSubregionIds.length === 0) {
      return {
        appellations: [],
        hasPrev: offset > 0,
        hasNext: false,
        totalCount: 0,
      };
    }

    const { data: regionLinks, error: regionLinksError } = await supabase
      .from("aop_subregion_link")
      .select("aop_id")
      .in("subregion_id", regionSubregionIds);
    if (regionLinksError) throw new Error(regionLinksError.message);

    allowedAopIds = Array.from(
      new Set((regionLinks ?? []).map((row) => (row as { aop_id: number }).aop_id))
    );
  }

  if (Array.isArray(allowedAopIds) && allowedAopIds.length === 0) {
    return {
      appellations: [],
      hasPrev: offset > 0,
      hasNext: false,
      totalCount: 0,
    };
  }

  let countQuery = supabase
    .from("aop")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (query) {
    const escaped = query.replaceAll(",", " ");
    countQuery = countQuery.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }
  if (status && status !== "all") {
    countQuery = countQuery.eq("status", status);
  }
  if (Array.isArray(allowedAopIds)) {
    countQuery = countQuery.in("id", allowedAopIds);
  }
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);
  const totalCount = count ?? 0;

  let queryBuilder = supabase
    .from("aop")
    .select(AOP_LIST_COLUMNS)
    .is("deleted_at", null);

  if (query) {
    const escaped = query.replaceAll(",", " ");
    queryBuilder = queryBuilder.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  if (status && status !== "all") {
    queryBuilder = queryBuilder.eq("status", status);
  }

  if (Array.isArray(allowedAopIds)) {
    queryBuilder = queryBuilder.in("id", allowedAopIds);
  }

  const { data, error } = await queryBuilder
    .order("name", { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);

  type AopRow = { id: number; slug: string; name: string; status: string; updated_at: string };
  const rawRows = ((data ?? []) as AopRow[]).slice(0, limit);
  const hasNext = (data ?? []).length > limit;
  const hasPrev = offset > 0;
  const aopIds = rawRows.map((row) => row.id);

  if (aopIds.length === 0) {
    return {
      appellations: [],
      hasPrev,
      hasNext,
      totalCount,
    };
  }

  const { data: linkData, error: linkError } = await supabase
    .from("aop_subregion_link")
    .select(
      `
      aop_id,
      subregion_id,
      subregions!subregion_id(
        id,
        name_fr,
        region_id,
        wine_regions!region_id(name_fr)
      )
    `
    )
    .in("aop_id", aopIds);

  const firstSubregionByAop = new Map<
    number,
    { id: string; name_fr: string | null; region_id: string | null; region_name_fr: string | null }
  >();

  if (!linkError) {
    for (const link of (linkData ?? []) as AopSubregionFetchRow[]) {
      if (firstSubregionByAop.has(link.aop_id)) continue;
      const subregion = getFirstRelation(link.subregions);
      const region = getFirstRelation(subregion?.wine_regions);
      firstSubregionByAop.set(link.aop_id, {
        id: subregion?.id != null ? String(subregion.id) : String(link.subregion_id),
        name_fr: subregion?.name_fr ?? null,
        region_id: subregion?.region_id ?? null,
        region_name_fr: region?.name_fr ?? null,
      });
    }
  }

  return {
    appellations: rawRows.map((row) => {
      const sr = firstSubregionByAop.get(row.id);
      return {
        id: String(row.id),
        slug: row.slug,
        name: row.name,
        status: row.status,
        updated_at: row.updated_at,
        subregion_id: sr?.id ?? null,
        subregion_name_fr: sr?.name_fr ?? null,
        region_name_fr: sr?.region_name_fr ?? null,
        region_id: sr?.region_id ?? null,
      };
    }),
    hasPrev,
    hasNext,
    totalCount,
  };
}

export async function getAppellation(id: string): Promise<Appellation | null> {
  const aopId = toNumberId(id);
  if (aopId === null) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("aop")
    .select(AOP_DETAIL_COLUMNS)
    .eq("id", aopId)
    .single();
  if (error || !data) return null;

  const { data: linkData, error: linkError } = await supabase
    .from("aop_subregion_link")
    .select(
      `
      subregion_id,
      subregions!subregion_id(
        id,
        name_fr,
        region_id,
        wine_regions!region_id(name_fr)
      )
    `
    )
    .eq("aop_id", aopId)
    .limit(1);

  if (linkError) {
    console.warn("[appellations.getAppellation] unable to load subregion link", {
      aopId,
      error: linkError.message,
    });
  }

  const firstLink = getFirstRelation(
    (linkData ?? []) as Array<{
      subregion_id: number;
      subregions:
        | {
            id: number;
            name_fr: string | null;
            region_id: string | null;
            wine_regions: AopRegionRelation;
          }
        | {
            id: number;
            name_fr: string | null;
            region_id: string | null;
            wine_regions: AopRegionRelation;
          }[]
        | null;
    }>
  );
  const subregion = getFirstRelation(firstLink?.subregions);
  const region = getFirstRelation(subregion?.wine_regions);

  const row = data as Record<string, unknown> & { id: number };
  return {
    id: String(row.id),
    slug: (row.slug as string) ?? "",
    name: (row.name as string) ?? "",
    area_m2: (row.area_m2 as number | null) ?? null,
    area_hectares: (row.area_hectares as number | null) ?? null,
    recognition_year: (row.recognition_year as number | null) ?? null,
    producer_count: (row.producer_count as number | null) ?? null,
    production_volume_hl: (row.production_volume_hl as number | null) ?? null,
    price_range_min_eur: (row.price_range_min_eur as number | null) ?? null,
    price_range_max_eur: (row.price_range_max_eur as number | null) ?? null,
    history_fr: (row.history_fr as string | null) ?? null,
    history_en: (row.history_en as string | null) ?? null,
    colors_grapes_fr: (row.colors_grapes_fr as string | null) ?? null,
    colors_grapes_en: (row.colors_grapes_en as string | null) ?? null,
    soils_description_fr: (row.soils_description_fr as string | null) ?? null,
    soils_description_en: (row.soils_description_en as string | null) ?? null,
    climate_fr: (row.climate_fr as string | null) ?? null,
    climate_en: (row.climate_en as string | null) ?? null,
    wine_pct_red: (row.wine_pct_red as number | null) ?? null,
    wine_pct_white: (row.wine_pct_white as number | null) ?? null,
    wine_pct_sparkling: (row.wine_pct_sparkling as number | null) ?? null,
    wine_pct_liqueur: (row.wine_pct_liqueur as number | null) ?? null,
    is_premium: !!row.is_premium,
    status: (row.status as string) ?? "draft",
    published_at: (row.published_at as string | null) ?? null,
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string) ?? "",
    deleted_at: (row.deleted_at as string | null) ?? null,
    subregion_id: firstLink?.subregion_id != null ? String(firstLink.subregion_id) : null,
    subregion_name_fr: subregion?.name_fr ?? null,
    region_id: subregion?.region_id ?? null,
    region_name_fr: region?.name_fr ?? null,
  };
}

type AppellationForm = Omit<
  Appellation,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "subregion_name_fr"
  | "region_name_fr"
  | "region_id"
> & {
  id?: string;
};

function formToRow(form: AppellationForm): Record<string, unknown> {
  return {
    slug: form.slug || null,
    name: form.name || "",
    area_hectares: form.area_hectares ?? null,
    recognition_year: form.recognition_year ?? null,
    area_m2: form.area_m2 ?? null,
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
    climate_fr: trimNullableText(form.climate_fr),
    climate_en: trimNullableText(form.climate_en),
    wine_pct_red: form.wine_pct_red ?? null,
    wine_pct_white: form.wine_pct_white ?? null,
    wine_pct_sparkling: form.wine_pct_sparkling ?? null,
    wine_pct_liqueur: form.wine_pct_liqueur ?? null,
    is_premium: !!form.is_premium,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };
}

async function syncAopSubregionLink(
  aopId: number,
  subregionId?: string | null
): Promise<{ error?: string; finalSubregionIds?: string[] }> {
  const supabase = getSupabaseAdmin();
  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("aop_subregion_link")
    .select("subregion_id")
    .eq("aop_id", aopId);

  if (existingLinksError) {
    console.error("[appellations.syncSubregionLink] failed to read current links", {
      aopId,
      error: existingLinksError.message,
    });
    return { error: existingLinksError.message };
  }

  const existingSubregionIds = (existingLinks ?? [])
    .map((row) => (row as { subregion_id: number | null }).subregion_id)
    .filter((value): value is number => value != null)
    .map((value) => String(value));
  const requestedSubregionIds = normalizeSubregionIds(subregionId);
  const plan = buildAppellationSubregionLinkSyncPlan(existingSubregionIds, requestedSubregionIds);

  console.info("[appellations.syncSubregionLink] syncing links", {
    aopId,
    existingSubregionIds,
    requestedSubregionIds,
    preserveExisting: plan.preserveExisting,
    toInsert: plan.toInsert,
    toDelete: plan.toDelete,
  });

  if (plan.toInsert.length > 0) {
    const insertRows = plan.toInsert
      .map((subregion_id) => ({ aop_id: aopId, subregion_id: toNumberId(subregion_id) }))
      .filter((row): row is { aop_id: number; subregion_id: number } => row.subregion_id !== null);

    if (insertRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("aop_subregion_link")
        .upsert(insertRows, { onConflict: "aop_id,subregion_id", ignoreDuplicates: true });

      if (upsertError) {
        console.error("[appellations.syncSubregionLink] failed to upsert links", {
          aopId,
          toInsert: plan.toInsert,
          error: upsertError.message,
        });
        return { error: upsertError.message };
      }
    }
  }

  if (plan.toDelete.length > 0) {
    const deleteIds = plan.toDelete
      .map((value) => toNumberId(value))
      .filter((value): value is number => value !== null);
    if (deleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("aop_subregion_link")
        .delete()
        .eq("aop_id", aopId)
        .in("subregion_id", deleteIds);

      if (deleteError) {
        console.error("[appellations.syncSubregionLink] failed to delete stale links", {
          aopId,
          toDelete: plan.toDelete,
          error: deleteError.message,
        });
        return { error: deleteError.message };
      }
    }
  }

  return { finalSubregionIds: plan.finalSubregionIds };
}

export async function createAppellation(
  form: AppellationForm
): Promise<{ error?: string; id?: string }> {
  const supabase = getSupabaseAdmin();
  const requestedSubregionIds = normalizeSubregionIds(form.subregion_id);
  const linkValidationError = validatePublishedAppellationLinkState(
    form.status || "draft",
    requestedSubregionIds ?? []
  );
  if (linkValidationError) return { error: linkValidationError };

  const winePctError = validateWineColorBreakdown(form);
  if (winePctError) return { error: winePctError };

  const recognitionYearError = validateRecognitionYear(form.recognition_year);
  if (recognitionYearError) return { error: recognitionYearError };

  const row = formToRow(form);
  const { data, error } = await supabase.from("aop").insert(row).select("id").single();
  if (error) return { error: error.message };
  const createdId = (data as { id: number } | null)?.id;
  if (createdId == null) return { error: "Unable to read created AOP id." };
  const linkRes = await syncAopSubregionLink(createdId, form.subregion_id ?? null);
  if (linkRes.error) return { error: linkRes.error };
  revalidatePath("/admin/appellations");
  return { id: String(createdId) };
}

export async function updateAppellation(
  id: string,
  form: AppellationForm
): Promise<{ error?: string }> {
  const aopId = toNumberId(id);
  if (aopId === null) return { error: "Identifiant AOP invalide." };

  const supabase = getSupabaseAdmin();
  const { data: currentAop, error: readError } = await supabase
    .from("aop")
    .select("status")
    .eq("id", aopId)
    .single();
  if (readError || !currentAop) {
    return { error: readError?.message ?? "Impossible de lire l'AOP actuelle." };
  }

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("aop_subregion_link")
    .select("subregion_id")
    .eq("aop_id", aopId);
  if (existingLinksError) {
    return { error: existingLinksError.message };
  }

  const existingSubregionIds = (existingLinks ?? [])
    .map((row) => (row as { subregion_id: number | null }).subregion_id)
    .filter((value): value is number => value != null)
    .map((value) => String(value));
  const requestedSubregionIds = normalizeSubregionIds(form.subregion_id);
  const plan = buildAppellationSubregionLinkSyncPlan(existingSubregionIds, requestedSubregionIds);
  const targetStatus = form.status || (currentAop as { status: string }).status || "draft";
  const linkValidationError = validatePublishedAppellationLinkState(targetStatus, plan.finalSubregionIds);
  if (linkValidationError) {
    console.warn("[appellations.updateAppellation] blocked save without subregion link", {
      aopId,
      status: targetStatus,
      existingSubregionIds,
      requestedSubregionIds,
    });
    return { error: linkValidationError };
  }

  const winePctError = validateWineColorBreakdown(form);
  if (winePctError) return { error: winePctError };

  const recognitionYearError = validateRecognitionYear(form.recognition_year);
  if (recognitionYearError) return { error: recognitionYearError };

  const row = formToRow(form);
  const { error } = await supabase.from("aop").update(row).eq("id", aopId);
  if (error) return { error: error.message };
  const linkRes = await syncAopSubregionLink(aopId, form.subregion_id);
  if (linkRes.error) return { error: linkRes.error };
  revalidatePath("/admin/appellations");
  return {};
}

export async function deleteAppellation(id: string): Promise<{ error?: string }> {
  const aopId = toNumberId(id);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("aop")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", aopId);
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function getAppellationSoilLinks(appellationId: string): Promise<string[]> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("aop_soil_link")
    .select("soil_type_id")
    .eq("aop_id", aopId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => (r as { soil_type_id: string }).soil_type_id);
}

export async function getAppellationSoilLinkItems(
  appellationId: string
): Promise<AppellationLinkedSoilType[]> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("aop_soil_link")
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
    .eq("aop_id", aopId);
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
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("aop_soil_link")
    .upsert(
      {
        aop_id: aopId,
        soil_type_id: soilTypeId,
      },
      { onConflict: "aop_id,soil_type_id", ignoreDuplicates: true }
    );
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function removeAppellationSoilLink(
  appellationId: string,
  soilTypeId: string
): Promise<{ error?: string }> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("aop_soil_link")
    .delete()
    .eq("aop_id", aopId)
    .eq("soil_type_id", soilTypeId);
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function setAppellationSoilLinks(
  appellationId: string,
  soilTypeIds: string[]
): Promise<{ error?: string }> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  const supabase = getSupabaseAdmin();
  const { error: delError } = await supabase
    .from("aop_soil_link")
    .delete()
    .eq("aop_id", aopId);
  if (delError) return { error: delError.message };

  if (soilTypeIds.length > 0) {
    const rows = soilTypeIds.map((soil_type_id) => ({ aop_id: aopId, soil_type_id }));
    const { error: insError } = await supabase.from("aop_soil_link").insert(rows);
    if (insError) return { error: insError.message };
  }

  revalidatePath("/admin/appellations");
  return {};
}

/**
 * Communes attached to an AOP via `communes_full_aop_link`.
 * `code_insee` is the PK of `communes_full`.
 */
export type AppellationCommune = {
  code_insee: string;
  name: string;
};

type CommuneRelation = { code_insee: string; name: string | null } | { code_insee: string; name: string | null }[] | null;

export async function getAppellationCommunes(
  appellationId: string
): Promise<AppellationCommune[]> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("communes_full_aop_link")
    .select(
      `
      commune_code_insee,
      communes_full!commune_code_insee(code_insee, name)
    `
    )
    .eq("aop_id", aopId);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ commune_code_insee: string; communes_full: CommuneRelation }>)
    .map((row) => {
      const commune = getFirstRelation(row.communes_full);
      const code = commune?.code_insee ?? row.commune_code_insee;
      const name = commune?.name ?? null;
      if (!code) return null;
      return { code_insee: code, name: name ?? code };
    })
    .filter((row): row is AppellationCommune => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

/**
 * Substring search over `communes_full` scoped to a wine region. Both query
 * and name are normalized (lowercase, accents stripped, non-alphanumerics
 * removed) before a `like '%q%'` match, so "tetien" matches "Saint-Étienne".
 * Backed by the `search_communes_full` Postgres RPC (see
 * `docs/sql/create_search_communes_full_rpc.sql`).
 */
export async function searchCommunesFull(
  query: string,
  regionId: string | null,
  limit = 50
): Promise<AppellationCommune[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("search_communes_full", {
    p_query: query ?? "",
    p_region_id: regionId && regionId.trim() !== "" ? regionId : null,
    p_limit: Math.min(Math.max(limit, 1), 200),
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ code_insee: string; name: string | null }>)
    .filter((row) => !!row.code_insee)
    .map((row) => ({ code_insee: row.code_insee, name: row.name ?? row.code_insee }));
}

export async function addAppellationCommuneLink(
  appellationId: string,
  codeInsee: string
): Promise<{ error?: string }> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  if (!codeInsee) return { error: "Code INSEE manquant." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("communes_full_aop_link")
    .upsert(
      { aop_id: aopId, commune_code_insee: codeInsee },
      { onConflict: "aop_id,commune_code_insee", ignoreDuplicates: true }
    );
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

export async function removeAppellationCommuneLink(
  appellationId: string,
  codeInsee: string
): Promise<{ error?: string }> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  if (!codeInsee) return { error: "Code INSEE manquant." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("communes_full_aop_link")
    .delete()
    .eq("aop_id", aopId)
    .eq("commune_code_insee", codeInsee);
  if (error) return { error: error.message };
  revalidatePath("/admin/appellations");
  return {};
}

/**
 * Replaces the entire set of commune links for an AOP. Used by the editor to
 * persist the commune list in one shot when the AOP is saved (including on
 * creation, when individual add/remove calls aren't possible yet).
 */
export async function setAppellationCommuneLinks(
  appellationId: string,
  codesInsee: string[]
): Promise<{ error?: string }> {
  const aopId = toNumberId(appellationId);
  if (aopId === null) return { error: "Identifiant AOP invalide." };
  const desired = Array.from(
    new Set((codesInsee ?? []).filter((code): code is string => typeof code === "string" && code.length > 0))
  );
  const supabase = getSupabaseAdmin();

  const { data: existingRows, error: existingError } = await supabase
    .from("communes_full_aop_link")
    .select("commune_code_insee")
    .eq("aop_id", aopId);
  if (existingError) return { error: existingError.message };

  const existing = new Set(
    (existingRows ?? []).map((row) => (row as { commune_code_insee: string }).commune_code_insee)
  );
  const toInsert = desired.filter((code) => !existing.has(code));
  const toDelete = Array.from(existing).filter((code) => !desired.includes(code));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("communes_full_aop_link")
      .delete()
      .eq("aop_id", aopId)
      .in("commune_code_insee", toDelete);
    if (deleteError) return { error: deleteError.message };
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((commune_code_insee) => ({ aop_id: aopId, commune_code_insee }));
    const { error: insertError } = await supabase
      .from("communes_full_aop_link")
      .upsert(rows, { onConflict: "aop_id,commune_code_insee", ignoreDuplicates: true });
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/admin/appellations");
  return {};
}
