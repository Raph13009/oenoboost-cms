"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DictionaryTerm } from "@/app/admin/(cms)/dictionary/actions";
import {
  createDictionaryTerm,
  deleteDictionaryTerm,
  updateDictionaryTerm,
} from "@/app/admin/(cms)/dictionary/actions";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const cardClass =
  "rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden";
const cardPadding = "p-3";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const fieldSpacing = "space-y-2";
const textareaClass =
  "min-h-[5rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 leading-relaxed focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";

const CARD_STATE_KEY = "cms-dictionary-card-state";

type CardState = {
  identity: boolean;
  definition: boolean;
  enrichment: boolean;
  linking: boolean;
  flags: boolean;
  technical: boolean;
  metadata: boolean;
};

const defaultCardState: CardState = {
  identity: true,
  definition: true,
  enrichment: false,
  linking: false,
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
      definition: parsed.definition ?? defaultCardState.definition,
      enrichment: parsed.enrichment ?? defaultCardState.enrichment,
      linking: parsed.linking ?? defaultCardState.linking,
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
        style={{ maxHeight: open ? 3000 : 0 }}
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
  minRows = 3,
  maxRows = 20,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  minRows?: number;
  maxRows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minHeight = minRows * 22;
  const maxHeight = maxRows * 22;
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.max(ta.scrollHeight, minHeight);
    ta.style.height = `${Math.min(newHeight, maxHeight)}px`;
    ta.style.overflowY = newHeight > maxHeight ? "auto" : "hidden";
  }, [value, minHeight, maxHeight]);
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

function relatedModulesDisplay(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type Props = {
  term: DictionaryTerm | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): DictionaryTerm => ({
  id: "",
  slug: "",
  term_fr: "",
  term_en: null,
  definition_fr: null,
  definition_en: null,
  examples_fr: null,
  examples_en: null,
  etymology_fr: null,
  etymology_en: null,
  related_modules: null,
  is_word_of_day: false,
  is_premium: false,
  free_order: null,
  status: "draft",
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

export function DictionaryTermEditor({ term, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !term?.id;
  const [form, setForm] = useState<DictionaryTerm>(() => term ?? emptyForm());

  useEffect(() => {
    setForm(term ?? emptyForm());
  }, [term?.id, term?.updated_at]);

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

  const update = useCallback((updates: Partial<DictionaryTerm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: Parameters<typeof createDictionaryTerm>[0] = {
        ...form,
        term_en: form.term_en || null,
        definition_fr: form.definition_fr || null,
        definition_en: form.definition_en || null,
        examples_fr: form.examples_fr || null,
        examples_en: form.examples_en || null,
        etymology_fr: form.etymology_fr || null,
        etymology_en: form.etymology_en || null,
        related_modules: form.related_modules,
        is_word_of_day: !!form.is_word_of_day,
        is_premium: !!form.is_premium,
        free_order: form.free_order ?? null,
        status: form.status || "draft",
        published_at: form.published_at || null,
      };
      if (isNew) {
        const res = await createDictionaryTerm(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateDictionaryTerm(form.id, payload);
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
      const res = await deleteDictionaryTerm(form.id);
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
    form.term_fr?.trim() || form.term_en?.trim() || form.slug?.trim() || "Nouveau terme";

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
              <label className={labelClass}>Terme (FR)</label>
              <input
                value={form.term_fr}
                onChange={(e) => update({ term_fr: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Terme (EN)</label>
              <input
                value={form.term_en ?? ""}
                onChange={(e) => update({ term_en: e.target.value || null })}
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
          title="Définition"
          open={cardState.definition}
          onToggle={() => toggleCard("definition")}
        >
          <div className={fieldSpacing}>
            <div>
              <label className={labelClass}>Définition (FR)</label>
              <AutoResizeTextarea
                value={form.definition_fr ?? ""}
                onChange={(e) => update({ definition_fr: e.target.value || null })}
                minRows={4}
                className={textareaClass}
                placeholder="Définition en français…"
              />
            </div>
            <div>
              <label className={labelClass}>Définition (EN)</label>
              <AutoResizeTextarea
                value={form.definition_en ?? ""}
                onChange={(e) => update({ definition_en: e.target.value || null })}
                minRows={4}
                className={textareaClass}
                placeholder="Definition in English…"
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Enrichissement"
          open={cardState.enrichment}
          onToggle={() => toggleCard("enrichment")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Exemples (FR)</label>
                <AutoResizeTextarea
                  value={form.examples_fr ?? ""}
                  onChange={(e) => update({ examples_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Exemples (EN)</label>
                <AutoResizeTextarea
                  value={form.examples_en ?? ""}
                  onChange={(e) => update({ examples_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Étymologie (FR)</label>
                <AutoResizeTextarea
                  value={form.etymology_fr ?? ""}
                  onChange={(e) => update({ etymology_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Étymologie (EN)</label>
                <AutoResizeTextarea
                  value={form.etymology_en ?? ""}
                  onChange={(e) => update({ etymology_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Liens"
          open={cardState.linking}
          onToggle={() => toggleCard("linking")}
        >
          <div className={fieldSpacing}>
            <label className={labelClass}>Modules liés (JSON)</label>
            <textarea
              value={relatedModulesDisplay(form.related_modules)}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  update({ related_modules: null });
                  return;
                }
                try {
                  update({ related_modules: JSON.parse(v) });
                } catch {
                  update({ related_modules: e.target.value as unknown });
                }
              }}
              rows={4}
              className="font-mono text-xs w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
              placeholder='["module_id", ...]'
            />
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Indicateurs"
          open={cardState.flags}
          onToggle={() => toggleCard("flags")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={!!form.is_word_of_day}
                  onChange={(e) => update({ is_word_of_day: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>is_word_of_day</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={!!form.is_premium}
                  onChange={(e) => update({ is_premium: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>is_premium</span>
              </label>
              <div>
                <label className={labelClass}>Ordre libre</label>
                <input
                  type="number"
                  value={form.free_order ?? ""}
                  onChange={(e) =>
                    update({
                      free_order:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
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
        title="Supprimer le terme"
        message="Are you sure you want to delete this term? This action will perform a soft delete."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
