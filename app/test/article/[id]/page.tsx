import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

/** No cache: always fetch fresh article so CMS changes appear immediately. */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

type ArticleRow = {
  id: string;
  title_fr: string;
  cover_url: string | null;
  content_fr: string | null;
};

const bodyClass =
  "text-[15px] leading-7 text-slate-800 [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_em]:italic [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1";

export default async function TestArticlePage({ params }: PageProps) {
  noStore();

  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title_fr, cover_url, content_fr")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[700px] px-5 py-14">
        <h1 className="text-2xl font-semibold text-slate-900">Article not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          No article with this id (or it may be deleted). {error?.message ?? ""}
        </p>
      </main>
    );
  }

  const article = data as ArticleRow;
  const contentHtml = article.content_fr ?? "";

  return (
    <main className="mx-auto max-w-[700px] px-5 py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {article.title_fr}
        </h1>
        {article.cover_url && (
          <img
            src={article.cover_url}
            alt=""
            className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 object-cover"
          />
        )}
      </header>

      <article>
        {contentHtml.trim() ? (
          <div
            className={bodyClass}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-slate-500 italic">Aucun contenu (content_fr vide en base).</p>
        )}
      </article>
    </main>
  );
}
