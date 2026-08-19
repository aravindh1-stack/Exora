import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Flag,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  GraduationCap,
  Building,
  Calendar,
  Check,
  AlertCircle,
  Trash2,
  FileText,
  XCircle,
} from 'lucide-react';
import type { StudentWithSession, StudentStatus } from '@/lib/types';
import { Skeleton, Spinner } from './ui';
import { formatTimeAgo, initials } from '@/lib/format';
import { createStudent, deleteStudent, fetchStudentResponses, type StudentInput, type ExamResponseDetail } from '@/lib/queries';


interface StudentsProps {
  students: StudentWithSession[];
  loading: boolean;
  onReload?: () => void;
}

const STATUS_CONFIG: Record<
  StudentStatus,
  { label: string; icon: typeof Flag; dot: string; badge: string; text: string }
> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60',
    text: 'text-amber-700 dark:text-amber-300',
  },
  flagged: {
    label: 'Flagged',
    icon: Flag,
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60',
    text: 'text-rose-700 dark:text-rose-300',
  },
};

type FilterKey = 'all' | StudentStatus;

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'AI & Data Science',
  'Electronics & Comm.',
  'Electrical & Electronics',
  'Mechanical Eng.',
  'Civil Eng.',
];

export function Students({ students, loading, onReload }: StudentsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<StudentWithSession | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.register_no.toLowerCase().includes(search.toLowerCase()) ||
        (s.department && s.department.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filter === 'all' || s.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [students, search, filter]);

  const counts = useMemo(
    () => ({
      all: students.length,
      completed: students.filter((s) => s.status === 'completed').length,
      in_progress: students.filter((s) => s.status === 'in_progress').length,
      flagged: students.filter((s) => s.status === 'flagged').length,
    }),
    [students],
  );

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Students', count: counts.all },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { key: 'flagged', label: 'Flagged', count: counts.flagged },
  ];

  async function handleDeleteStudent() {
    if (!deleteId) return;
    try {
      await deleteStudent(deleteId);
      setDeleteId(null);
      onReload?.();
    } catch (e) {
      console.error('Failed to delete student', e);
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
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Student Roster & Performance
          </h2>

          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Manage academic profiles, current year/sem status, and live exam proctoring.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-subtle transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2} />
          Add Student
        </button>
      </motion.div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => {
            const isActive = filter === f.key;
            const config =
              f.key !== 'all' ? STATUS_CONFIG[f.key as StudentStatus] : null;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? config
                      ? `${config.badge} ${config.text}`
                      : 'border-slate-300 bg-slate-900 text-white dark:border-zinc-700 dark:bg-zinc-100 dark:text-black'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {config && (
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                )}
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive
                      ? 'bg-slate-200/40 dark:bg-black/20'
                      : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-500'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SIN no, or dept..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700 sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card flex flex-col items-center justify-center rounded-xl py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-900">
            <GraduationCap className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">
            No students found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {students.length === 0
              ? 'Add your first student to the roster to get started.'
              : 'Try searching by a different name, SIN number, or department.'}
          </p>
          {students.length === 0 && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <UserPlus className="h-4 w-4" />
              Add Student
            </button>
          )}
        </div>
      ) : (
        <div className="panel-card overflow-hidden rounded-xl">
          <div className="hidden grid-cols-[1.2fr_1.8fr_1.5fr_1fr_1.2fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 md:grid">
            <span>SIN / Reg No</span>
            <span>Student Name</span>
            <span>Dept & Year/Sem</span>
            <span>Score</span>
            <span>Status</span>
            <span className="text-right">Completed</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            <AnimatePresence mode="popLayout">
              {filtered.map((s, i) => {
                const config = STATUS_CONFIG[s.status];
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group grid w-full grid-cols-2 gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 md:grid-cols-[1.2fr_1.8fr_1.5fr_1fr_1.2fr_0.8fr] md:gap-4 md:items-center"
                  >
                    <div
                      onClick={() => setSelected(s)}
                      className="cursor-pointer font-mono text-xs font-semibold text-slate-600 dark:text-zinc-400"
                    >
                      {s.register_no}
                    </div>

                    <div
                      onClick={() => setSelected(s)}
                      className="cursor-pointer flex items-center gap-2.5 min-w-0"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-zinc-100">
                          {s.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400 dark:text-zinc-500">
                          {s.email || 'No email registered'}
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setSelected(s)}
                      className="cursor-pointer flex flex-wrap items-center gap-1.5"
                    >
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        {s.department || 'CS'}
                      </span>
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                        Y{s.year || 1} • S{s.semester || 1}
                      </span>
                    </div>

                    <div onClick={() => setSelected(s)} className="cursor-pointer flex items-center">
                      {s.status === 'in_progress' ? (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              s.score >= 80
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : s.score >= 60
                                  ? 'text-slate-900 dark:text-zinc-200'
                                  : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {s.score}%
                          </span>
                          <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800 lg:block">
                            <div
                              className={`h-full rounded-full ${
                                s.score >= 80
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : s.score >= 60
                                    ? 'bg-slate-700 dark:bg-zinc-400'
                                    : 'bg-rose-600 dark:bg-rose-400'
                              }`}
                              style={{ width: `${s.score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div onClick={() => setSelected(s)} className="cursor-pointer">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${config.badge} ${config.text}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-right text-xs text-slate-400 dark:text-zinc-500">
                      <span onClick={() => setSelected(s)} className="cursor-pointer">
                        {formatTimeAgo(s.completed_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(s.id);
                        }}
                        className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Delete Student"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <AddStudentModal
            onClose={() => setAddModalOpen(false)}
            onReload={() => {
              setAddModalOpen(false);
              onReload?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Student Details Inspector Drawer */}
      <AnimatePresence>
        {selected && (
          <StudentDetail
            student={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirm Deletion Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs dark:bg-black/80"
              onClick={() => setDeleteId(null)}
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
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Delete student record?</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                This student and their exam sessions will be permanently removed.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddStudentModal({
  onClose,
  onReload,
}: {
  onClose: () => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState<StudentInput>({
    name: '',
    register_no: '',
    email: '',
    department: 'Computer Science',
    year: 1,
    semester: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!form.register_no.trim()) {
      setError('SIN No / Register Number is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createStudent(form);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register student.');
    } finally {
      setSaving(false);
    }
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
        className="panel-card relative z-10 w-full max-w-lg overflow-y-auto rounded-xl p-5 no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-slate-900 dark:text-white" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Add New Student
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Full Name *
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Kavya Subramanian"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                SIN No / Register No *
              </label>
              <input
                value={form.register_no}
                onChange={(e) =>
                  setForm((f) => ({ ...f, register_no: e.target.value }))
                }
                placeholder="e.g. SIN2026011"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="e.g. kavya@univ.edu"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Department *
            </label>
            <select
              value={form.department}
              onChange={(e) =>
                setForm((f) => ({ ...f, department: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Current Year
              </label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, year: yr }))}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition ${
                      form.year === yr
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    Yr {yr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Semester
              </label>
              <select
                value={form.semester}
                onChange={(e) =>
                  setForm((f) => ({ ...f, semester: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
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
            onClick={handleSave}
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
                Register Student
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StudentDetail({
  student,
  onClose,
}: {
  student: StudentWithSession;
  onClose: () => void;
}) {
  const config = STATUS_CONFIG[student.status];
  const StatusIcon = config.icon;
  const isFlagged = student.status === 'flagged';

  const [responses, setResponses] = useState<ExamResponseDetail[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [activeTab, setActiveTab] = useState<'responses' | 'profile'>('responses');

  useEffect(() => {
    if (student.session_id) {
      setLoadingResponses(true);
      fetchStudentResponses(student.session_id)
        .then((res) => setResponses(res))
        .catch((e) => console.error(e))
        .finally(() => setLoadingResponses(false));
    }
  }, [student.session_id]);

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
        className="panel-card relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-black">
            {initials(student.name)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{student.name}</h3>
            <p className="font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">
              SIN: {student.register_no}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex border-b border-slate-100 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('responses')}
            className={`flex items-center gap-2 border-b-2 py-2 px-3 text-xs font-bold transition ${
              activeTab === 'responses'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Student Responses ({responses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 py-2 px-3 text-xs font-bold transition ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Session Summary</span>
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'responses' ? (
            <div>
              {loadingResponses ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  <Spinner size={16} /> Fetching student submitted answers...
                </div>
              ) : responses.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-6 text-center dark:border-zinc-800/60 dark:bg-zinc-950/40">
                  <AlertCircle className="mx-auto h-6 w-6 text-slate-400 dark:text-zinc-500" />
                  <p className="mt-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                    No Response Log Found
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
                    {student.status === 'in_progress'
                      ? 'Student examination is currently in progress.'
                      : 'No specific answer submissions were recorded for this session.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map((res, idx) => {
                    const q = res.question;
                    const selectedOpt = q && q.options ? q.options[res.selected_index] : undefined;
                    const correctOpt = q && q.options ? q.options[q.correct_index] : undefined;

                    return (
                      <div
                        key={res.id || idx}
                        className={`rounded-xl border p-3.5 text-xs transition ${
                          res.is_correct
                            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                            : 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {idx + 1}. {q ? q.text : `Question ID: ${res.question_id}`}
                          </span>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              res.is_correct
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                            }`}
                          >
                            {res.is_correct ? (
                              <>
                                <Check className="h-3 w-3" /> Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Incorrect
                              </>
                            )}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 font-medium">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                            <span className="font-semibold text-slate-500 dark:text-zinc-400">
                              Student Selected:
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                                res.is_correct
                                  ? 'bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-100'
                                  : 'bg-rose-200/60 text-rose-900 dark:bg-rose-900/80 dark:text-rose-100'
                              }`}
                            >
                              {selectedOpt !== undefined
                                ? `Option ${String.fromCharCode(65 + res.selected_index)}: ${selectedOpt}`
                                : 'Skipped / Unanswered'}
                            </span>
                          </div>

                          {!res.is_correct && correctOpt !== undefined && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Correct Answer:
                              </span>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                                Option {String.fromCharCode(65 + (q?.correct_index ?? 0))}: {correctOpt}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <TrendingUp className="h-3 w-3" />
                    Score Achieved
                  </div>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      student.status === 'in_progress'
                        ? 'text-slate-400 dark:text-zinc-500'
                        : student.score >= 80
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : student.score >= 60
                            ? 'text-slate-900 dark:text-zinc-100'
                            : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {student.status === 'in_progress' ? '—' : `${student.score}%`}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <StatusIcon className="h-3 w-3" />
                    Session Status
                  </div>
                  <p className={`mt-1 text-sm font-bold ${config.text}`}>
                    {config.label}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <Building className="h-3 w-3" /> Department
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-200">
                    {student.department || 'Computer Science'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <Calendar className="h-3 w-3" /> Academic Year / Sem
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-200">
                    Year {student.year || 1} • Semester {student.semester || 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Email Address</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-200">{student.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Completed Time</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-200">
                    {formatTimeAgo(student.completed_at)}
                  </span>
                </div>
              </div>

              {isFlagged && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div>
                    <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      Malpractice Flagged
                    </p>
                    <p className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-200/80">
                      {student.flag_reason ?? 'Flagged for review.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}



