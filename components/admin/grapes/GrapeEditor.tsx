"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Grape } from "@/app/admin/(cms)/grapes/actions";
import {
  createGrape,
  deleteGrape,
  updateGrape,
} from "@/app/admin/(cms)/grapes/actions";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ProductionCountriesSelect } from "@/components/admin/grapes/ProductionCountriesSelect";

const cardClass =
  "rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden";
const cardPadding = "p-3.5";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const fieldSpacing = "space-y-2.5";

const CARD_STATE_KEY = "cms-grapes-card-state";

type CardState = {
  identity: boolean;
  origin: boolean;
  editorial: boolean;
  flags: boolean;
  technical: boolean;
  metadata: boolean;
};

const defaultCardState: CardState = {
  identity: true,
  origin: true,
  editorial: true,
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
      origin: parsed.origin ?? defaultCardState.origin,
      editorial: parsed.editorial ?? defaultCardState.editorial,
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
        className="flex w-full items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100/90"
      >
        <span className={sectionTitleClass}>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          aria-hidden
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: open ? 2000 : 0 }}
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
  minRows = 2,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  minRows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minHeight = minRows * 20;
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
  grape: Grape | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): Grape => ({
  id: "",
  slug: "",
  name_fr: "",
  name_en: null,
  type: null,
  origin_country: null,
  origin_region_fr: null,
  origin_region_en: null,
  origin_latitude: null,
  origin_longitude: null,
  history_fr: null,
  history_en: null,
  crossings_fr: null,
  crossings_en: null,
  production_regions_fr: null,
  production_regions_en: null,
  viticultural_traits_fr: null,
  viticultural_traits_en: null,
  tasting_traits_fr: null,
  tasting_traits_en: null,
  emblematic_wines_fr: null,
  emblematic_wines_en: null,
  production_countries: null,
  is_premium: false,
  status: "draft",
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

export function GrapeEditor({ grape, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !grape?.id;
  const [form, setForm] = useState<Grape>(() => grape ?? emptyForm());

  useEffect(() => {
    setForm(grape ?? emptyForm());
  }, [grape?.id, grape?.updated_at]);

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

  const update = useCallback((updates: Partial<Grape>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
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
        production_countries: form.production_countries ?? null,
        is_premium: !!form.is_premium,
        status: form.status || "draft",
        published_at: form.published_at || null,
      };
      if (isNew) {
        const res = await createGrape(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateGrape(form.id, payload);
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
      const res = await deleteGrape(form.id);
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

  const panelTitle = form.name_fr?.trim() || form.name_en?.trim() || form.slug?.trim() || "Nouveau cépage";

  const textareaClass =
    "min-h-[4rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-slate-900">{panelTitle}</h2>
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

      <div className="flex-1 overflow-auto p-3 space-y-4">
        <CollapsibleCard title="Identité" open={cardState.identity} onToggle={() => toggleCard("identity")}>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nom (FR)</label>
              <input value={form.name_fr} onChange={(e) => update({ name_fr: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nom (EN)</label>
              <input
                value={form.name_en ?? ""}
                onChange={(e) => update({ name_en: e.target.value || null })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input value={form.slug} onChange={(e) => update({ slug: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <input
                value={form.type ?? ""}
                onChange={(e) => update({ type: e.target.value || null })}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Origine" open={cardState.origin} onToggle={() => toggleCard("origin")}>
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Pays d'origine</label>
                <input
                  value={form.origin_country ?? ""}
                  onChange={(e) => update({ origin_country: e.target.value || null })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Région d'origine (FR)</label>
                <input
                  value={form.origin_region_fr ?? ""}
                  onChange={(e) => update({ origin_region_fr: e.target.value || null })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Région d'origine (EN)</label>
                <input
                  value={form.origin_region_en ?? ""}
                  onChange={(e) => update({ origin_region_en: e.target.value || null })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Latitude d'origine</label>
                <input
                  type="number"
                  step="any"
                  value={form.origin_latitude ?? ""}
                  onChange={(e) => update({ origin_latitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Longitude d'origine</label>
                <input
                  type="number"
                  step="any"
                  value={form.origin_longitude ?? ""}
                  onChange={(e) => update({ origin_longitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <ProductionCountriesSelect
                  value={form.production_countries ?? []}
                  onChange={(next) => update({ production_countries: next.length === 0 ? null : next })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Éditorial" open={cardState.editorial} onToggle={() => toggleCard("editorial")}>
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Histoire (FR)</label>
                <AutoResizeTextarea value={form.history_fr ?? ""} onChange={(e) => update({ history_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Histoire (EN)</label>
                <AutoResizeTextarea value={form.history_en ?? ""} onChange={(e) => update({ history_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Croisements (FR)</label>
                <AutoResizeTextarea value={form.crossings_fr ?? ""} onChange={(e) => update({ crossings_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Croisements (EN)</label>
                <AutoResizeTextarea value={form.crossings_en ?? ""} onChange={(e) => update({ crossings_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Régions de production (FR)</label>
                <AutoResizeTextarea value={form.production_regions_fr ?? ""} onChange={(e) => update({ production_regions_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Régions de production (EN)</label>
                <AutoResizeTextarea value={form.production_regions_en ?? ""} onChange={(e) => update({ production_regions_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Traits viticoles (FR)</label>
                <AutoResizeTextarea value={form.viticultural_traits_fr ?? ""} onChange={(e) => update({ viticultural_traits_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Traits viticoles (EN)</label>
                <AutoResizeTextarea value={form.viticultural_traits_en ?? ""} onChange={(e) => update({ viticultural_traits_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Traits de dégustation (FR)</label>
                <AutoResizeTextarea value={form.tasting_traits_fr ?? ""} onChange={(e) => update({ tasting_traits_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Traits de dégustation (EN)</label>
                <AutoResizeTextarea value={form.tasting_traits_en ?? ""} onChange={(e) => update({ tasting_traits_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Vins emblématiques (FR)</label>
                <AutoResizeTextarea value={form.emblematic_wines_fr ?? ""} onChange={(e) => update({ emblematic_wines_fr: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Vins emblématiques (EN)</label>
                <AutoResizeTextarea value={form.emblematic_wines_en ?? ""} onChange={(e) => update({ emblematic_wines_en: e.target.value || null })} minRows={2} className={textareaClass} />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Indicateurs" open={cardState.flags} onToggle={() => toggleCard("flags")}>
          <div className={fieldSpacing}>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={!!form.is_premium}
                onChange={(e) => update({ is_premium: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>is_premium</span>
            </label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
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
                  <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" aria-hidden />
                </div>
              </div>
              <div>
                <label className={labelClass}>Publié le</label>
                <input
                  type="datetime-local"
                  value={form.published_at ? new Date(form.published_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => update({ published_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Données techniques" open={cardState.technical} onToggle={() => toggleCard("technical")}>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className={labelClass}>id</dt>
              <dd className="font-mono text-slate-800">{form.id || "—"}</dd>
            </div>
          </dl>
        </CollapsibleCard>

        {!isNew && (
          <CollapsibleCard title="Métadonnées système" open={cardState.metadata} onToggle={() => toggleCard("metadata")}>
            <dl className="space-y-2 text-xs">
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
        title="Supprimer le cépage"
        message="Are you sure you want to delete this grape? This action will perform a soft delete."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
