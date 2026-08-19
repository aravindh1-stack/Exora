import { useState, useMemo } from 'react';
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
  DoorOpen,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Question, Difficulty, ExamRoom } from '@/lib/types';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type QuestionInput,
} from '@/lib/queries';
import { Skeleton, Spinner } from './ui';

interface QuestionsProps {
  questions: Question[];
  rooms?: ExamRoom[];
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

export function Questions({ questions, rooms = [], loading, onReload }: QuestionsProps) {
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | 'all' | null>(null);

  // Question Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter questions for the selected room drawer
  const roomQuestions = useMemo(() => {
    if (!selectedRoom) return [];
    if (selectedRoom === 'all') return questions;
    return questions.filter((q) => q.room_id === selectedRoom.id);
  }, [questions, selectedRoom]);

  const filteredRoomQuestions = useMemo(() => {
    return roomQuestions.filter(
      (q) =>
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.topic.toLowerCase().includes(search.toLowerCase()),
    );
  }, [roomQuestions, search]);

  function openCreate(targetRoomId?: string | null) {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      room_id: targetRoomId ?? (typeof selectedRoom === 'object' && selectedRoom ? selectedRoom.id : undefined),
    });
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
      room_id: q.room_id,
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
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exam Room Question Repositories
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Select any department room below to inspect and manage its assigned question set in a dedicated slide-over tab.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRoom('all')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
          >
            <Layers className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>All Question Bank ({questions.length})</span>
          </button>

          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>New Question</span>
          </button>
        </div>
      </motion.div>

      {/* Main Room Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card for Global All Questions Bank */}
          <div
            onClick={() => setSelectedRoom('all')}
            className={`group relative cursor-pointer rounded-2xl border p-5 transition-all shadow-sm ${
              selectedRoom === 'all'
                ? 'border-brand-950 bg-brand-50/80 dark:border-white dark:bg-zinc-900'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#0c0d10] dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-950 text-white dark:bg-white dark:text-brand-950 shadow-subtle">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                #GLOBAL-BANK
              </span>
            </div>

            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-4">
              Master Question Repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Global collection of all multiple-choice examination questions.
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/80">
              <span className="text-xs font-bold text-brand-950 dark:text-zinc-200">
                {questions.length} Questions
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-slate-600 transition group-hover:translate-x-1 dark:text-zinc-300">
                <span>View Bank</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Exam Rooms Cards */}
          {rooms.map((room) => {
            const count = questions.filter((q) => q.room_id === room.id).length;
            const isSelected = typeof selectedRoom === 'object' && selectedRoom?.id === room.id;

            return (
              <div
                key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  setSearch('');
                }}
                className={`group relative cursor-pointer rounded-2xl border p-5 transition-all shadow-sm ${
                  isSelected
                    ? 'border-brand-950 bg-brand-50/80 dark:border-white dark:bg-zinc-900'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#0c0d10] dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 shadow-subtle">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    #{room.room_code}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-4">
                  {room.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {room.department} • Year {room.year} Sem {room.semester}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/80">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>{count} Assigned</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-700 transition group-hover:translate-x-1 dark:text-zinc-200">
                    <span>Open Tab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right Slide-over Drawer / Tab Panel ("screen oti oru tab mari vandhu") */}
      <AnimatePresence>
        {selectedRoom !== null && (
          <div className="fixed inset-0 z-[100]">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRoom(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs dark:bg-black/80 z-[90]"
            />

            {/* Slide-over Right Drawer Container - Full Top-to-Bottom Viewport Height */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 top-0 bottom-0 z-[100] flex h-screen w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10]"
            >
              {/* Drawer Header */}
              <div className="flex flex-col gap-4 border-b border-slate-100 p-6 dark:border-zinc-800/80">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-subtle">
                      <FileQuestion className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                          {selectedRoom === 'all'
                            ? 'Master Question Bank'
                            : (selectedRoom as ExamRoom).title}
                        </h3>
                        <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                          {selectedRoom === 'all'
                            ? '#GLOBAL'
                            : `#${(selectedRoom as ExamRoom).room_code}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {selectedRoom === 'all'
                          ? 'Showing all questions across all exam rooms.'
                          : `${(selectedRoom as ExamRoom).department} • Year ${(selectedRoom as ExamRoom).year} Sem ${(selectedRoom as ExamRoom).semester}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRoom(null)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Filter and Add Bar inside Drawer */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search questions in this room..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
                    />
                  </div>

                  <button
                    onClick={() =>
                      openCreate(
                        typeof selectedRoom === 'object' && selectedRoom ? selectedRoom.id : undefined,
                      )
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 shadow-sm shrink-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {/* Drawer Body Question List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredRoomQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 p-12 text-center dark:border-zinc-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-900">
                      <FileQuestion className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
                    </div>
                    <h4 className="font-display mt-3 text-sm font-bold text-slate-800 dark:text-zinc-200">
                      {roomQuestions.length === 0
                        ? 'No questions assigned to this room yet'
                        : 'No matching questions found'}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
                      {roomQuestions.length === 0
                        ? 'Click the button below to add your first question for this exam room.'
                        : 'Try searching with a different term.'}
                    </p>

                    {roomQuestions.length === 0 && (
                      <button
                        onClick={() =>
                          openCreate(
                            typeof selectedRoom === 'object' && selectedRoom
                              ? selectedRoom.id
                              : undefined,
                          )
                        }
                        className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        <span>Add Question to Room</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredRoomQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-xs transition hover:border-slate-300 dark:border-zinc-800/80 dark:bg-zinc-950/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                            Q{idx + 1}
                          </span>
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                            {q.topic}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize ${DIFFICULTY_STYLES[q.difficulty]}`}
                          >
                            {q.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(q)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                            title="Edit Question"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(q.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Delete Question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                        {q.text}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correct_index;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                                isCorrect
                                  ? 'border-emerald-300 bg-emerald-50/80 font-bold text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  : 'border-slate-100 bg-slate-50/70 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300'
                              }`}
                            >
                              <span className="truncate">
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </span>
                              {isCorrect && (
                                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white shrink-0 ml-1">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Question Modal */}
      <AnimatePresence>
        {modalOpen && (
          <QuestionModal
            editing={editing}
            form={form}
            rooms={rooms}
            saving={saving}
            error={error}
            onChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
            onOptionChange={(idx, val) =>
              setForm((prev) => {
                const next = [...prev.options];
                next[idx] = val;
                return { ...prev, options: next };
              })
            }
            onSave={handleSave}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDialog
            title="Delete Question"
            message="Are you sure you want to delete this question? This action cannot be undone."
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
  editing,
  form,
  rooms,
  saving,
  error,
  onChange,
  onOptionChange,
  onSave,
  onClose,
}: {
  editing: Question | null;
  form: QuestionInput;
  rooms: ExamRoom[];
  saving: boolean;
  error: string | null;
  onChange: (field: keyof QuestionInput, val: unknown) => void;
  onOptionChange: (index: number, val: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {editing ? 'Edit Question' : 'Create New Question'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Target Exam Room (Optional)
            </label>
            <select
              value={form.room_id ?? ''}
              onChange={(e) => onChange('room_id', e.target.value || null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Global Bank (All Rooms)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.room_code} - {r.title} ({r.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Question Prompt Text
            </label>
            <textarea
              rows={3}
              value={form.text}
              onChange={(e) => onChange('text', e.target.value)}
              placeholder="Enter the question prompt..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Multiple Choice Options &amp; Correct Indicator
            </label>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange('correct_index', idx)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                    form.correct_index === idx
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                  }`}
                  title={form.correct_index === idx ? 'Correct Choice' : 'Mark as Correct Choice'}
                >
                  {String.fromCharCode(65 + idx)}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => onOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Topic Tag
              </label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => onChange('topic', e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Difficulty Level
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => onChange('difficulty', e.target.value as Difficulty)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 shadow-sm"
          >
            {saving ? (
              <>
                <Spinner size={14} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                <span>{editing ? 'Update Question' : 'Save Question'}</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 shadow-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
