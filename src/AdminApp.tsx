import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  UserCircle,
  CheckCircle2,
  Zap,
  Award,
  Flag,
  X,
} from 'lucide-react';
import type { Section, Question, StudentWithSession, ExamRoom } from '@/lib/types';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Questions } from '@/components/Questions';
import { Students } from '@/components/Students';
import { Rooms } from '@/components/Rooms';
import { Reports } from '@/components/Reports';
import { AdminLogin } from '@/components/AdminLogin';
import { fetchQuestions, fetchStudentsWithSessions, fetchExamRooms } from '@/lib/queries';
import { safeStorage } from '@/lib/storage';

export function AdminApp() {
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => {
    return localStorage.getItem('exora_admin_authed') === 'true';
  });

  const [section, setSection] = useState<Section>('dashboard');
  const [students, setStudents] = useState<StudentWithSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('exora_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Admin Search Console Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Search Console Filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const res: { id: string; category: string; title: string; subtitle: string; action: () => void }[] = [];

    // 1. Console Sections
    (['dashboard', 'rooms', 'questions', 'students'] as Section[]).forEach((sec) => {
      if (sec.toLowerCase().includes(q)) {
        res.push({
          id: `sec-${sec}`,
          category: 'Console Navigation',
          title: `Switch to ${sec.toUpperCase()}`,
          subtitle: `Navigate directly to the ${sec} management view`,
          action: () => {
            setSection(sec);
            setSearchModalOpen(false);
            setSearchQuery('');
          },
        });
      }
    });

    // 2. Student Candidates
    students.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.register_no.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)) {
        res.push({
          id: `student-${s.id}`,
          category: 'Student Candidate',
          title: s.name,
          subtitle: `SIN: ${s.register_no} • ${s.department} (Year ${s.year})`,
          action: () => {
            setSection('students');
            setSearchModalOpen(false);
            setSearchQuery('');
          },
        });
      }
    });

    // 3. Exam Rooms
    rooms.forEach((r) => {
      if (r.title.toLowerCase().includes(q) || r.room_code.toLowerCase().includes(q) || r.department.toLowerCase().includes(q)) {
        res.push({
          id: `room-${r.id}`,
          category: 'Exam Room',
          title: r.title,
          subtitle: `Code: #${r.room_code} • ${r.department}`,
          action: () => {
            setSection('rooms');
            setSearchModalOpen(false);
            setSearchQuery('');
          },
        });
      }
    });

    // 4. Questions
    questions.forEach((quest) => {
      if (quest.text.toLowerCase().includes(q) || quest.topic.toLowerCase().includes(q)) {
        res.push({
          id: `q-${quest.id}`,
          category: 'Question Bank',
          title: quest.text,
          subtitle: `Topic: ${quest.topic} • Difficulty: ${quest.difficulty}`,
          action: () => {
            setSection('questions');
            setSearchModalOpen(false);
            setSearchQuery('');
          },
        });
      }
    });

    return res;
  }, [searchQuery, students, rooms, questions]);

  // Admin Profile Modal state
  const [adminProfileOpen, setAdminProfileOpen] = useState(false);

  // Admin Notification state & safeStorage Persistence
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);
  const adminNotifStorageKey = 'exora_admin_notif_read';
  const [readAdminNotifIds, setReadAdminNotifIds] = useState<string[]>(() => {
    return safeStorage.getJson<string[]>(adminNotifStorageKey, []);
  });

  const adminNotifications = useMemo(() => {
    const activeRoomsCount = rooms.filter((r) => r.status === 'active').length;
    const flaggedCount = students.filter((s) => s.status === 'flagged').length;

    return [
      {
        id: 'an1',
        title: 'Proctor Session Authenticated',
        message: 'Logged in as ece@quizportal with full system authority.',
        time: 'Just now',
        icon: ShieldCheck,
        iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      },
      {
        id: 'an2',
        title: 'Candidate Roster Synchronized',
        message: `${students.length} candidates currently enrolled across department rooms.`,
        time: '2m ago',
        icon: Zap,
        iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
      },
      {
        id: 'an3',
        title: 'Exam Rooms Telemetry',
        message: `${activeRoomsCount} active exam room(s) broadcasting SEB kiosk lockdown streams.`,
        time: '5m ago',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      },
      {
        id: 'an4',
        title: 'Proctor Incident Watch',
        message:
          flaggedCount > 0
            ? `${flaggedCount} candidate session(s) flagged for tab switches.`
            : 'All candidate sessions are 100% compliant with zero proctor flags.',
        time: '10m ago',
        icon: flaggedCount > 0 ? Flag : Award,
        iconColor:
          flaggedCount > 0
            ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400'
            : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      },
    ];
  }, [students, rooms]);

  const unreadAdminCount = useMemo(() => {
    return adminNotifications.filter((n) => !readAdminNotifIds.includes(n.id)).length;
  }, [adminNotifications, readAdminNotifIds]);

  const handleMarkAllAdminRead = () => {
    const allIds = adminNotifications.map((n) => n.id);
    setReadAdminNotifIds(allIds);
    safeStorage.setJson(adminNotifStorageKey, allIds);
  };

  const handleMarkSingleAdminRead = (id: string) => {
    if (!readAdminNotifIds.includes(id)) {
      const updated = [...readAdminNotifIds, id];
      setReadAdminNotifIds(updated);
      safeStorage.setJson(adminNotifStorageKey, updated);
    }
  };

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

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const data = await fetchStudentsWithSessions();
      setStudents(data);
    } catch (e) {
      console.error('Failed to load students', e);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (e) {
      console.error('Failed to load questions', e);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await fetchExamRooms();
      setRooms(data);
    } catch (e) {
      console.error('Failed to load exam rooms', e);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthed) {
      loadStudents();
      loadQuestions();
      loadRooms();
    }
  }, [isAdminAuthed, loadStudents, loadQuestions, loadRooms]);

  function handleAdminLogout() {
    localStorage.removeItem('exora_admin_authed');
    setIsAdminAuthed(false);
  }

  if (!isAdminAuthed) {
    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
        <div className="pointer-events-none fixed inset-0 bg-grid-light bg-grid opacity-60 dark:bg-grid-dark dark:opacity-30" />
        <AdminLogin onSuccess={() => setIsAdminAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-light bg-grid opacity-60 dark:bg-grid-dark dark:opacity-30" />

      <div className="relative flex min-h-screen">
        <Sidebar
          active={section}
          onChange={setSection}
          studentCount={students.length}
          questionCount={questions.length}
          roomCount={rooms.length}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-[#08090b]/85 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-black">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight text-slate-900 dark:text-white">
                  Exora Admin
                </span>
              </div>
              <span className="hidden text-xs font-semibold capitalize text-slate-400 dark:text-zinc-500 md:inline">
                Admin Console / {section}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Toggle Light / Dark Theme"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSearchModalOpen(true)}
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 sm:flex cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search console...</span>
                <kbd className="rounded border border-slate-200 bg-white px-1 text-[10px] font-semibold text-slate-500 dark:border-zinc-700 dark:bg-pitch-900 dark:text-zinc-400">
                  ⌘K
                </kbd>
              </button>

              {/* Admin Notification Bell Dropdown Popover */}
              <div className="relative">
                <button
                  onClick={() => setAdminNotifOpen(!adminNotifOpen)}
                  className="relative rounded-xl border border-slate-200 bg-slate-100/70 p-2 text-slate-600 transition hover:bg-slate-200/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Notifications & Activity Log"
                >
                  <Bell className="h-4 w-4" />
                  {unreadAdminCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                      {unreadAdminCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {adminNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-elevated dark:border-zinc-800 dark:bg-[#0c0d10] z-50"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-slate-900 dark:text-white" />
                          <h4 className="font-display text-xs font-bold text-slate-900 dark:text-white">
                            Proctor Telemetry &amp; Alerts
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadAdminCount > 0 && (
                            <button
                              onClick={handleMarkAllAdminRead}
                              className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={() => setAdminNotifOpen(false)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                        {adminNotifications.map((n) => {
                          const Icon = n.icon;
                          const isRead = readAdminNotifIds.includes(n.id);
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleMarkSingleAdminRead(n.id)}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition cursor-pointer ${
                                isRead
                                  ? 'border-slate-100/60 bg-slate-50/40 opacity-60 dark:border-zinc-800/40 dark:bg-zinc-950/30'
                                  : 'border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/60'
                              }`}
                            >
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconColor}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {n.title}
                                  </h5>
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                                    {n.time}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-300">
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

              {/* Clickable Admin Profile Avatar Pill */}
              <button
                onClick={() => setAdminProfileOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 py-1 pl-1 pr-3 transition hover:bg-slate-200/80 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer"
                title="View Admin Profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-black">
                  AD
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    ece@quizportal
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Proctor Admin
                  </p>
                </div>
              </button>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {section === 'dashboard' && (
                  <Dashboard
                    students={students}
                    questions={questions}
                    loading={loadingStudents || loadingQuestions}
                  />
                )}
                {section === 'rooms' && (
                  <Rooms
                    rooms={rooms}
                    students={students}
                    questions={questions}
                    loading={loadingRooms}
                    onReload={loadRooms}
                    onSelectRoomForQuestions={() => setSection('questions')}
                  />
                )}
                {section === 'questions' && (
                  <Questions
                    questions={questions}
                    rooms={rooms}
                    loading={loadingQuestions}
                    onReload={loadQuestions}
                  />
                )}
                {section === 'students' && (
                  <Students
                    students={students}
                    loading={loadingStudents}
                    onReload={loadStudents}
                  />
                )}
                {section === 'reports' && (
                  <Reports
                    students={students}
                    rooms={rooms}
                    loading={loadingStudents}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileNav active={section} onChange={setSection} />

      {/* Interactive Global Command Palette Search Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80 cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10]"
            >
              <div className="relative flex items-center border-b border-slate-100 pb-3 dark:border-zinc-800">
                <Search className="h-5 w-5 text-slate-400 dark:text-zinc-500 mr-3 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students, rooms, questions, or views (⌘K)..."
                  className="w-full text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent dark:text-white dark:placeholder:text-zinc-500"
                />
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
                {!searchQuery.trim() ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                    Type to search across candidates, exam rooms, questions, and console tabs...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No matching console items found for "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={item.action}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:bg-slate-100 cursor-pointer dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                            {item.category}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h5>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Profile & Session Security Modal */}
      <AnimatePresence>
        {adminProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminProfileOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-subtle">
                    <UserCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Proctor Admin Profile
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      System Administrator &amp; Room Controller
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAdminProfileOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Authenticated Admin Account
                  </span>
                  <p className="font-display mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    ece@quizportal
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400">Proctoring Controller Authority</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      System Authority
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">AES-256 Full Access</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Roster Control
                    </span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {rooms.length} Exam Rooms Active
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setAdminProfileOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAdminLogout}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out Admin Session</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
