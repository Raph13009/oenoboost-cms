"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  VinificationStep,
  VinificationType,
} from "@/app/admin/(cms)/vinification-types/actions";
import {
  createVinificationStep,
  createVinificationType,
  deleteVinificationStep,
  deleteVinificationType,
  getVinificationSteps,
  reorderVinificationSteps,
  updateVinificationStep,
  updateVinificationType,
} from "@/app/admin/(cms)/vinification-types/actions";
import { useRouter } from "next/navigation";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const cardClass =
  "rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden";
const cardPadding = "p-3.5";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const fieldSpacing = "space-y-2.5";

const CARD_STATE_KEY = "cms-vinification-types-card-state";

type CardState = {
  basicInfo: boolean;
  illustration: boolean;
  steps: boolean;
  indicators: boolean;
  system: boolean;
};

const defaultCardState: CardState = {
  basicInfo: true,
  illustration: true,
  steps: true,
  indicators: true,
  system: false,
};

function loadCardState(): CardState {
  if (typeof window === "undefined") return defaultCardState;
  try {
    const raw = localStorage.getItem(CARD_STATE_KEY);
    if (!raw) return defaultCardState;
    const parsed = JSON.parse(raw) as Partial<CardState>;
    return {
      basicInfo: parsed.basicInfo ?? defaultCardState.basicInfo,
      illustration: parsed.illustration ?? defaultCardState.illustration,
      steps: parsed.steps ?? defaultCardState.steps,
      indicators: parsed.indicators ?? defaultCardState.indicators,
      system: parsed.system ?? defaultCardState.system,
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

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
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

type StepCardProps = {
  step: VinificationStep;
  draggedStepId: string | null;
  saving: boolean;
  deleting: boolean;
  onChange: (id: string, updates: Partial<VinificationStep>) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
};

function StepCard({
  step,
  draggedStepId,
  saving,
  deleting,
  onChange,
  onSave,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: StepCardProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (step.id.startsWith("temp-")) setOpen(true);
  }, [step.id]);

  const textareaClass =
    "min-h-[4rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";

  return (
    <section
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart(step.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver(step.id);
      }}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm ${
        draggedStepId === step.id ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/70 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
            aria-hidden
          />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Étape {step.step_order}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-slate-800">
            {step.title_fr.trim() || "Sans titre"}
          </span>
        </button>
        <span
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          title="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      </div>

      {open && (
        <div className="space-y-3 p-3.5">
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>title_fr</label>
              <input
                value={step.title_fr}
                onChange={(e) => onChange(step.id, { title_fr: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>title_en</label>
              <input
                value={step.title_en ?? ""}
                onChange={(e) => onChange(step.id, { title_en: e.target.value || null })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>icon_url</label>
              <input
                value={step.icon_url ?? ""}
                onChange={(e) => onChange(step.id, { icon_url: e.target.value || null })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>summary_fr</label>
              <AutoResizeTextarea
                value={step.summary_fr ?? ""}
                onChange={(e) => onChange(step.id, { summary_fr: e.target.value || null })}
                minRows={2}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>summary_en</label>
              <AutoResizeTextarea
                value={step.summary_en ?? ""}
                onChange={(e) => onChange(step.id, { summary_en: e.target.value || null })}
                minRows={2}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>detail_fr</label>
              <AutoResizeTextarea
                value={step.detail_fr ?? ""}
                onChange={(e) => onChange(step.id, { detail_fr: e.target.value || null })}
                minRows={3}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>detail_en</label>
              <AutoResizeTextarea
                value={step.detail_en ?? ""}
                onChange={(e) => onChange(step.id, { detail_en: e.target.value || null })}
                minRows={3}
                className={textareaClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">Ordre: {step.step_order}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSave(step.id)}
                disabled={saving}
                className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer l'étape"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(step.id)}
                disabled={deleting}
                className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type Props = {
  vinificationType: VinificationType | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): VinificationType => ({
  id: "",
  slug: "",
  name_fr: "",
  name_en: null,
  illustration_url: null,
  carousel_order: null,
  is_premium: false,
  status: "draft",
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

export function VinificationTypeEditor({ vinificationType, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !vinificationType?.id;
  const [form, setForm] = useState<VinificationType>(() => vinificationType ?? emptyForm());

  useEffect(() => {
    setForm(vinificationType ?? emptyForm());
  }, [vinificationType?.id, vinificationType?.updated_at]);

  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [steps, setSteps] = useState<VinificationStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [savingStepIds, setSavingStepIds] = useState<string[]>([]);
  const [deletingStepIds, setDeletingStepIds] = useState<string[]>([]);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardState, setCardState] = useState<CardState>(defaultCardState);
  const stepsRef = useRef<VinificationStep[]>([]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

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

  const update = useCallback((updates: Partial<VinificationType>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    let active = true;
    if (!vinificationType?.id) {
      setSteps([]);
      setLoadingSteps(false);
      return () => {
        active = false;
      };
    }

    setLoadingSteps(true);
    getVinificationSteps(vinificationType.id)
      .then((data) => {
        if (!active) return;
        setSteps(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les étapes.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingSteps(false);
      });

    return () => {
      active = false;
    };
  }, [vinificationType?.id]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        name_en: form.name_en || null,
        illustration_url: form.illustration_url || null,
        carousel_order: form.carousel_order ?? null,
        is_premium: !!form.is_premium,
        status: form.status || "draft",
        published_at: form.published_at || null,
      };
      if (isNew) {
        const res = await createVinificationType(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateVinificationType(form.id, payload);
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
      const res = await deleteVinificationType(form.id);
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

  const handleStepChange = useCallback((stepId: string, updates: Partial<VinificationStep>) => {
    setSteps((current) =>
      current.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  }, []);

  const handleAddStep = async () => {
    if (!form.id) return;
    setError(null);
    setAddingStep(true);
    try {
      const res = await createVinificationStep(form.id);
      if (res.error || !res.step) {
        setError(res.error ?? "Impossible de créer l'étape.");
        return;
      }
      setSteps((current) => [...current, res.step!].sort((a, b) => a.step_order - b.step_order));
    } finally {
      setAddingStep(false);
    }
  };

  const handleSaveStep = async (stepId: string) => {
    const step = steps.find((item) => item.id === stepId);
    if (!step) return;

    setError(null);
    setSavingStepIds((current) => [...current, stepId]);
    try {
      const res = await updateVinificationStep(step.id, {
        id: step.id,
        vinification_type_id: step.vinification_type_id,
        step_order: step.step_order,
        icon_url: step.icon_url,
        title_fr: step.title_fr,
        title_en: step.title_en,
        summary_fr: step.summary_fr,
        summary_en: step.summary_en,
        detail_fr: step.detail_fr,
        detail_en: step.detail_en,
      });
      if (res.error) setError(res.error);
    } finally {
      setSavingStepIds((current) => current.filter((id) => id !== stepId));
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    setError(null);
    setDeletingStepIds((current) => [...current, stepId]);
    const previous = steps;
    const remaining = previous
      .filter((step) => step.id !== stepId)
      .map((step, index) => ({ ...step, step_order: index + 1 }));
    setSteps(remaining);

    try {
      const res = await deleteVinificationStep(stepId);
      if (res.error) {
        setError(res.error);
        setSteps(previous);
      }
    } finally {
      setDeletingStepIds((current) => current.filter((id) => id !== stepId));
    }
  };

  const persistStepOrder = useCallback(
    async (nextSteps: VinificationStep[]) => {
      if (!form.id) return;
      const res = await reorderVinificationSteps(
        form.id,
        nextSteps.map((step) => step.id)
      );
      if (res.error) {
        setError(res.error);
        const refreshed = await getVinificationSteps(form.id);
        setSteps(refreshed);
      }
    },
    [form.id]
  );

  const handleDragStart = useCallback((stepId: string) => {
    setDraggedStepId(stepId);
  }, []);

  const handleDragOver = useCallback(
    (targetStepId: string) => {
      setSteps((current) => {
        if (!draggedStepId || draggedStepId === targetStepId) return current;

        const fromIndex = current.findIndex((step) => step.id === draggedStepId);
        const toIndex = current.findIndex((step) => step.id === targetStepId);
        if (fromIndex === -1 || toIndex === -1) return current;

        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next.map((step, index) => ({ ...step, step_order: index + 1 }));
      });
    },
    [draggedStepId]
  );

  const handleDragEnd = useCallback(async () => {
    if (!draggedStepId) return;
    const nextSteps = stepsRef.current.map((step, index) => ({ ...step, step_order: index + 1 }));
    setDraggedStepId(null);
    setSteps(nextSteps);
    await persistStepOrder(nextSteps);
  }, [draggedStepId, persistStepOrder]);

  const panelTitle =
    form.name_fr?.trim() || form.name_en?.trim() || form.slug?.trim() || "Nouveau type de vinification";

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

      <div className="flex-1 space-y-4 overflow-auto p-3">
        <CollapsibleCard
          title="Informations de base"
          open={cardState.basicInfo}
          onToggle={() => toggleCard("basicInfo")}
        >
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nom (FR)</label>
              <input
                value={form.name_fr}
                onChange={(e) => update({ name_fr: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nom (EN)</label>
              <input
                value={form.name_en ?? ""}
                onChange={(e) => update({ name_en: e.target.value || null })}
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
          title="Illustration"
          open={cardState.illustration}
          onToggle={() => toggleCard("illustration")}
        >
          <div>
            <label className={labelClass}>illustration_url</label>
            <input
              value={form.illustration_url ?? ""}
              onChange={(e) => update({ illustration_url: e.target.value || null })}
              className={inputClass}
            />
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Étapes de vinification"
          open={cardState.steps}
          onToggle={() => toggleCard("steps")}
        >
          {!form.id ? (
            <p className="text-sm text-slate-500">
              Enregistrez d'abord le type de vinification pour ajouter des étapes.
            </p>
          ) : (
            <div className={fieldSpacing}>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={addingStep}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span>{addingStep ? "Ajout…" : "Ajouter une étape"}</span>
                  </span>
                </button>
              </div>

              {loadingSteps ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                  Chargement des étapes...
                </div>
              ) : steps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                  Aucune étape pour cette vinification
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      draggedStepId={draggedStepId}
                      saving={savingStepIds.includes(step.id)}
                      deleting={deletingStepIds.includes(step.id)}
                      onChange={handleStepChange}
                      onSave={handleSaveStep}
                      onDelete={handleDeleteStep}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Indicateurs"
          open={cardState.indicators}
          onToggle={() => toggleCard("indicators")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <label className={labelClass}>carousel_order</label>
                <input
                  type="number"
                  value={form.carousel_order ?? ""}
                  onChange={(e) =>
                    update({ carousel_order: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Publié le</label>
                <input
                  type="datetime-local"
                  value={form.published_at ? new Date(form.published_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    update({
                      published_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
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
        </CollapsibleCard>

        <CollapsibleCard title="Système" open={cardState.system} onToggle={() => toggleCard("system")}>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className={labelClass}>created_at</dt>
              <dd className="text-slate-800">{formatDate(form.created_at)}</dd>
            </div>
            <div>
              <dt className={labelClass}>updated_at</dt>
              <dd className="text-slate-800">{formatDate(form.updated_at)}</dd>
            </div>
          </dl>
        </CollapsibleCard>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer le type de vinification"
        message="Are you sure you want to delete this vinification type? This action will perform a soft delete."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
