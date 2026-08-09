"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MoveDown, MoveUp, Plus, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  addQuestionToQuiz,
  createQuizGroup,
  deleteQuizGroup,
  getAvailableQuizQuestions,
  removeQuestionFromQuiz,
  reorderQuizQuestions,
  updateQuizGroup,
  type QuizGroup,
  type QuizGroupQuestionLink,
  type QuizQuestionOption,
} from "@/app/admin/(cms)/quizzes/actions";
import { QUIZ_GROUP_TYPE_OPTIONS } from "@/app/admin/(cms)/quizzes/constants";

const cardClass = "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";
const cardPadding = "p-3";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-600";
const labelClass = "mb-0.5 block text-[11px] text-slate-500";
const inputClass =
  "h-9 w-full rounded border border-slate-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200";

const CARD_STATE_KEY = "cms-quiz-group-card-state";

type CardState = {
  info: boolean;
  questions: boolean;
  addQuestions: boolean;
};

const defaultCardState: CardState = {
  info: true,
  questions: true,
  addQuestions: true,
};

type Props = {
  quiz: QuizGroup | null;
  questions: QuizGroupQuestionLink[];
  onClose: () => void;
  onDeleted: () => void;
};

type QuizGroupFormState = QuizGroup;

type QuestionFilters = {
  search: string;
  theme: string;
  type: string;
};

function loadCardState(): CardState {
  if (typeof window === "undefined") return defaultCardState;
  try {
    const raw = localStorage.getItem(CARD_STATE_KEY);
    if (!raw) return defaultCardState;
    const parsed = JSON.parse(raw) as Partial<CardState>;
    return {
      info: parsed.info ?? defaultCardState.info,
      questions: parsed.questions ?? defaultCardState.questions,
      addQuestions: parsed.addQuestions ?? defaultCardState.addQuestions,
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
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={cardClass}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className={sectionTitleClass}>{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
          aria-hidden
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: open ? "none" : 0 }}
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

  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
      {type}
    </span>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
}

function emptyForm(): QuizGroupFormState {
  return {
    id: "",
    title_fr: "",
    title_en: null,
    type: "beginner",
    theme: null,
    duration_sec: null,
    is_premium: false,
    status: "draft",
    question_count: 0,
    created_at: "",
    updated_at: "",
  };
}

function normalizePositionInput(value: string, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), max);
}

export function QuizGroupEditor({ quiz, questions, onClose, onDeleted }: Props) {
  const router = useRouter();
  const isNew = !quiz?.id;
  const [form, setForm] = useState<QuizGroupFormState>(() => quiz ?? emptyForm());
  const [linkedQuestions, setLinkedQuestions] = useState<QuizGroupQuestionLink[]>(questions);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardState, setCardState] = useState<CardState>(defaultCardState);
  const [pickerFilters, setPickerFilters] = useState<QuestionFilters>({
    search: "",
    theme: "all",
    type: "all",
  });
  const [availableQuestions, setAvailableQuestions] = useState<QuizQuestionOption[]>([]);
  const [loadingAvailableQuestions, setLoadingAvailableQuestions] = useState(false);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [positionDrafts, setPositionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(quiz ?? emptyForm());
  }, [quiz?.id, quiz?.updated_at]);

  useEffect(() => {
    setLinkedQuestions(questions);
    setPositionDrafts(
      Object.fromEntries(questions.map((question) => [question.question_id, String(question.position)]))
    );
  }, [questions]);

  useEffect(() => {
    setCardState(loadCardState());
  }, []);

  useEffect(() => {
    if (isNew) {
      setAvailableQuestions([]);
      return;
    }

    let active = true;
    setLoadingAvailableQuestions(true);
    getAvailableQuizQuestions({
      search: pickerFilters.search,
      theme: pickerFilters.theme,
      type: pickerFilters.type,
      excludeIds: linkedQuestions.map((question) => question.question_id),
    })
      .then((items) => {
        if (!active) return;
        setAvailableQuestions(items);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger les questions.");
        setAvailableQuestions([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingAvailableQuestions(false);
      });

    return () => {
      active = false;
    };
  }, [isNew, linkedQuestions, pickerFilters]);

  const toggleCard = useCallback((key: keyof CardState) => {
    setCardState((previous) => {
      const next = { ...previous, [key]: !previous[key] };
      saveCardState(next);
      return next;
    });
  }, []);

  const update = useCallback((updates: Partial<QuizGroupFormState>) => {
    setForm((previous) => ({ ...previous, ...updates }));
  }, []);

  const quizTitle = form.title_fr.trim() || form.title_en?.trim() || "Nouveau quizz";
  const estimatedDurationSec =
    linkedQuestions.length > 0 && typeof form.duration_sec === "number"
      ? linkedQuestions.length * form.duration_sec
      : null;

  const themeOptions = useMemo(() => {
    return Array.from(
      new Set(
        [...linkedQuestions.map((item) => item.question?.theme), ...availableQuestions.map((item) => item.theme)].filter(
          Boolean
        ) as string[]
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [availableQuestions, linkedQuestions]);

  const persistOrder = useCallback(
    async (nextQuestions: QuizGroupQuestionLink[]) => {
      if (isNew || !form.id) return;

      setLinkedQuestions(nextQuestions);
      setPositionDrafts(
        Object.fromEntries(
          nextQuestions.map((question, index) => [question.question_id, String(index + 1)])
        )
      );

      const result = await reorderQuizQuestions(
        form.id,
        nextQuestions.map((question) => question.question_id)
      );

      if (result.error) {
        setError(result.error);
        router.refresh();
        return;
      }

      setError(null);
      router.refresh();
    },
    [form.id, isNew, router]
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        title_fr: form.title_fr.trim(),
        title_en: form.title_en?.trim() || null,
        theme: form.theme?.trim() || null,
        duration_sec:
          typeof form.duration_sec === "number" && Number.isFinite(form.duration_sec)
            ? Math.max(0, Math.round(form.duration_sec))
            : null,
        is_premium: !!form.is_premium,
        status: form.status || "draft",
      };

      const result = isNew
        ? await createQuizGroup(payload)
        : await updateQuizGroup(form.id, payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      if (isNew) {
        onClose();
        return;
      }

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isNew) return;

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteQuizGroup(form.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onDeleted();
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddQuestion = async (questionId: string) => {
    if (isNew || !form.id || !questionId) return;

    const questionToAdd = availableQuestions.find((question) => question.id === questionId);
    if (!questionToAdd) return;

    const previousLinkedQuestions = linkedQuestions;
    const previousAvailableQuestions = availableQuestions;
    const nextLinkedQuestions = [
      ...linkedQuestions,
      {
        question_id: questionToAdd.id,
        position: linkedQuestions.length + 1,
        question: questionToAdd,
      },
    ];

    setLinkedQuestions(nextLinkedQuestions);
    setAvailableQuestions((previous) => previous.filter((question) => question.id !== questionId));
    setPositionDrafts(
      Object.fromEntries(
        nextLinkedQuestions.map((question, index) => [question.question_id, String(index + 1)])
      )
    );
    setPendingQuestionId(questionId);
    setError(null);

    try {
      const result = await addQuestionToQuiz(form.id, questionId);
      if (result.error) {
        setLinkedQuestions(previousLinkedQuestions);
        setAvailableQuestions(previousAvailableQuestions);
        setPositionDrafts(
          Object.fromEntries(
            previousLinkedQuestions.map((question, index) => [
              question.question_id,
              String(index + 1),
            ])
          )
        );
        setError(result.error);
        return;
      }

      router.refresh();
    } finally {
      setPendingQuestionId(null);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (isNew || !form.id) return;

    const removedQuestion = linkedQuestions.find((question) => question.question_id === questionId);
    const previousLinkedQuestions = linkedQuestions;
    const nextLinkedQuestions = linkedQuestions
      .filter((question) => question.question_id !== questionId)
      .map((question, index) => ({
        ...question,
        position: index + 1,
      }));

    setLinkedQuestions(nextLinkedQuestions);
    setPositionDrafts(
      Object.fromEntries(
        nextLinkedQuestions.map((question, index) => [question.question_id, String(index + 1)])
      )
    );

    if (removedQuestion?.question) {
      const matchesTheme =
        pickerFilters.theme === "all" || (removedQuestion.question.theme ?? "") === pickerFilters.theme;
      const matchesType =
        pickerFilters.type === "all" || removedQuestion.question.type === pickerFilters.type;
      const searchTerm = pickerFilters.search.trim().toLowerCase();
      const matchesSearch =
        searchTerm.length === 0 ||
        removedQuestion.question.question_fr.toLowerCase().includes(searchTerm);

      if (matchesTheme && matchesType && matchesSearch) {
        setAvailableQuestions((previous) => {
          if (previous.some((question) => question.id === removedQuestion.question_id)) {
            return previous;
          }
          return [removedQuestion.question!, ...previous];
        });
      }
    }

    setPendingQuestionId(questionId);
    setError(null);

    try {
      const result = await removeQuestionFromQuiz(form.id, questionId);
      if (result.error) {
        setLinkedQuestions(previousLinkedQuestions);
        setPositionDrafts(
          Object.fromEntries(
            previousLinkedQuestions.map((question, index) => [
              question.question_id,
              String(index + 1),
            ])
          )
        );
        setError(result.error);
        return;
      }

      router.refresh();
    } finally {
      setPendingQuestionId(null);
    }
  };

  const moveQuestion = async (questionId: string, direction: -1 | 1) => {
    const index = linkedQuestions.findIndex((question) => question.question_id === questionId);
    if (index < 0) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= linkedQuestions.length) return;

    const nextQuestions = [...linkedQuestions];
    const [moved] = nextQuestions.splice(index, 1);
    nextQuestions.splice(targetIndex, 0, moved);

    await persistOrder(nextQuestions);
  };

  const moveQuestionToPosition = async (questionId: string, rawPosition: string) => {
    const currentIndex = linkedQuestions.findIndex((question) => question.question_id === questionId);
    if (currentIndex < 0) return;

    const nextPosition = normalizePositionInput(rawPosition, linkedQuestions.length);
    const targetIndex = nextPosition - 1;

    if (currentIndex === targetIndex) {
      setPositionDrafts((previous) => ({ ...previous, [questionId]: String(nextPosition) }));
      return;
    }

    const nextQuestions = [...linkedQuestions];
    const [moved] = nextQuestions.splice(currentIndex, 1);
    nextQuestions.splice(targetIndex, 0, moved);
    await persistOrder(nextQuestions);
  };

  const panelSubtitle = linkedQuestions.length
    ? `${linkedQuestions.length} question${linkedQuestions.length > 1 ? "s" : ""}`
    : "Aucune question";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="min-w-0 truncate text-base font-semibold text-slate-900">{quizTitle}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{panelSubtitle}</p>
        </div>
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
            {saving ? "Enregistrement..." : savedFeedback ? "Enregistré ✓" : "Enregistrer"}
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

      {error ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-auto p-3">
        <CollapsibleCard
          title="Quiz Info"
          subtitle="Titre, thème, durée et statut du groupe"
          open={cardState.info}
          onToggle={() => toggleCard("info")}
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div>
              <label className={labelClass}>Titre FR</label>
              <input
                type="text"
                value={form.title_fr}
                onChange={(event) => update({ title_fr: event.target.value })}
                className={inputClass}
                placeholder="Le quizz sur les appellations"
              />
            </div>
            <div>
              <label className={labelClass}>Titre EN</label>
              <input
                type="text"
                value={form.title_en ?? ""}
                onChange={(event) => update({ title_en: event.target.value || null })}
                className={inputClass}
                placeholder="Quiz title"
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={form.type}
                onChange={(event) =>
                  update({ type: event.target.value as QuizGroupFormState["type"] })
                }
                className={inputClass}
              >
                {QUIZ_GROUP_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Thème</label>
              <input
                type="text"
                value={form.theme ?? ""}
                onChange={(event) => update({ theme: event.target.value || null })}
                className={inputClass}
                placeholder="Bourgogne, dégustation, terroirs..."
              />
            </div>
            <div>
              <label className={labelClass}>Durée estimée par question (sec)</label>
              <input
                type="number"
                min={0}
                step={5}
                value={form.duration_sec ?? ""}
                onChange={(event) =>
                  update({
                    duration_sec:
                      event.target.value === ""
                        ? null
                        : Number.parseInt(event.target.value, 10) || 0,
                  })
                }
                className={inputClass}
                placeholder="30"
              />
            </div>
            <div>
              <label className={labelClass}>Statut</label>
              <select
                value={form.status}
                onChange={(event) =>
                  update({ status: event.target.value as QuizGroupFormState["status"] })
                }
                className={inputClass}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_premium}
                onChange={(event) => update({ is_premium: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Premium
            </label>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
              <StatusDot status={form.status} />
              {form.status === "published" ? "Publié" : "Brouillon"}
            </span>
            <TypeBadge type={form.type} />
            <span className="text-sm text-slate-600">
              {linkedQuestions.length} question{linkedQuestions.length > 1 ? "s" : ""}
            </span>
            {estimatedDurationSec !== null ? (
              <span className="text-sm text-slate-600">
                Durée estimée: {Math.ceil(estimatedDurationSec / 60)} min
              </span>
            ) : null}
          </div>

          {!isNew && (
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-2">
              <div>Créé le: {formatDate(form.created_at)}</div>
              <div>Mis à jour le: {formatDate(form.updated_at)}</div>
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Questions in Quiz"
          subtitle="Ajoutez des questions puis ajustez leur ordre"
          open={cardState.questions}
          onToggle={() => toggleCard("questions")}
        >
          {isNew ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Enregistrez le quizz avant d&apos;y ajouter des questions.
            </div>
          ) : linkedQuestions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Aucune question dans ce quizz.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedQuestions.map((item, index) => {
                const question = item.question;
                const isBusy = pendingQuestionId === item.question_id;
                const positionValue = positionDrafts[item.question_id] ?? String(index + 1);

                return (
                  <div
                    key={item.question_id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-sm font-semibold text-slate-500">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900">
                            {question?.question_fr || "Question introuvable"}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>Thème: {question?.theme ?? "—"}</span>
                            <span>Difficulté: {question?.type ?? "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveQuestion(item.question_id, -1)}
                            className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            disabled={index === 0}
                            aria-label="Monter"
                          >
                            <MoveUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(item.question_id, 1)}
                            className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            disabled={index === linkedQuestions.length - 1}
                            aria-label="Descendre"
                          >
                            <MoveDown className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={linkedQuestions.length}
                            value={positionValue}
                            onChange={(event) =>
                              setPositionDrafts((previous) => ({
                                ...previous,
                                [item.question_id]: event.target.value,
                              }))
                            }
                            onBlur={() =>
                              moveQuestionToPosition(item.question_id, positionValue)
                            }
                            className="h-9 w-16 rounded border border-slate-200 px-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                            aria-label="Position"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              moveQuestionToPosition(item.question_id, positionValue)
                            }
                            className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Placer
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(item.question_id)}
                          disabled={isBusy}
                          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Add Questions"
          subtitle="Questions publiées uniquement, hors quiz courant"
          open={cardState.addQuestions}
          onToggle={() => toggleCard("addQuestions")}
        >
          {isNew ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Enregistrez le quizz pour activer l&apos;ajout de questions.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr),180px,180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={pickerFilters.search}
                    onChange={(event) =>
                      setPickerFilters((previous) => ({
                        ...previous,
                        search: event.target.value,
                      }))
                    }
                    className={`${inputClass} pl-8`}
                    placeholder="Rechercher une question publiée..."
                  />
                </div>
                <select
                  value={pickerFilters.theme}
                  onChange={(event) =>
                    setPickerFilters((previous) => ({
                      ...previous,
                      theme: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="all">Tous les thèmes</option>
                  {themeOptions.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
                <select
                  value={pickerFilters.type}
                  onChange={(event) =>
                    setPickerFilters((previous) => ({
                      ...previous,
                      type: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="all">Toutes les difficultés</option>
                  {QUIZ_GROUP_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-slate-200">
                <div className="max-h-72 overflow-auto">
                  {loadingAvailableQuestions ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      Chargement des questions publiées...
                    </div>
                  ) : availableQuestions.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      Aucune question disponible avec ces filtres.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                        <tr>
                          <th className="p-2 font-medium">Question (FR)</th>
                          <th className="w-28 p-2 font-medium">Thème</th>
                          <th className="w-24 p-2 font-medium">Type</th>
                          <th className="w-28 p-2 font-medium">Difficulté</th>
                          <th className="w-24 p-2 font-medium">Statut</th>
                          <th className="w-16 p-2 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableQuestions.map((question) => {
                          const isBusy = pendingQuestionId === question.id;

                          return (
                            <tr
                              key={question.id}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="p-2">
                                <div className="line-clamp-2 font-medium text-slate-900">
                                  {question.question_fr}
                                </div>
                              </td>
                              <td className="p-2 text-slate-600">{question.theme ?? "—"}</td>
                              <td className="p-2 text-slate-600">{question.type}</td>
                              <td className="p-2 text-slate-600">{question.type}</td>
                              <td className="p-2">
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                  <StatusDot status={question.status} />
                                  {question.status}
                                </span>
                              </td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleAddQuestion(question.id)}
                                  disabled={isBusy}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  aria-label={`Ajouter la question ${question.question_fr}`}
                                  title="Ajouter"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </CollapsibleCard>

        {!isNew && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Le compteur de questions est resynchronisé automatiquement après chaque ajout,
            retrait ou changement d&apos;ordre.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title="Supprimer ce quizz ?"
        message="Cette action supprimera le groupe de quizz et ses liaisons de questions."
        confirmLabel={deleting ? "Suppression..." : "Supprimer"}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
