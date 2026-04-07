"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  SoilType,
  SoilTypeLinkedAppellation,
} from "@/app/admin/(cms)/soil-types/actions";
import {
  addSoilTypeAppellationLink,
  createSoilType,
  deleteSoilType,
  getSoilTypeAppellationLinks,
  removeSoilTypeAppellationLink,
  searchAppellationsForSoilLinks,
  uploadSoilTypePhoto,
  updateSoilType,
} from "@/app/admin/(cms)/soil-types/actions";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CmsPhotoCropField } from "@/components/admin/shared/CmsPhotoCropField";

const cardClass =
  "rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden";
const cardPadding = "p-3.5";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const fieldSpacing = "space-y-2.5";

const CARD_STATE_KEY = "cms-soil-types-card-state";

type CardState = {
  identity: boolean;
  geology: boolean;
  distribution: boolean;
  wineImpact: boolean;
  flags: boolean;
  technical: boolean;
  metadata: boolean;
};

const defaultCardState: CardState = {
  identity: true,
  geology: true,
  distribution: true,
  wineImpact: true,
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
      geology: parsed.geology ?? defaultCardState.geology,
      distribution: parsed.distribution ?? defaultCardState.distribution,
      wineImpact: parsed.wineImpact ?? defaultCardState.wineImpact,
      flags: parsed.flags ?? defaultCardState.flags,
      // Always closed when entering the page (even if previously expanded).
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
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
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

function AppellationLinkSelector({
  soilTypeId,
  onError,
}: {
  soilTypeId: string | null;
  onError: (message: string | null) => void;
}) {
  const [selectedAppellations, setSelectedAppellations] = useState<SoilTypeLinkedAppellation[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SoilTypeLinkedAppellation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const sortAppellations = useCallback((items: SoilTypeLinkedAppellation[]) => {
    return [...items].sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr", { sensitivity: "base" }));
  }, []);

  const syncDropdownPosition = useCallback(() => {
    if (!rootRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    setSelectedAppellations([]);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(0);

    if (!soilTypeId) return;

    let active = true;
    getSoilTypeAppellationLinks(soilTypeId)
      .then((items) => {
        if (!active) return;
        setSelectedAppellations(sortAppellations(items));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSelectedAppellations([]);
        onError(err instanceof Error ? err.message : "Impossible de charger les AOP associées.");
      });

    return () => {
      active = false;
    };
  }, [onError, soilTypeId, sortAppellations]);

  useEffect(() => {
    if (!open) return;
    syncDropdownPosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleViewportChange() {
      syncDropdownPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, syncDropdownPosition]);

  useEffect(() => {
    if (!open || !soilTypeId) return;

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    const timeoutId = window.setTimeout(() => {
      searchAppellationsForSoilLinks(query)
        .then((items) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResults(items);
          setActiveIndex(0);
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResults([]);
          onError(err instanceof Error ? err.message : "Impossible de rechercher les AOP.");
        })
        .finally(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setLoading(false);
          syncDropdownPosition();
        });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, onError, query, soilTypeId, syncDropdownPosition]);

  const visibleResults = useMemo(() => {
    if (results.length === 0) return [];
    const selectedIds = new Set(selectedAppellations.map((item) => item.id));
    return results.filter((item) => !selectedIds.has(item.id));
  }, [results, selectedAppellations]);

  useEffect(() => {
    if (activeIndex < visibleResults.length) return;
    setActiveIndex(visibleResults.length > 0 ? visibleResults.length - 1 : 0);
  }, [activeIndex, visibleResults.length]);

  const handleAdd = useCallback(
    async (appellation: SoilTypeLinkedAppellation) => {
      if (!soilTypeId) return;
      if (selectedAppellations.some((item) => item.id === appellation.id)) return;

      onError(null);
      setBusyId(appellation.id);
      const previous = selectedAppellations;
      setSelectedAppellations((current) => sortAppellations([...current, appellation]));
      setQuery("");
      inputRef.current?.focus();

      const res = await addSoilTypeAppellationLink(soilTypeId, appellation.id);
      setBusyId((current) => (current === appellation.id ? null : current));

      if (res.error) {
        setSelectedAppellations(previous);
        onError(res.error);
      }
    },
    [onError, selectedAppellations, soilTypeId, sortAppellations]
  );

  const handleRemove = useCallback(
    async (appellation: SoilTypeLinkedAppellation) => {
      if (!soilTypeId) return;

      onError(null);
      setBusyId(appellation.id);
      const previous = selectedAppellations;
      setSelectedAppellations((current) => current.filter((item) => item.id !== appellation.id));

      const res = await removeSoilTypeAppellationLink(soilTypeId, appellation.id);
      setBusyId((current) => (current === appellation.id ? null : current));

      if (res.error) {
        setSelectedAppellations(previous);
        onError(res.error);
      }
    },
    [onError, selectedAppellations, soilTypeId]
  );

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!soilTypeId) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((current) => (visibleResults.length === 0 ? 0 : Math.min(current + 1, visibleResults.length - 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "Enter" && open && visibleResults[activeIndex]) {
        event.preventDefault();
        await handleAdd(visibleResults[activeIndex]);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    },
    [activeIndex, handleAdd, open, soilTypeId, visibleResults]
  );

  return (
    <div className="space-y-2.5">
      <label className={labelClass}>AOP associées</label>

      {soilTypeId ? (
        <>
          <div ref={rootRef} className="relative">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!open) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher une AOP..."
              className={inputClass}
            />
          </div>

          {selectedAppellations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedAppellations.map((appellation) => (
                <button
                  key={appellation.id}
                  type="button"
                  onClick={() => void handleRemove(appellation)}
                  disabled={busyId === appellation.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                  title="Retirer l'AOP"
                >
                  <span className="truncate">
                    {appellation.name_fr}
                    {appellation.region_name_fr ? ` (${appellation.region_name_fr})` : ""}
                  </span>
                  <span className="text-slate-400">×</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Aucune AOP associée</div>
          )}

          {open &&
            dropdownRect &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={panelRef}
                className="z-[100] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
                style={{
                  position: "fixed",
                  top: dropdownRect.top,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                }}
              >
                {loading ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Recherche…</div>
                ) : visibleResults.length > 0 ? (
                  <ul className="max-h-72 overflow-auto py-1">
                    {visibleResults.map((appellation, index) => (
                      <li key={appellation.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void handleAdd(appellation)}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="min-w-0 truncate text-slate-900">{appellation.name_fr}</span>
                          {appellation.region_name_fr ? (
                            <span className="shrink-0 text-xs text-slate-400">{appellation.region_name_fr}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">Aucune AOP trouvée</div>
                )}
              </div>,
              document.body
            )}
        </>
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Enregistrez d&apos;abord ce sol pour associer des AOP.
        </div>
      )}
    </div>
  );
}

type Props = {
  soilType: SoilType | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): SoilType => ({
  id: "",
  slug: "",
  name_fr: "",
  name_en: null,
  photo_url: null,
  geological_origin_fr: null,
  geological_origin_en: null,
  regions_fr: null,
  regions_en: null,
  mineral_composition_fr: null,
  mineral_composition_en: null,
  wine_influence_fr: null,
  wine_influence_en: null,
  emblematic_aop_fr: null,
  emblematic_aop_en: null,
  carousel_order: null,
  is_premium: false,
  status: "draft",
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

export function SoilTypeEditor({ soilType, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !soilType?.id;
  const [form, setForm] = useState<SoilType>(() => soilType ?? emptyForm());

  useEffect(() => {
    setForm(soilType ?? emptyForm());
  }, [soilType?.id, soilType?.updated_at]);

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

  const update = useCallback((updates: Partial<SoilType>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        name_en: form.name_en || null,
        photo_url: form.photo_url || null,
        geological_origin_fr: form.geological_origin_fr || null,
        geological_origin_en: form.geological_origin_en || null,
        mineral_composition_fr: form.mineral_composition_fr || null,
        mineral_composition_en: form.mineral_composition_en || null,
        regions_fr: form.regions_fr || null,
        regions_en: form.regions_en || null,
        wine_influence_fr: form.wine_influence_fr || null,
        wine_influence_en: form.wine_influence_en || null,
        emblematic_aop_fr: form.emblematic_aop_fr || null,
        emblematic_aop_en: form.emblematic_aop_en || null,
        carousel_order: form.carousel_order ?? null,
        is_premium: !!form.is_premium,
        status: form.status || "draft",
        published_at: form.published_at || null,
      };
      if (isNew) {
        const res = await createSoilType(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateSoilType(form.id, payload);
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
      const res = await deleteSoilType(form.id);
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

  const panelTitle = form.name_fr?.trim() || form.name_en?.trim() || form.slug?.trim() || "Nouveau sol";

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
            <div className="sm:col-span-2">
              <CmsPhotoCropField
                value={form.photo_url}
                onChange={(photoUrl) => update({ photo_url: photoUrl })}
                entityId={isNew ? null : form.id}
                entityIdFormKey="soilTypeId"
                slug={form.slug || form.name_fr}
                slugFallback="soil"
                disabled={saving}
                onError={setError}
                upload={uploadSoilTypePhoto}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Geological / Composition"
          open={cardState.geology}
          onToggle={() => toggleCard("geology")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Origine géologique (FR)</label>
                <AutoResizeTextarea
                  value={form.geological_origin_fr ?? ""}
                  onChange={(e) => update({ geological_origin_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Origine géologique (EN)</label>
                <AutoResizeTextarea
                  value={form.geological_origin_en ?? ""}
                  onChange={(e) => update({ geological_origin_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Composition minérale (FR)</label>
                <AutoResizeTextarea
                  value={form.mineral_composition_fr ?? ""}
                  onChange={(e) => update({ mineral_composition_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Composition minérale (EN)</label>
                <AutoResizeTextarea
                  value={form.mineral_composition_en ?? ""}
                  onChange={(e) => update({ mineral_composition_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Répartition"
          open={cardState.distribution}
          onToggle={() => toggleCard("distribution")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Régions (FR)</label>
                <AutoResizeTextarea
                  value={form.regions_fr ?? ""}
                  onChange={(e) => update({ regions_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Régions (EN)</label>
                <AutoResizeTextarea
                  value={form.regions_en ?? ""}
                  onChange={(e) => update({ regions_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Impact sur le vin"
          open={cardState.wineImpact}
          onToggle={() => toggleCard("wineImpact")}
        >
          <div className={fieldSpacing}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Influence sur le vin (FR)</label>
                <AutoResizeTextarea
                  value={form.wine_influence_fr ?? ""}
                  onChange={(e) => update({ wine_influence_fr: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Influence sur le vin (EN)</label>
                <AutoResizeTextarea
                  value={form.wine_influence_en ?? ""}
                  onChange={(e) => update({ wine_influence_en: e.target.value || null })}
                  minRows={2}
                  className={textareaClass}
                />
              </div>
              <div className="sm:col-span-2">
                <AppellationLinkSelector soilTypeId={isNew ? null : form.id} onError={setError} />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Indicateurs" open={cardState.flags} onToggle={() => toggleCard("flags")}>
          <div className={fieldSpacing}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <label className={labelClass}>Ordre du carrousel</label>
                <input
                  type="number"
                  value={form.carousel_order ?? ""}
                  onChange={(e) =>
                    update({ carousel_order: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!form.is_premium}
                    onChange={(e) => update({ is_premium: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>is_premium</span>
                </label>
              </div>
            </div>
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
                  onChange={(e) =>
                    update({ published_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
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
        title="Supprimer le sol"
        message="Are you sure you want to delete this soil type? This action will perform a soft delete."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
