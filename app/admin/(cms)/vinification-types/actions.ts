"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type VinificationType = {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  illustration_url: string | null;
  carousel_order: number | null;
  is_premium: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type VinificationStep = {
  id: string;
  vinification_type_id: string;
  step_order: number;
  icon_url: string | null;
  title_fr: string;
  title_en: string | null;
  summary_fr: string | null;
  summary_en: string | null;
  detail_fr: string | null;
  detail_en: string | null;
  created_at: string;
  updated_at: string;
};

export type VinificationTypeListItem = Pick<
  VinificationType,
  "id" | "slug" | "name_fr" | "name_en" | "status" | "updated_at"
>;

const VINIFICATION_TYPE_LIST_COLUMNS = "id,slug,name_fr,name_en,status,updated_at";
const VINIFICATION_TYPE_DETAIL_COLUMNS =
  "id,slug,name_fr,name_en,illustration_url,carousel_order,is_premium,status,published_at,created_at,updated_at,deleted_at";
const VINIFICATION_STEP_COLUMNS =
  "id,vinification_type_id,step_order,icon_url,title_fr,title_en,summary_fr,summary_en,detail_fr,detail_en,created_at,updated_at";

export async function getVinificationTypes(): Promise<VinificationTypeListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vinification_types")
    .select(VINIFICATION_TYPE_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("name_fr", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VinificationTypeListItem[];
}

export async function getVinificationType(id: string): Promise<VinificationType | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vinification_types")
    .select(VINIFICATION_TYPE_DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as VinificationType;
}

type VinificationTypeForm = Omit<
  VinificationType,
  "id" | "created_at" | "updated_at" | "deleted_at"
> & { id?: string };

function formToRow(form: VinificationTypeForm): Record<string, unknown> {
  return {
    slug: form.slug || null,
    name_fr: form.name_fr || "",
    name_en: form.name_en || null,
    illustration_url: form.illustration_url || null,
    carousel_order: form.carousel_order ?? null,
    is_premium: !!form.is_premium,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };
}

export async function createVinificationType(
  form: VinificationTypeForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("vinification_types").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinification-types");
  return {};
}

export async function updateVinificationType(
  id: string,
  form: VinificationTypeForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("vinification_types").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinification-types");
  return {};
}

export async function deleteVinificationType(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("vinification_types")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinification-types");
  return {};
}

type VinificationStepForm = Omit<VinificationStep, "created_at" | "updated_at">;

function stepFormToRow(form: VinificationStepForm): Record<string, unknown> {
  return {
    vinification_type_id: form.vinification_type_id,
    step_order: form.step_order,
    icon_url: form.icon_url || null,
    title_fr: form.title_fr || "",
    title_en: form.title_en || null,
    summary_fr: form.summary_fr || null,
    summary_en: form.summary_en || null,
    detail_fr: form.detail_fr || null,
    detail_en: form.detail_en || null,
  };
}

export async function getVinificationSteps(
  vinificationTypeId: string
): Promise<VinificationStep[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vinification_steps")
    .select(VINIFICATION_STEP_COLUMNS)
    .eq("vinification_type_id", vinificationTypeId)
    .order("step_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VinificationStep[];
}

export async function createVinificationStep(
  vinificationTypeId: string
): Promise<{ step?: VinificationStep; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("vinification_steps")
    .select("step_order")
    .eq("vinification_type_id", vinificationTypeId)
    .order("step_order", { ascending: false })
    .limit(1);

  if (readError) return { error: readError.message };

  const nextStepOrder = ((existing?.[0] as { step_order?: number } | undefined)?.step_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("vinification_steps")
    .insert({
      vinification_type_id: vinificationTypeId,
      step_order: nextStepOrder,
      title_fr: `Étape ${nextStepOrder}`,
    })
    .select(VINIFICATION_STEP_COLUMNS)
    .single();

  if (error || !data) return { error: error?.message ?? "Impossible de créer l'étape." };
  revalidatePath("/admin/vinification-types");
  return { step: data as VinificationStep };
}

export async function updateVinificationStep(
  id: string,
  form: VinificationStepForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = stepFormToRow(form);
  const { error } = await supabase.from("vinification_steps").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinification-types");
  return {};
}

export async function deleteVinificationStep(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();

  const { data: step, error: readError } = await supabase
    .from("vinification_steps")
    .select("vinification_type_id")
    .eq("id", id)
    .single();
  if (readError || !step) return { error: readError?.message ?? "Étape introuvable." };

  const vinificationTypeId = (step as { vinification_type_id: string }).vinification_type_id;
  const { error } = await supabase.from("vinification_steps").delete().eq("id", id);
  if (error) return { error: error.message };

  const { data: remaining, error: remainingError } = await supabase
    .from("vinification_steps")
    .select("id")
    .eq("vinification_type_id", vinificationTypeId)
    .order("step_order", { ascending: true });
  if (remainingError) return { error: remainingError.message };

  for (const [index, row] of (remaining ?? []).entries()) {
    const { error: reorderError } = await supabase
      .from("vinification_steps")
      .update({ step_order: index + 1 })
      .eq("id", (row as { id: string }).id);
    if (reorderError) return { error: reorderError.message };
  }

  revalidatePath("/admin/vinification-types");
  return {};
}

export async function reorderVinificationSteps(
  vinificationTypeId: string,
  orderedStepIds: string[]
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();

  for (const [index, stepId] of orderedStepIds.entries()) {
    const { error } = await supabase
      .from("vinification_steps")
      .update({ step_order: index + 1 })
      .eq("id", stepId)
      .eq("vinification_type_id", vinificationTypeId);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/vinification-types");
  return {};
}
