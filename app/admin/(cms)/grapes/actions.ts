"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Grape = {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  type: string | null;
  origin_country: string | null;
  origin_region_fr: string | null;
  origin_region_en: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  history_fr: string | null;
  history_en: string | null;
  crossings_fr: string | null;
  crossings_en: string | null;
  production_regions_fr: string | null;
  production_regions_en: string | null;
  viticultural_traits_fr: string | null;
  viticultural_traits_en: string | null;
  tasting_traits_fr: string | null;
  tasting_traits_en: string | null;
  emblematic_wines_fr: string | null;
  emblematic_wines_en: string | null;
  /** JSON array of English country names, e.g. ["France", "USA"] */
  production_countries: string[] | null;
  is_premium: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GrapeListItem = Pick<
  Grape,
  "id" | "slug" | "name_fr" | "name_en" | "type" | "origin_country" | "status" | "updated_at"
>;

const GRAPE_LIST_COLUMNS = "id,slug,name_fr,name_en,type,origin_country,status,updated_at";
const GRAPE_DETAIL_COLUMNS =
  "id,slug,name_fr,name_en,type,origin_country,origin_region_fr,origin_region_en,origin_latitude,origin_longitude,history_fr,history_en,crossings_fr,crossings_en,production_regions_fr,production_regions_en,viticultural_traits_fr,viticultural_traits_en,tasting_traits_fr,tasting_traits_en,emblematic_wines_fr,emblematic_wines_en,production_countries,is_premium,status,published_at,created_at,updated_at,deleted_at";

function parseProductionCountries(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const strings = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return normalizeProductionCountries(strings);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseProductionCountries(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

/** Dedupe (case-insensitive), trim; sort A–Z for stable JSON in DB. */
function normalizeProductionCountries(names: string[]): string[] | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  if (out.length === 0) return null;
  out.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  return out;
}

export async function getGrapesLite(): Promise<Array<Pick<Grape, "id" | "name_fr">>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("grapes")
    .select("id,name_fr")
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; name_fr: string }>).map((row) => ({
    id: row.id,
    name_fr: row.name_fr,
  }));
}

export async function getGrapes(): Promise<GrapeListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("grapes")
    .select(GRAPE_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as GrapeListItem[];
}

export async function getGrape(id: string): Promise<Grape | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("grapes")
    .select(GRAPE_DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as Grape),
    production_countries: parseProductionCountries(row.production_countries),
  };
}

type GrapeForm = Omit<Grape, "id" | "created_at" | "updated_at" | "deleted_at"> & { id?: string };

function formToRow(form: GrapeForm): Record<string, unknown> {
  return {
    slug: form.slug || null,
    name_fr: form.name_fr || "",
    name_en: form.name_en || null,
    type: form.type || null,
    origin_country: form.origin_country || null,
    origin_region_fr: form.origin_region_fr || null,
    origin_region_en: form.origin_region_en || null,
    origin_latitude: form.origin_latitude ?? null,
    origin_longitude: form.origin_longitude ?? null,
    history_fr: form.history_fr || null,
    history_en: form.history_en || null,
    crossings_fr: form.crossings_fr || null,
    crossings_en: form.crossings_en || null,
    production_regions_fr: form.production_regions_fr || null,
    production_regions_en: form.production_regions_en || null,
    viticultural_traits_fr: form.viticultural_traits_fr || null,
    viticultural_traits_en: form.viticultural_traits_en || null,
    tasting_traits_fr: form.tasting_traits_fr || null,
    tasting_traits_en: form.tasting_traits_en || null,
    emblematic_wines_fr: form.emblematic_wines_fr || null,
    emblematic_wines_en: form.emblematic_wines_en || null,
    production_countries: normalizeProductionCountries(form.production_countries ?? []),
    is_premium: !!form.is_premium,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };
}

export async function createGrape(form: GrapeForm): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("grapes").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/grapes");
  return {};
}

export async function updateGrape(id: string, form: GrapeForm): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("grapes").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/grapes");
  return {};
}

export async function deleteGrape(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("grapes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/grapes");
  return {};
}
