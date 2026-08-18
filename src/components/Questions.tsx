import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  FileQuestion,
  AlertCircle,
} from 'lucide-react';
import type { Question, Difficulty } from '@/lib/types';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type QuestionInput,
} from '@/lib/queries';
import { Skeleton, Spinner } from './ui';

interface QuestionsProps {
  questions: Question[];
  loading: boolean;
  onReload: () => void;
}

const EMPTY_FORM: QuestionInput = {
  text: '',
  options: ['', '', '', ''],
  correct_index: 0,
  topic: 'General',
  difficulty: 'medium',
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
};

export function Questions({ questions, loading, onReload }: QuestionsProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = questions.filter(
    (q) =>
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      text: q.text,
      options: [...q.options],
      correct_index: q.correct_index,
      topic: q.topic,
      difficulty: q.difficulty,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.text.trim()) {
      setError('Question text is required.');
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      setError('All four options must be filled.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateQuestion(editing.id, form);
      } else {
        await createQuestion(form);
      }
      setModalOpen(false);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteQuestion(deleteId);
      setDeleteId(null);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete question.');
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Question Bank
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Create, search, and manage multiple-choice examination questions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by prompt or topic..."
              className="w-48 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700 sm:w-60"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New Question
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card flex flex-col items-center justify-center rounded-xl py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-900">
            <FileQuestion className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">
            {questions.length === 0 ? 'No questions in bank' : 'No matching questions'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {questions.length === 0
              ? 'Add your first exam question to get started.'
              : 'Try searching for a different keyword or topic.'}
          </p>
          {questions.length === 0 && (
            <button
              onClick={openCreate}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Question
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((q, i) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: i * 0.02 }}
                className="panel-card group rounded-xl p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      {q.topic}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${DIFFICULTY_STYLES[q.difficulty]}`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(q)}
                      className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Edit Question"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(q.id)}
                      className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      title="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 text-xs font-semibold leading-relaxed text-slate-900 dark:text-zinc-100">
                  {q.text}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correct_index;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs ${
                          isCorrect
                            ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium dark:border-emerald-800/80 dark:bg-emerald-950/30 dark:text-emerald-200'
                            : 'border-slate-100 bg-slate-50/50 text-slate-600 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:text-zinc-400'
                        }`}
                      >
                        <span
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                            isCorrect
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black'
                              : 'bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {isCorrect ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            String.fromCharCode(65 + idx)
                          )}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <QuestionModal
            form={form}
            setForm={setForm}
            editing={!!editing}
            saving={saving}
            error={error}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <ConfirmDialog
            title="Delete question?"
            message="This question will be removed from the bank. This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionModal({
  form,
  setForm,
  editing,
  saving,
  error,
  onClose,
  onSave,
}: {
  form: QuestionInput;
  setForm: React.Dispatch<React.SetStateAction<QuestionInput>>;
  editing: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  function updateOption(idx: number, value: string) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === idx ? value : o)),
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs dark:bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2 }}
        className="panel-card relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-5 no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {editing ? 'Edit Question' : 'Create New Question'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Question Prompt
            </label>
            <textarea
              value={form.text}
              onChange={(e) =>
                setForm((f) => ({ ...f, text: e.target.value }))
              }
              rows={3}
              placeholder="Enter the question text..."
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Topic Tag
              </label>
              <input
                value={form.topic}
                onChange={(e) =>
                  setForm((f) => ({ ...f, topic: e.target.value }))
                }
                placeholder="e.g. Data Structures"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Difficulty Level
              </label>
              <div className="mt-1 flex gap-1.5">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold capitalize transition ${
                      form.difficulty === d
                        ? DIFFICULTY_STYLES[d]
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Answer Options (Select correct answer)
            </label>
            <div className="mt-1.5 space-y-1.5">
              {form.options.map((opt, idx) => {
                const isCorrect = form.correct_index === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 rounded-lg border p-1.5 transition ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/80 dark:bg-emerald-950/30'
                        : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-pitch-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, correct_index: idx }))
                      }
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold transition ${
                        isCorrect
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black'
                          : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {isCorrect ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            {saving ? (
              <>
                <Spinner size={14} />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                {editing ? 'Update Question' : 'Save Question'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs dark:bg-black/80"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="panel-card relative z-10 w-full max-w-sm rounded-xl p-5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

