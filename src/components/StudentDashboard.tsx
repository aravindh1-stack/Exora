import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  UserCircle,
  Bell,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Flag,
  ShieldCheck,
  Building,
  Calendar,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { StudentWithSession, ExamRoom } from '@/lib/types';
import { matchStudentToRoom } from '@/lib/queries';
import { initials, formatTimeAgo } from '@/lib/format';

type NavKey = 'dashboard' | 'quizzes' | 'performance' | 'profile';

interface StudentDashboardProps {
  student: StudentWithSession;
  rooms: ExamRoom[];
  onStartExam: (room: ExamRoom) => void;
  loading?: boolean;
  onLogout?: () => void;
}

const NAV: { id: NavKey; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'quizzes', label: 'My Quizzes', icon: BookOpen },
  { id: 'performance', label: 'Performance & Stats', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export function StudentDashboard({
  student,
  rooms,
  onStartExam,
  loading = false,
  onLogout,
}: StudentDashboardProps) {
  const [nav, setNav] = useState<NavKey>('dashboard');

  const eligibleRooms = useMemo(
    () => rooms.filter((r) => matchStudentToRoom(student, r) && r.status === 'active'),
    [rooms, student],
  );

  const hasHistory = student.status !== 'in_progress' && student.session_id;

  const metrics = [
    {
      label: 'Quizzes Attended',
      value: hasHistory ? '1' : '0',
      icon: BookOpen,
      tone: 'text-brand-900 dark:text-zinc-100',
      bg: 'bg-brand-50 dark:bg-zinc-900',
    },
    {
      label: 'Overall Score Percentage',
      value: hasHistory ? `${student.score}%` : '—',
      icon: Award,
      tone:
        hasHistory && student.score >= 60
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-brand-900 dark:text-zinc-100',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Completion Status',
      value:
        student.status === 'completed'
          ? 'Completed'
          : student.status === 'flagged'
            ? 'Flagged'
            : 'Pending',
      icon: CheckCircle2,
      tone:
        student.status === 'flagged'
          ? 'text-rose-700 dark:text-rose-400'
          : student.status === 'completed'
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-brand-900 dark:text-zinc-100',
      bg:
        student.status === 'flagged'
          ? 'bg-rose-50 dark:bg-rose-950/40'
          : 'bg-brand-50 dark:bg-zinc-900',
    },
    {
      label: 'Pending Active Quizzes',
      value: String(eligibleRooms.length),
      icon: Clock,
      tone: eligibleRooms.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-brand-900 dark:text-zinc-100',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f8fa] text-brand-950 dark:bg-[#08090b] dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-200/70 bg-white dark:border-zinc-800/70 dark:bg-[#0a0b0d] md:flex">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-brand-100 dark:border-zinc-800/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-950 text-white dark:bg-white dark:text-brand-950 shadow-subtle">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display text-[15px] font-bold tracking-tight text-brand-950 dark:text-white">
              Exora Student
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
              Examination Portal
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-brand-300 dark:text-zinc-600">
            Navigation Menu
          </p>
          {NAV.map((item) => {
            const isActive = nav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-950 text-white dark:bg-zinc-100 dark:text-brand-950 shadow-subtle'
                    : 'text-brand-600 hover:bg-brand-50 hover:text-brand-950 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? 'text-white dark:text-brand-950' : 'text-brand-400 dark:text-zinc-500'}`}
                  strokeWidth={1.8}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pb-5 space-y-3">
          <div className="rounded-xl border border-brand-200/70 bg-brand-50/70 p-3.5 dark:border-zinc-800/70 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-brand-950 dark:text-zinc-200">
                Proctoring Active
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-normal text-brand-500 dark:text-zinc-400">
              Exam sessions are monitored for compliance and academic integrity.
            </p>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out Student</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-brand-200/70 bg-white/85 px-5 backdrop-blur-md dark:border-zinc-800/70 dark:bg-[#08090b]/85 md:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
              Authenticated Candidate
            </p>
            <h2 className="font-display text-sm font-bold text-brand-950 dark:text-white sm:text-base">
              {student.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative rounded-xl border border-brand-200 bg-brand-50/70 p-2 text-brand-600 transition hover:bg-brand-100/70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
              <Bell className="h-4 w-4" />
              {eligibleRooms.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>

            <div className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 py-1 pl-1.5 pr-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-950 text-[11px] font-bold text-white dark:bg-white dark:text-brand-950">
                {initials(student.name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-brand-950 dark:text-zinc-100">{student.name}</p>
                <p className="text-[10px] font-mono font-semibold text-brand-500 dark:text-zinc-400">
                  {student.register_no}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 md:hidden dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 space-y-6 px-5 py-6 md:px-8 md:py-8">
          {/* Candidate Profile Details Banner */}
          <div className="panel-card flex flex-wrap items-center justify-between gap-4 p-5 dark:bg-[#0c0d10]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-white dark:bg-white dark:text-brand-950 shadow-subtle">
                <UserCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-brand-950 dark:text-white">
                  {student.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-brand-500 dark:text-zinc-400">
                  <span className="font-mono font-bold text-brand-900 dark:text-zinc-200">
                    SIN: {student.register_no}
                  </span>
                  <span>•</span>
                  <span>{student.department}</span>
                  <span>•</span>
                  <span>Year {student.year} (Sem {student.semester})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Department Verified
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="panel-card rounded-2xl p-5 dark:bg-[#0c0d10]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                      {m.label}
                    </span>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${m.bg}`}>
                      <Icon className={`h-4 w-4 ${m.tone}`} strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className={`font-display mt-3 text-2xl font-bold ${m.tone}`}>{m.value}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Active Departmental Quiz Banner */}
          {eligibleRooms.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-brand-950/10 bg-brand-950 p-6 shadow-elevated dark:border-white/10 dark:bg-white sm:p-7"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white dark:bg-brand-950/10 dark:text-brand-950">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Exam Assigned to Your Department
                  </span>
                  <h3 className="font-display mt-3 text-lg font-bold text-white dark:text-brand-950 sm:text-xl">
                    {eligibleRooms[0].title}
                  </h3>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/80 dark:text-brand-950/80">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building className="h-3.5 w-3.5" /> {eligibleRooms[0].department}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5" /> Year {eligibleRooms[0].year} • Sem{' '}
                      {eligibleRooms[0].semester}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5" /> {eligibleRooms[0].duration_minutes} Mins
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onStartExam(eligibleRooms[0])}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-950 shadow-subtle transition hover:bg-brand-50 active:scale-[0.98] dark:bg-brand-950 dark:text-white dark:hover:bg-brand-800"
                >
                  <span>Start Exam Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="panel-card flex flex-col items-center justify-center rounded-2xl py-14 text-center dark:bg-[#0c0d10]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-zinc-900">
                <BookOpen className="h-6 w-6 text-brand-400 dark:text-zinc-500" />
              </div>
              <h3 className="font-display mt-3 text-sm font-bold text-brand-950 dark:text-white">
                No active exams assigned right now
              </h3>
              <p className="mt-1 max-w-sm text-xs text-brand-500 dark:text-zinc-400">
                When your department coordinator launches a new examination room for your academic year and semester, it will appear here automatically.
              </p>
            </div>
          )}

          {/* Examination Attempt History Table */}
          <div className="panel-card rounded-2xl p-0 overflow-hidden dark:bg-[#0c0d10]">
            <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4 dark:border-zinc-800">
              <div>
                <h3 className="font-display text-sm font-bold text-brand-950 dark:text-white">
                  Latest Examination Attempt
                </h3>
                <p className="mt-0.5 text-xs text-brand-400 dark:text-zinc-500">
                  Historical score logs and proctoring status for your profile.
                </p>
              </div>
              <Flag className="h-4 w-4 text-brand-300 dark:text-zinc-600" />
            </div>

            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded-lg" />
                ))}
              </div>
            ) : !hasHistory ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-8 w-8 text-brand-300 dark:text-zinc-700" />
                <p className="mt-3 text-xs font-medium text-brand-400 dark:text-zinc-500">
                  No completed examination attempts recorded yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-brand-100 text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:border-zinc-800 dark:text-zinc-500">
                      <th className="px-5 py-3.5 font-bold">Examination</th>
                      <th className="px-5 py-3.5 font-bold">Score Percentage</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 text-right font-bold">Completion Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-100 dark:divide-zinc-800/60">
                    <tr className="transition hover:bg-brand-50/60 dark:hover:bg-zinc-900/40">
                      <td className="px-5 py-4 font-bold text-brand-950 dark:text-zinc-100">
                        Department Unit Test
                      </td>
                      <td className="font-display px-5 py-4 text-sm font-bold text-brand-950 dark:text-white">
                        {student.score}%
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-bold ${
                            student.status === 'flagged'
                              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {student.status === 'flagged' ? (
                            <Flag className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {student.status === 'flagged' ? 'Flagged' : 'Attended'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-brand-400 dark:text-zinc-500 font-mono">
                        {formatTimeAgo(student.completed_at)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
