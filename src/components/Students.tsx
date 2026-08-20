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
  UploadCloud,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import type { StudentWithSession, StudentStatus, ExamRoom } from '@/lib/types';
import { Skeleton, Spinner } from './ui';
import { formatTimeAgo, initials, normalizeDepartment } from '@/lib/format';
import { createStudent, bulkUpsertStudents, deleteStudent, fetchStudentResponses, type StudentInput, type ExamResponseDetail } from '@/lib/queries';


interface StudentsProps {
  students: StudentWithSession[];
  rooms?: ExamRoom[];
  loading: boolean;
  onReload?: () => void;
}

const STATUS_CONFIG: Record<
  StudentStatus,
  { label: string; icon: typeof Flag; dot: string; badge: string; text: string }
> = {
  registered: {
    label: 'Registered',
    icon: GraduationCap,
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 border-slate-200 dark:bg-zinc-900/60 dark:border-zinc-800',
    text: 'text-slate-600 dark:text-zinc-400',
  },
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
    label: 'FLAGGED',
    icon: Flag,
    dot: 'bg-rose-600',
    badge: 'bg-rose-600 border-rose-600 text-white shadow-xs',
    text: 'text-white font-bold',
  },
};

type FilterKey = 'all' | StudentStatus;

const DEPARTMENTS = [
  'CSE',
  'ECE',
  'EEE',
  'IT',
  'MECH',
  'CIVIL',
  'AIDS',
  'AIML',
];

export function Students({ students, rooms = [], loading, onReload }: StudentsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<StudentWithSession | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
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
      registered: students.filter((s) => s.status === 'registered' || !s.status).length,
      in_progress: students.filter((s) => s.status === 'in_progress').length,
      completed: students.filter((s) => s.status === 'completed').length,
      flagged: students.filter((s) => s.status === 'flagged').length,
    }),
    [students],
  );

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Students', count: counts.all },
    { key: 'registered', label: 'Registered', count: counts.registered },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { key: 'completed', label: 'Completed', count: counts.completed },
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Bulk Upload CSV</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-subtle transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2} />
            <span>Add Student</span>
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-zinc-100 dark:text-black'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-pitch-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
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
            onCreated={() => {
              setAddModalOpen(false);
              onReload?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload CSV Modal */}
      <AnimatePresence>
        {bulkModalOpen && (
          <BulkUploadModal
            onClose={() => setBulkModalOpen(false)}
            onSuccess={() => {
              setBulkModalOpen(false);
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
            rooms={rooms}
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

function BulkUploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [parsed, setParsed] = useState<StudentInput[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function parseContent(content: string) {
    setErrorMsg(null);
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setParsed([]);
      return;
    }

    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    const headers = firstLine.split(delimiter).map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));
    const isHeaderRow = headers.some((h) =>
      ['name', 'register_no', 'sin', 'reg_no', 'email', 'department', 'dept', 'year', 'semester', 'sem'].includes(h)
    );

    const startIndex = isHeaderRow ? 1 : 0;
    const items: StudentInput[] = [];

    let nameIdx = headers.findIndex((h) => h.includes('name'));
    let regIdx = headers.findIndex((h) => h.includes('reg') || h.includes('sin') || h.includes('roll') || h.includes('id') || h.includes('no'));
    let emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    let deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department') || h.includes('branch') || h.includes('course') || h.includes('stream'));
    let yearIdx = headers.findIndex((h) => h.includes('year') || h.includes('yr'));
    let semIdx = headers.findIndex((h) => h.includes('sem') || h.includes('semester'));

    if (nameIdx === -1) nameIdx = 0;
    if (regIdx === -1) regIdx = 1;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^['"]|['"]$/g, ''));
      if (cols.length < 2) continue;

      const name = cols[nameIdx] || cols[0] || '';
      const reg = cols[regIdx] || cols[1] || '';

      // Preserve EXACT department text from CSV column without forcing/overriding
      let department = '';
      if (deptIdx !== -1 && cols[deptIdx]) {
        department = cols[deptIdx];
      } else if (cols.length >= 4 && cols[3] && !cols[3].includes('@')) {
        department = cols[3];
      } else if (cols.length >= 3 && cols[2] && !cols[2].includes('@')) {
        department = cols[2];
      }

      const email = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : `${reg.toLowerCase()}@student.sscet.ac.in`;
      const yr = yearIdx !== -1 ? Number(cols[yearIdx]) || 1 : 1;
      const sem = semIdx !== -1 ? Number(cols[semIdx]) || 1 : 1;

      if (name && reg) {
        items.push({
          name,
          register_no: reg,
          email,
          department: department.trim() || 'General',
          year: yr,
          semester: sem,
        });
      }
    }

    if (items.length === 0) {
      setErrorMsg('Could not parse any valid student records. Please verify columns contain Name and SIN/Register No.');
    }
    setParsed(items);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseContent(text);
    };
    reader.readAsText(f);
  }

  function handleDownloadSample() {
    const csvContent = `Name,Register No,Email,Department,Year,Semester
Ananya Roy,REG2026004,ananya.roy@sscet.ac.in,Computer Science,1,1
Meera Joshi,REG2026009,meera.joshi@sscet.ac.in,Computer Science,1,1
Rahul Verma,REG2026010,rahul.verma@sscet.ac.in,Electronics & Communication,2,3
Kavya Sharma,REG2026011,kavya.sharma@sscet.ac.in,Electrical Eng.,3,5`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Exora_Students_Sample_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (parsed.length === 0) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      await bulkUpsertStudents(parsed);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to bulk upload students to database.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Bulk Upload Students (CSV / Google Sheets)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Import 60+ candidates at once using CSV or copied table text.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => setActiveTab('file')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'file'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                Upload .CSV File
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                Paste Table Text
              </button>
            </div>

            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download Sample CSV
            </button>
          </div>

          {activeTab === 'file' ? (
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/60 cursor-pointer">
              <FileSpreadsheet className="h-10 w-10 text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {file ? file.name : 'Click or Drag & Drop Google Sheet CSV file here'}
              </span>
              <span className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
                Accepts .csv or .txt files exported from Google Sheets / Excel
              </span>
              <input
                type="file"
                accept=".csv, .txt, text/csv, text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Paste copied rows directly from Google Sheets / Excel:
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  parseContent(e.target.value);
                }}
                placeholder={`Name\tRegister No\tEmail\tDepartment\tYear\tSemester\nAnanya Roy\tREG2026004\tananya@sscet.ac.in\tComputer Science\t1\t1`}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  ✓ {parsed.length} Candidates Ready to Import
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Duplicates will be updated automatically
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 dark:border-zinc-800 dark:bg-zinc-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">SIN / Reg No</th>
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5">Yr/Sem</th>
                      <th className="p-2.5">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 text-slate-800 dark:text-zinc-200">
                    {parsed.slice(0, 50).map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold">{p.name}</td>
                        <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">{p.register_no}</td>
                        <td className="p-2.5">{p.department}</td>
                        <td className="p-2.5">Y{p.year} / S{p.semester}</td>
                        <td className="p-2.5 text-slate-500 dark:text-zinc-400">{p.email || '—'}</td>
                      </tr>
                    ))}
                    {parsed.length > 50 && (
                      <tr>
                        <td colSpan={5} className="p-2.5 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          + {parsed.length - 50} more candidates in queue...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={parsed.length === 0 || uploading}
            onClick={handleUpload}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 cursor-pointer"
          >
            {uploading ? (
              <>
                <Spinner className="h-4 w-4 text-white" />
                <span>Importing {parsed.length} Candidates...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                <span>Import All {parsed.length} Students</span>
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
  rooms = [],
  onClose,
}: {
  student: StudentWithSession;
  rooms?: ExamRoom[];
  onClose: () => void;
}) {
  const config = STATUS_CONFIG[student.status];
  const StatusIcon = config.icon;
  const isFlagged = student.status === 'flagged';
  const matchedRoom = (rooms || []).find(
    (r) => r.id === student.room_id || r.room_code === student.room_id,
  );

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
                <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 dark:border-rose-900/80 dark:bg-rose-950/60 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>PROCTORING MALPRACTICE INCIDENT LOGGED</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <div className="rounded-lg bg-white/80 p-2.5 dark:bg-zinc-900/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        Exam Room Repository
                      </span>
                      <p className="mt-0.5 font-bold text-slate-900 dark:text-white truncate">
                        {matchedRoom ? `${matchedRoom.title} (${matchedRoom.room_code})` : (student.room_id || 'Departmental Unit Test')}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/80 p-2.5 dark:bg-zinc-900/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        Disqualification Status
                      </span>
                      <p className="mt-0.5 font-bold text-rose-700 dark:text-rose-400">
                        0% Score Credit (Disqualified)
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/80 p-2.5 dark:bg-zinc-900/80 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Violation Incident Reason
                    </span>
                    <p className="mt-0.5 font-semibold text-rose-900 dark:text-rose-300">
                      {student.flag_reason || 'Window minimization / Tab switching exceeded maximum 2-warning limit.'}
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



