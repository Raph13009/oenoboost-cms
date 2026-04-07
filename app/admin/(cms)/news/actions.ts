"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const NEWS_ARTICLE_IMAGES_BUCKET = "news-article-images";

function sanitizeFileSegment(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type NewsArticle = {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string | null;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  content_fr: string | null;
  content_en: string | null;
  cover_url: string | null;
  module_tag: string | null;
  content_type: string | null;
  linked_id: string | null;
  is_premium_early: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NewsArticleListItem = Pick<
  NewsArticle,
  "id" | "slug" | "title_fr" | "title_en" | "content_type" | "is_premium_early" | "status" | "updated_at"
>;

const NEWS_LIST_COLUMNS =
  "id,slug,title_fr,title_en,content_type,is_premium_early,status,updated_at";
const NEWS_DETAIL_COLUMNS =
  "id,slug,title_fr,title_en,excerpt_fr,excerpt_en,content_fr,content_en,cover_url,module_tag,content_type,linked_id,is_premium_early,status,published_at,created_at,updated_at,deleted_at";

export async function getNewsArticles(): Promise<NewsArticleListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NewsArticleListItem[];
}

export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as NewsArticle;
}

type NewsArticleForm = Omit<
  NewsArticle,
  "id" | "created_at" | "updated_at" | "deleted_at"
> & { id?: string };

function formToRow(form: NewsArticleForm): Record<string, unknown> {
  return {
    slug: form.slug || null,
    title_fr: form.title_fr || "",
    title_en: form.title_en ?? "",
    excerpt_fr: form.excerpt_fr || null,
    excerpt_en: form.excerpt_en || null,
    content_fr: form.content_fr || null,
    content_en: form.content_en || null,
    cover_url: form.cover_url || null,
    module_tag: form.module_tag || null,
    content_type: form.content_type || null,
    linked_id: form.linked_id || null,
    is_premium_early: !!form.is_premium_early,
    status: form.status || "draft",
    published_at: form.published_at || null,
  };
}

export async function createNewsArticle(
  form: NewsArticleForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("news_articles").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/news");
  return {};
}

export async function updateNewsArticle(
  id: string,
  form: NewsArticleForm
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const row = formToRow(form);
  const { error } = await supabase.from("news_articles").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/news");
  revalidatePath(`/test/article/${id}`);
  return {};
}

export async function deleteNewsArticle(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("news_articles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/news");
  return {};
}

export async function uploadNewsArticleCover(
  formData: FormData
): Promise<{ url?: string; path?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Aucun fichier recadre fourni." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "Le fichier doit etre une image." };
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: "Image trop lourde. Maximum 10 Mo." };
  }

  const supabase = getSupabaseAdmin();
  const arrayBuffer = await file.arrayBuffer();
  const articleId = formData.get("articleId");
  const slugInput = formData.get("slug");
  const folder = typeof articleId === "string" && articleId ? articleId : "drafts";
  const slug = sanitizeFileSegment(typeof slugInput === "string" ? slugInput : null) || "article";
  const filePath = `${folder}/${slug}-${randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(NEWS_ARTICLE_IMAGES_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(NEWS_ARTICLE_IMAGES_BUCKET).getPublicUrl(filePath);

  revalidatePath("/admin/news");
  if (typeof articleId === "string" && articleId) {
    revalidatePath(`/test/article/${articleId}`);
  }
  return { url: data.publicUrl, path: filePath };
}
