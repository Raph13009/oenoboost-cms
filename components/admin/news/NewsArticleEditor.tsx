"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsArticle } from "@/app/admin/(cms)/news/actions";
import {
  createNewsArticle,
  deleteNewsArticle,
  updateNewsArticle,
} from "@/app/admin/(cms)/news/actions";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

const cardClass =
  "rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden";
const cardPadding = "p-3";
const sectionTitleClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const fieldSpacing = "space-y-3";
const textareaShortClass =
  "min-h-[4rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 leading-relaxed focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const richEditorShellClass =
  "w-full rounded border border-slate-200 bg-white focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 rounded px-2 text-sm text-slate-700 hover:bg-slate-100 ${
        active ? "bg-slate-100 text-slate-900" : ""
      }`}
    >
      {children}
    </button>
  );
}

function RichHtmlEditor({
  value,
  onChange,
  placeholder,
  minHeightClass,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  minHeightClass: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          `tiptap px-2 py-1.5 text-sm text-slate-900 leading-relaxed outline-none ` +
          minHeightClass +
          " " +
          "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold " +
          "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold " +
          "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold " +
          "[&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-6 " +
          "[&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 " +
          "[&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Keep external value in sync when switching selected article.
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div className={richEditorShellClass}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <span className="font-semibold">B</span>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
        <ToolbarButton
          title="Heading 1"
          active={editor?.isActive("heading", { level: 1 })}
          onClick={() => {
            if (!editor) return;
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");
            if (selectedText.trim()) {
              const tag = "h1";
              editor.chain().focus().deleteRange({ from, to }).insertContent(`<${tag}>${escapeHtml(selectedText)}</${tag}>`).run();
            } else {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }
          }}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => {
            if (!editor) return;
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");
            if (selectedText.trim()) {
              const tag = "h2";
              editor.chain().focus().deleteRange({ from, to }).insertContent(`<${tag}>${escapeHtml(selectedText)}</${tag}>`).run();
            } else {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }
          }}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => {
            if (!editor) return;
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");
            if (selectedText.trim()) {
              const tag = "h3";
              editor.chain().focus().deleteRange({ from, to }).insertContent(`<${tag}>${escapeHtml(selectedText)}</${tag}>`).run();
            } else {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
        >
          H3
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
        <ToolbarButton
          title="Paragraph"
          active={editor?.isActive("paragraph")}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          ¶
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

const CARD_STATE_KEY = "cms-news-article-card-state";

type CardState = {
  identity: boolean;
  content: boolean;
  media: boolean;
  context: boolean;
  flags: boolean;
  technical: boolean;
  metadata: boolean;
};

const defaultCardState: CardState = {
  identity: true,
  content: true,
  media: true,
  context: false,
  flags: true,
  technical: false,
  metadata: false,
};

function loadCardState(): CardState {
  if (typeof window === "undefined") return defaultCardState;
  try {
    const raw = localStorage.getItem(CARD_STATE_KEY);
    if (!raw) return defaultCardState;
    const parsed = JSON.parse(raw) as Partial<CardState>;
    return {
      identity: parsed.identity ?? defaultCardState.identity,
      content: parsed.content ?? defaultCardState.content,
      media: parsed.media ?? defaultCardState.media,
      context: parsed.context ?? defaultCardState.context,
      flags: parsed.flags ?? defaultCardState.flags,
      technical: false,
      metadata: false,
    };
  } catch {
    return defaultCardState;
  }
}

function saveCardState(state: CardState) {
  try {
    localStorage.setItem(CARD_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={cardClass}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-50"
      >
        <span className={sectionTitleClass}>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
          aria-hidden
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: open ? 5000 : 0 }}
      >
        <div className={cardPadding}>{children}</div>
      </div>
    </section>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  minRows = 4,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  minRows?: number;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minHeight = minRows * 22;
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, minHeight)}px`;
  }, [value, minHeight]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      className={className}
      style={{ overflow: "hidden" }}
      {...props}
    />
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "published"
      ? "bg-emerald-500"
      : status === "draft"
        ? "bg-amber-400"
        : "bg-slate-400";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      title={status}
      aria-hidden
    />
  );
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR");
}

type Props = {
  article: NewsArticle | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): NewsArticle => ({
  id: "",
  slug: "",
  title_fr: "",
  title_en: null,
  excerpt_fr: null,
  excerpt_en: null,
  content_fr: null,
  content_en: null,
  cover_url: null,
  module_tag: null,
  content_type: null,
  linked_id: null,
  is_premium_early: false,
  status: "draft",
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

export function NewsArticleEditor({
  article,
  onClose,
  onDeleted,
}: Props) {
  const router = useRouter();
  const isNew = !article?.id;
  const [form, setForm] = useState<NewsArticle>(() => article ?? emptyForm());

  useEffect(() => {
    setForm(article ?? emptyForm());
  }, [article?.id, article?.updated_at]);

  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardState, setCardState] = useState<CardState>(defaultCardState);

  useEffect(() => {
    setCardState(loadCardState());
  }, []);

  const toggleCard = useCallback((key: keyof CardState) => {
    setCardState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCardState(next);
      return next;
    });
  }, []);

  const update = useCallback((updates: Partial<NewsArticle>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        title_en: form.title_en || null,
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
      if (isNew) {
        const res = await createNewsArticle(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateNewsArticle(form.id, payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          setSavedFeedback(true);
          setTimeout(() => setSavedFeedback(false), 1500);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isNew) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await deleteNewsArticle(form.id);
      if (res.error) setError(res.error);
      else {
        router.refresh();
        onDeleted();
        setDeleteModalOpen(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const panelTitle =
    form.title_fr?.trim() ||
    form.title_en?.trim() ||
    form.slug?.trim() ||
    "Nouvel article";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
        <h2 className="min-w-0 truncate text-base font-semibold text-slate-900">
          {panelTitle}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
              savedFeedback
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            }`}
          >
            {saving ? "Enregistrement…" : savedFeedback ? "Enregistré ✓" : "Enregistrer"}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={deleting}
              className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-3">
        <CollapsibleCard
          title="Identité"
          open={cardState.identity}
          onToggle={() => toggleCard("identity")}
        >
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Titre (FR)</label>
              <input
                value={form.title_fr}
                onChange={(e) => update({ title_fr: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Titre (EN)</label>
              <input
                value={form.title_en ?? ""}
                onChange={(e) => update({ title_en: e.target.value || null })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Slug</label>
              <input
                value={form.slug}
                onChange={(e) => update({ slug: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Contenu"
          open={cardState.content}
          onToggle={() => toggleCard("content")}
        >
          <div className={fieldSpacing}>
            <div>
              <label className={labelClass}>excerpt_fr (preview)</label>
              <AutoResizeTextarea
                value={form.excerpt_fr ?? ""}
                onChange={(e) => update({ excerpt_fr: e.target.value || null })}
                minRows={3}
                className={textareaShortClass}
                placeholder="Court résumé en français…"
              />
            </div>
            <div>
              <label className={labelClass}>excerpt_en (preview)</label>
              <AutoResizeTextarea
                value={form.excerpt_en ?? ""}
                onChange={(e) => update({ excerpt_en: e.target.value || null })}
                minRows={3}
                className={textareaShortClass}
                placeholder="Short excerpt in English…"
              />
            </div>
            <div>
              <label className={labelClass}>content_fr (main content)</label>
              <RichHtmlEditor
                key={form.id || "new-fr"}
                value={form.content_fr ?? ""}
                onChange={(html) => update({ content_fr: html || null })}
                placeholder="Contenu principal en français…"
                minHeightClass="min-h-[14rem]"
              />
            </div>
            <div>
              <label className={labelClass}>content_en (main content)</label>
              <RichHtmlEditor
                key={form.id || "new-en"}
                value={form.content_en ?? ""}
                onChange={(html) => update({ content_en: html || null })}
                placeholder="Main content in English…"
                minHeightClass="min-h-[14rem]"
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Média"
          open={cardState.media}
          onToggle={() => toggleCard("media")}
        >
          <div>
            <label className={labelClass}>URL de couverture</label>
            <input
              value={form.cover_url ?? ""}
              onChange={(e) => update({ cover_url: e.target.value || null })}
              className={inputClass}
              placeholder="https://…"
            />
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Context / Linking"
          open={cardState.context}
          onToggle={() => toggleCard("context")}
        >
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className={`${labelClass} min-h-[1.25rem]`}>module_tag</label>
              <input
                value={form.module_tag ?? ""}
                onChange={(e) => update({ module_tag: e.target.value || null })}
                className={inputClass}
                placeholder="appellation, grape, region, general"
              />
            </div>
            <div className="flex flex-col">
              <label className={`${labelClass} min-h-[1.25rem]`}>content_type</label>
              <input
                value={form.content_type ?? ""}
                onChange={(e) =>
                  update({ content_type: e.target.value || null })
                }
                className={inputClass}
                placeholder="news, guide, analysis"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>linked_id (UUID)</label>
              <input
                value={form.linked_id ?? ""}
                onChange={(e) => update({ linked_id: e.target.value || null })}
                className={inputClass}
                placeholder="Optional entity UUID"
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Indicateurs"
          open={cardState.flags}
          onToggle={() => toggleCard("flags")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={!!form.is_premium_early}
                  onChange={(e) =>
                    update({ is_premium_early: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>is_premium_early</span>
              </label>
              <div>
                <label className={labelClass}>Statut</label>
                <div className="relative flex h-8 w-full items-center rounded border border-slate-200 bg-white focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
                  <span className="pointer-events-none absolute left-2.5">
                    <StatusDot status={form.status} />
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => update({ status: e.target.value })}
                    className="h-full w-full flex-1 appearance-none rounded border-0 bg-transparent pl-7 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-0"
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Publié le</label>
              <input
                type="datetime-local"
                value={
                  form.published_at
                    ? new Date(form.published_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  update({
                    published_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Données techniques"
          open={cardState.technical}
          onToggle={() => toggleCard("technical")}
        >
          <dl className="space-y-1.5 text-xs">
            <div>
              <dt className={labelClass}>id</dt>
              <dd className="font-mono text-slate-800">{form.id || "—"}</dd>
            </div>
          </dl>
        </CollapsibleCard>

        {!isNew && (
          <CollapsibleCard
            title="Métadonnées système"
            open={cardState.metadata}
            onToggle={() => toggleCard("metadata")}
          >
            <dl className="space-y-1.5 text-xs">
              <div>
                <dt className={labelClass}>Créé le</dt>
                <dd className="text-slate-800">{formatDate(form.created_at)}</dd>
              </div>
              <div>
                <dt className={labelClass}>Mis à jour le</dt>
                <dd className="text-slate-800">{formatDate(form.updated_at)}</dd>
              </div>
              <div>
                <dt className={labelClass}>Supprimé le</dt>
                <dd className="text-slate-800">{formatDate(form.deleted_at)}</dd>
              </div>
            </dl>
          </CollapsibleCard>
        )}
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer l'article"
        message="Are you sure you want to delete this article? This action will perform a soft delete."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
