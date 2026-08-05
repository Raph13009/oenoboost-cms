"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion } from "@/app/admin/(cms)/quiz/actions";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  updateQuizQuestion,
} from "@/app/admin/(cms)/quiz/actions";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const cardClass = "rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden";
const cardPadding = "p-3";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "block text-[11px] text-slate-500 mb-0.5";
const inputClass =
  "h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const textareaClass =
  "min-h-[4rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 leading-relaxed focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";
const optionTextareaClass =
  "min-h-[2.5rem] w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 leading-snug focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";

const CARD_STATE_KEY = "cms-quiz-question-card-state";

type CardState = {
  question: boolean;
  answers: boolean;
  explanation: boolean;
  classification: boolean;
  scheduling: boolean;
  flags: boolean;
  system: boolean;
};

const defaultCardState: CardState = {
  question: true,
  answers: true,
  explanation: false,
  classification: true,
  scheduling: false,
  flags: true,
  system: false,
};

function loadCardState(): CardState {
  if (typeof window === "undefined") return defaultCardState;
  try {
    const raw = localStorage.getItem(CARD_STATE_KEY);
    if (!raw) return defaultCardState;
    const parsed = JSON.parse(raw) as Partial<CardState>;
    return {
      question: parsed.question ?? defaultCardState.question,
      answers: parsed.answers ?? defaultCardState.answers,
      explanation: parsed.explanation ?? defaultCardState.explanation,
      classification: parsed.classification ?? defaultCardState.classification,
      scheduling: parsed.scheduling ?? defaultCardState.scheduling,
      flags: parsed.flags ?? defaultCardState.flags,
      system: false,
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
  minRows = 2,
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
    <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />
  );
}

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR");
}

type Props = {
  question: QuizQuestion | null;
  onClose: () => void;
  onDeleted: () => void;
};

const emptyForm = (): QuizQuestion => ({
  id: "",
  type: "daily",
  theme: null,
  question_fr: "",
  question_en: "",
  option_a_fr: "",
  option_a_en: "",
  option_b_fr: "",
  option_b_en: "",
  option_c_fr: null,
  option_c_en: null,
  option_d_fr: null,
  option_d_en: null,
  correct_option: "a",
  explanation_fr: null,
  explanation_en: null,
  related_module: null,
  scheduled_date: null,
  is_premium: false,
  status: "draft",
  created_at: "",
  updated_at: "",
});

type OptKey = "a" | "b" | "c" | "d";

export function QuizQuestionEditor({ question, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !question?.id;
  const [form, setForm] = useState<QuizQuestion>(() => question ?? emptyForm());

  useEffect(() => {
    setForm(question ?? emptyForm());
  }, [question?.id, question?.updated_at]);

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

  const update = useCallback((updates: Partial<QuizQuestion>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        theme: form.theme || null,
        option_c_fr: form.option_c_fr || null,
        option_c_en: form.option_c_en || null,
        option_d_fr: form.option_d_fr || null,
        option_d_en: form.option_d_en || null,
        explanation_fr: form.explanation_fr || null,
        explanation_en: form.explanation_en || null,
        related_module: form.related_module || null,
        scheduled_date: form.scheduled_date || null,
        is_premium: !!form.is_premium,
        status: form.status || "draft",
      };

      if (isNew) {
        const res = await createQuizQuestion(payload);
        if (res.error) setError(res.error);
        else {
          router.refresh();
          onClose();
        }
      } else {
        const res = await updateQuizQuestion(form.id, payload);
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
      const res = await deleteQuizQuestion(form.id);
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

  const panelTitle = form.question_fr.trim() || "Nouvelle question";

  const optionRow = (key: OptKey, label: string) => {
    const isCorrect = form.correct_option === key;
    const border = isCorrect ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white";
    const ring = isCorrect ? "ring-1 ring-emerald-200" : "";

    const frKey = (`option_${key}_fr` as const) satisfies keyof QuizQuestion;
    const enKey = (`option_${key}_en` as const) satisfies keyof QuizQuestion;
    const frVal = (form as any)[frKey] as string | null;
    const enVal = (form as any)[enKey] as string | null;

    return (
      <div key={key} className={`rounded-md border ${border} ${ring} p-2`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-700">Option {label}</div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="radio"
              name="correct_option"
              checked={isCorrect}
              onChange={() => update({ correct_option: key })}
              className="h-4 w-4"
            />
            Correct
          </label>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={labelClass}>FR</label>
            <AutoResizeTextarea
              value={frVal ?? ""}
              onChange={(e) => update({ [frKey]: e.target.value || (key === "c" || key === "d" ? null : "") } as any)}
              minRows={2}
              className={optionTextareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>EN</label>
            <AutoResizeTextarea
              value={enVal ?? ""}
              onChange={(e) => update({ [enKey]: e.target.value || (key === "c" || key === "d" ? null : "") } as any)}
              minRows={2}
              className={optionTextareaClass}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
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

      <div className="flex-1 overflow-auto p-3 space-y-3">
        <CollapsibleCard title="Question" open={cardState.question} onToggle={() => toggleCard("question")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Question (FR)</label>
              <AutoResizeTextarea
                value={form.question_fr}
                onChange={(e) => update({ question_fr: e.target.value })}
                minRows={3}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>Question (EN)</label>
              <AutoResizeTextarea
                value={form.question_en}
                onChange={(e) => update({ question_en: e.target.value })}
                minRows={3}
                className={textareaClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Réponses" open={cardState.answers} onToggle={() => toggleCard("answers")}>
          <div className="space-y-2">
            {optionRow("a", "A")}
            {optionRow("b", "B")}
            {optionRow("c", "C")}
            {optionRow("d", "D")}
            <div className="pt-1 text-xs text-slate-500">
              Correct option: <span className="font-semibold text-slate-700">{form.correct_option.toUpperCase()}</span>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Explication"
          open={cardState.explanation}
          onToggle={() => toggleCard("explanation")}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Explication (FR)</label>
              <AutoResizeTextarea
                value={form.explanation_fr ?? ""}
                onChange={(e) => update({ explanation_fr: e.target.value || null })}
                minRows={3}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>Explication (EN)</label>
              <AutoResizeTextarea
                value={form.explanation_en ?? ""}
                onChange={(e) => update({ explanation_en: e.target.value || null })}
                minRows={3}
                className={textareaClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Classification"
          open={cardState.classification}
          onToggle={() => toggleCard("classification")}
        >
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Thème</label>
              <input
                value={form.theme ?? ""}
                onChange={(e) => update({ theme: e.target.value || null })}
                className={inputClass}
                placeholder="e.g. terroir"
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <div className="relative flex h-8 w-full items-center rounded border border-slate-200 bg-white focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
                <select
                  value={form.type}
                  onChange={(e) => update({ type: e.target.value })}
                  className="h-full w-full flex-1 appearance-none rounded border-0 bg-transparent pl-2 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-0"
                >
                  <option value="daily">daily</option>
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="expert">expert</option>
                  <option value="thematic">thematic</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" aria-hidden />
              </div>
            </div>
            <div>
              <label className={labelClass}>Module lié</label>
              <input
                value={form.related_module ?? ""}
                onChange={(e) => update({ related_module: e.target.value || null })}
                className={inputClass}
                placeholder="e.g. grape"
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Planification"
          open={cardState.scheduling}
          onToggle={() => toggleCard("scheduling")}
        >
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date planifiée</label>
              <input
                type="date"
                value={form.scheduled_date ?? ""}
                onChange={(e) => update({ scheduled_date: e.target.value || null })}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Indicateurs" open={cardState.flags} onToggle={() => toggleCard("flags")}>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-3">
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
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" aria-hidden />
              </div>
            </div>
            <div className="text-xs text-slate-500 sm:pt-5">
              Correct: <span className="font-semibold text-emerald-700">{form.correct_option.toUpperCase()}</span>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Champs système" open={cardState.system} onToggle={() => toggleCard("system")}>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className={labelClass}>Créé le</dt>
              <dd className="text-slate-800">{form.created_at ? formatDate(form.created_at) : "—"}</dd>
            </div>
            <div>
              <dt className={labelClass}>Mis à jour le</dt>
              <dd className="text-slate-800">{form.updated_at ? formatDate(form.updated_at) : "—"}</dd>
            </div>
          </dl>
        </CollapsibleCard>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer la question"
        message="Are you sure you want to delete this question? This action is permanent."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

