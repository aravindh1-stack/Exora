import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Eye,
  X,
  Zap,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { matchStudentToRoom, fetchStudentResponses, type ExamResponseDetail } from '@/lib/queries';
import { initials, formatTimeAgo } from '@/lib/format';
import { safeStorage } from '@/lib/storage';

import { MyQuizzes } from './MyQuizzes';

type NavKey = 'dashboard' | 'quizzes' | 'performance' | 'profile';

interface StudentDashboardProps {
  student: StudentWithSession;
  rooms: ExamRoom[];
  questions?: Question[];
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
  questions = [],
  onStartExam,
  loading = false,
  onLogout,
}: StudentDashboardProps) {
  const [nav, setNav] = useState<NavKey>('dashboard');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResponses, setReviewResponses] = useState<ExamResponseDetail[]>([]);
  const [reviewRoom, setReviewRoom] = useState<ExamRoom | null>(null);

  // Student Dashboard Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('exora_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('exora_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Notification Popover & Persistence State
  const [notifOpen, setNotifOpen] = useState(false);
  const notifStorageKey = `exora_notif_read_${student.id}`;
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    return safeStorage.getJson<string[]>(notifStorageKey, []);
  });

  // 1. All active rooms matching candidate's department, year, semester
  const allEligibleRooms = useMemo(
    () => rooms.filter((r) => matchStudentToRoom(student, r) && r.status === 'active'),
    [rooms, student],
  );

  // 2. Pending active rooms that student has NOT completed yet
  const pendingRooms = useMemo(() => {
    return allEligibleRooms.filter((r) => {
      // Check if candidate completed this specific room session
      const isCompleted =
        student.status === 'completed' &&
        ((student as any).room_id === r.id || (student.session_id && allEligibleRooms.length === 1));
      return !isCompleted;
    });
  }, [allEligibleRooms, student]);

  const hasPendingQuiz = pendingRooms.length > 0;
  const hasHistory = student.status !== 'in_progress' && Boolean(student.session_id);

  // Dynamic Notification Items Feed
  const notifications = useMemo(() => {
    const list = [
      {
        id: 'n1',
        title: 'Session Authenticated',
        message: `Recently logged in on this device as ${student.name} (${student.register_no}).`,
        time: 'Just now',
        icon: ShieldCheck,
        iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      },
    ];

    if (pendingRooms.length > 0) {
      list.push({
        id: 'n2',
        title: 'Active Quiz Available',
        message: `You have ${pendingRooms.length} active department quiz (${pendingRooms[0]?.title || 'Pending Exam'}) live right now.`,
        time: '2m ago',
        icon: Zap,
        iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
      });
    } else {
      list.push({
        id: 'n2',
        title: 'All Quizzes Completed',
        message: 'You have completed all assigned department exams for this semester.',
        time: '5m ago',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      });
    }

    if (student.status === 'completed' && student.score > 0) {
      list.push({
        id: 'n3',
        title: 'Exam Score Recorded',
        message: `Achieved ${student.score}% overall score percentage in latest unit assessment.`,
        time: '12m ago',
        icon: Award,
        iconColor: 'text-brand-950 bg-brand-50 dark:bg-zinc-900 dark:text-white',
      });
    } else if (student.status === 'flagged') {
      list.push({
        id: 'n3',
        title: 'Proctoring Warning Alert',
        message: 'Exam session automatically flagged for window minimization or tab switching.',
        time: '10m ago',
        icon: Flag,
        iconColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
      });
    }

    return list;
  }, [student, pendingRooms]);

  // Calculate unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  // Mark all notifications as read & persist to safeStorage
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    safeStorage.setJson(notifStorageKey, allIds);
  };

  // Mark single notification as read & persist to safeStorage
  const handleMarkSingleRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      safeStorage.setJson(notifStorageKey, updated);
    }
  };

  async function handleOpenReviewModal(room?: ExamRoom) {
    if (!student.session_id) return;
    setReviewRoom(room || allEligibleRooms[0] || null);
    setReviewModalOpen(true);
    setReviewLoading(true);
    try {
      const data = await fetchStudentResponses(student.session_id);
      setReviewResponses(data);
    } catch (err) {
      console.error('Failed to load review responses', err);
    } finally {
      setReviewLoading(false);
    }
  }

  const metrics = [
    {
      label: 'Quizzes Attended',
      value: hasHistory ? '1' : '0',
      icon: BookOpen,
      tone: 'text-brand-950 dark:text-zinc-100',
      bg: 'bg-brand-50 dark:bg-zinc-900',
    },
    {
      label: 'Overall Score Percentage',
      value: hasHistory ? `${student.score}%` : '—',
      icon: Award,
      tone:
        hasHistory && student.score >= 60
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-brand-950 dark:text-zinc-100',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Completion Status',
      value:
        student.status === 'completed' && !hasPendingQuiz
          ? 'Completed All'
          : hasPendingQuiz
            ? 'Active Quiz Pending'
            : student.status === 'flagged'
              ? 'Flagged'
              : 'Enrolled',
      icon: CheckCircle2,
      tone:
        student.status === 'flagged'
          ? 'text-rose-700 dark:text-rose-400'
          : student.status === 'completed' && !hasPendingQuiz
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-brand-950 dark:text-zinc-100',
      bg:
        student.status === 'flagged'
          ? 'bg-rose-50 dark:bg-rose-950/40'
          : 'bg-brand-50 dark:bg-zinc-900',
    },
    {
      label: 'Pending Active Quizzes',
      value: String(pendingRooms.length),
      icon: Clock,
      tone: pendingRooms.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-brand-950 dark:text-zinc-100',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f8fa] text-brand-950 dark:bg-[#08090b] dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-200/70 bg-white dark:border-zinc-800/70 dark:bg-[#0a0b0d] md:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-brand-200/70 dark:border-zinc-800/70">
          <img
            src="/aarga-logo.png"
            alt="Aarga Logo"
            className="h-9 w-auto max-w-[120px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
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
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100/70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              title="Toggle Light / Dark Theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
            {/* Notification Bell Dropdown Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-xl border border-brand-200 bg-brand-50/70 p-2 text-brand-600 transition hover:bg-brand-100/70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-brand-200/80 bg-white p-4 shadow-elevated dark:border-zinc-800 dark:bg-[#0c0d10] z-50"
                  >
                    <div className="flex items-center justify-between border-b border-brand-100 pb-3 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-brand-950 dark:text-white" />
                        <h4 className="font-display text-xs font-bold text-brand-950 dark:text-white">
                          Notifications &amp; Activity Log
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-semibold text-brand-500 hover:text-brand-950 dark:text-zinc-400 dark:hover:text-white"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="rounded-lg p-1 text-brand-400 hover:bg-brand-50 hover:text-brand-950 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                      {notifications.map((n) => {
                        const Icon = n.icon;
                        const isRead = readNotifIds.includes(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleMarkSingleRead(n.id)}
                            className={`flex items-start gap-3 rounded-xl border p-3 transition cursor-pointer ${
                              isRead
                                ? 'border-brand-100/40 bg-slate-50/50 opacity-60 dark:border-zinc-800/40 dark:bg-zinc-950/30'
                                : 'border-brand-100/80 bg-brand-50/40 hover:bg-brand-50 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="text-xs font-bold text-brand-950 dark:text-white truncate">
                                  {n.title}
                                </h5>
                                <span className="text-[10px] text-brand-400 dark:text-zinc-500 shrink-0">
                                  {n.time}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-brand-600 dark:text-zinc-300">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setNav('profile')}
              className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 py-1 pl-1.5 pr-3 transition hover:bg-brand-100/80 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer"
              title="View Candidate Profile"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-950 text-[11px] font-bold text-white dark:bg-white dark:text-brand-950">
                {initials(student.name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-brand-950 dark:text-zinc-100">{student.name}</p>
                <p className="text-[10px] font-mono font-semibold text-brand-500 dark:text-zinc-400">
                  {student.register_no}
                </p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 px-5 py-6 md:px-8 md:py-8">
          {nav === 'quizzes' ? (
            <MyQuizzes
              student={student}
              rooms={rooms}
              onStartExam={onStartExam}
              onViewAnswers={handleOpenReviewModal}
            />
          ) : nav === 'performance' ? (
            <div className="panel-card space-y-6 p-6 dark:bg-[#0c0d10]">
              <h3 className="font-display text-lg font-bold text-brand-950 dark:text-white">
                Academic Performance &amp; Score Insights
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Highest Achieved Score
                  </span>
                  <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {hasHistory ? `${student.score}%` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Accuracy Rating
                  </span>
                  <p className="font-display text-2xl font-bold text-brand-950 dark:text-white">
                    {hasHistory ? (student.score >= 80 ? 'Distinction' : student.score >= 50 ? 'Passed' : 'Needs Work') : 'No Data'}
                  </p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Proctor Compliance
                  </span>
                  <p className="font-display text-2xl font-bold text-brand-950 dark:text-white">
                    {student.status === 'flagged' ? 'Incident Flagged' : '100% Compliant'}
                  </p>
                </div>
              </div>
            </div>
          ) : nav === 'profile' ? (
            <div className="panel-card space-y-6 p-6 dark:bg-[#0c0d10]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-100 pb-5 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-white dark:bg-white dark:text-brand-950 shadow-subtle">
                    <UserCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-brand-950 dark:text-white">
                      Student Profile &amp; Verification Details
                    </h3>
                    <p className="text-xs text-brand-500 dark:text-zinc-400">
                      Manage your session security and candidate identification
                    </p>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out Student Session</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Candidate Full Name
                  </span>
                  <p className="text-sm font-bold text-brand-950 dark:text-white">{student.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Student Identification Number (SIN NO)
                  </span>
                  <p className="font-mono text-sm font-bold text-brand-950 dark:text-white">{student.register_no}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Academic Department
                  </span>
                  <p className="text-sm font-bold text-brand-950 dark:text-white">{student.department}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                    Academic Year &amp; Semester
                  </span>
                  <p className="text-sm font-bold text-brand-950 dark:text-white">
                    Year {student.year} • Semester {student.semester}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
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

              {/* Dynamic Active Banner Workflow */}
              {hasPendingQuiz ? (
                /* CASE 1: Pending Active Quiz Banner (Prioritizes Latest Pending Quiz) */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border border-amber-500/20 bg-brand-950 p-6 shadow-elevated text-white sm:p-7 dark:border-amber-400/20 dark:bg-[#0c0d10]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                        New Exam Live for Your Department
                      </span>
                      <h3 className="font-display mt-3 text-lg font-bold text-white sm:text-xl">
                        {pendingRooms[0].title}
                      </h3>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/80">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Building className="h-3.5 w-3.5" /> {pendingRooms[0].department}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5" /> Year {pendingRooms[0].year} • Sem{' '}
                          {pendingRooms[0].semester}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5" /> {pendingRooms[0].duration_minutes} Mins
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartExam(pendingRooms[0])}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-950 shadow-subtle transition hover:bg-brand-50 active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
                    >
                      <span>Start Exam Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ) : hasHistory ? (
                /* CASE 2: All Assigned Exams Completed */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-950 p-6 shadow-elevated text-white sm:p-7 dark:border-emerald-500/30 dark:bg-[#0d1f17]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        You Have Completed All Assigned Exams!
                      </span>
                      <h3 className="font-display mt-3 text-xl font-bold text-white sm:text-2xl">
                        All departmental units for your semester are completed!
                      </h3>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-200/90">
                        <span className="font-bold text-white text-sm">
                          Latest Score: <span className="font-display text-emerald-400 font-extrabold text-base">{student.score}%</span>
                        </span>
                        <span>•</span>
                        <span>Status: {student.status === 'flagged' ? 'Flagged' : 'Passed'}</span>
                        <span>•</span>
                        <span>Submitted: {formatTimeAgo(student.completed_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenReviewModal()}
                      className="flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-950 shadow-subtle transition hover:bg-emerald-50 active:scale-[0.98] dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Submitted Answers</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* CASE 3: No Active Exams Assigned Right Now */
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
                          <th className="px-5 py-3.5 font-bold">Completion Timestamp</th>
                          <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-100 dark:divide-zinc-800/60">
                        <tr className="transition hover:bg-brand-50/60 dark:hover:bg-zinc-900/40">
                          <td className="px-5 py-4 font-bold text-brand-950 dark:text-zinc-100">
                            {allEligibleRooms[0]?.title || 'Department Unit Test'}
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
                          <td className="px-5 py-4 text-brand-400 dark:text-zinc-500 font-mono">
                            {formatTimeAgo(student.completed_at)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleOpenReviewModal()}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-900 shadow-subtle transition hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Answers</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Answer Key & Response Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="panel-card relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-elevated dark:bg-[#0c0d10]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4 dark:border-zinc-800">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Submitted Examination Review
                  </span>
                  <h3 className="font-display text-base font-bold text-brand-950 dark:text-white sm:text-lg">
                    {reviewRoom?.title || 'Department Unit Test'} — Answer Key &amp; Response Review
                  </h3>
                </div>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-lg p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-950 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Performance Summary Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                      Overall Achieved Score
                    </span>
                    <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {student.score}%
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                      Student SIN NO
                    </span>
                    <p className="font-mono text-xs font-bold text-brand-950 dark:text-zinc-200">
                      {student.register_no} ({student.name})
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                      Proctor Status
                    </span>
                    <p className="text-xs font-bold text-brand-950 dark:text-zinc-200">
                      {student.status === 'flagged' ? 'Flagged' : 'Verified'}
                    </p>
                  </div>
                </div>

                {reviewLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Spinner size={24} />
                    <p className="mt-3 text-xs font-medium text-brand-400 dark:text-zinc-500">
                      Loading submitted answer key details...
                    </p>
                  </div>
                ) : reviewResponses.length === 0 && questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="h-8 w-8 text-brand-300 dark:text-zinc-700" />
                    <p className="mt-3 text-xs font-medium text-brand-400 dark:text-zinc-500">
                      No response record found for this session.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(reviewResponses.length > 0 ? reviewResponses : []).map((resp, idx) => {
                      const q = resp.question;
                      if (!q) return null;
                      return (
                        <div
                          key={resp.id || idx}
                          className="rounded-2xl border border-brand-200/80 bg-white p-5 space-y-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-xs font-bold text-brand-950 dark:text-white">
                              Q{idx + 1}. {q.text}
                            </h4>
                            <span className="shrink-0 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                              {q.topic}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {q.options.map((opt, optIdx) => {
                              const isStudentSelected = resp.selected_index === optIdx;
                              const isCorrectAnswer = q.correct_index === optIdx;

                              let cardStyle =
                                'border-brand-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-brand-900 dark:text-zinc-200';
                              let badgeText = null;

                              if (isStudentSelected && isCorrectAnswer) {
                                cardStyle =
                                  'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold';
                                badgeText = '✓ Your Choice (Correct)';
                              } else if (isStudentSelected && !isCorrectAnswer) {
                                cardStyle =
                                  'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900/80 dark:bg-rose-950/60 dark:text-rose-200 font-bold';
                                badgeText = '✗ Your Choice (Incorrect)';
                              } else if (isCorrectAnswer) {
                                cardStyle =
                                  'border-emerald-300/80 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300';
                                badgeText = 'Correct Answer';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${cardStyle}`}
                                >
                                  <span>
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                  </span>
                                  {badgeText && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                      {badgeText}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4 dark:border-zinc-800">
                <span className="text-xs text-brand-400 dark:text-zinc-500 font-medium">
                  Verified by Exora Auto-Grading Engine
                </span>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl bg-brand-950 px-5 py-2.5 text-xs font-bold text-white shadow-subtle transition hover:bg-brand-800 dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
                >
                  Close Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
