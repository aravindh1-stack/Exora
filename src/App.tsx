import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Bell, Search, Sun, Moon, LogOut } from 'lucide-react';
import type { Section, Question, StudentWithSession, ExamRoom } from '@/lib/types';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Questions } from '@/components/Questions';
import { Students } from '@/components/Students';
import { Rooms } from '@/components/Rooms';
import { StudentPortal } from '@/components/StudentPortal';
import { LandingPage } from '@/components/LandingPage';
import { StudentAuth } from '@/components/StudentAuth';
import { AdminLogin } from '@/components/AdminLogin';

import { PortalErrorBoundary } from '@/components/PortalErrorBoundary';
import { fetchQuestions, fetchStudentsWithSessions, fetchExamRooms } from '@/lib/queries';
import { safeStorage } from '@/lib/storage';

type ViewMode = 'landing' | 'student_auth' | 'student_portal' | 'admin_login' | 'admin_console';

function App() {
  const hostname = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase();
  const pathname = (typeof window !== 'undefined' ? window.location.pathname : '').toLowerCase();
  const search = (typeof window !== 'undefined' ? window.location.search : '').toLowerCase();

  const isAdminDomain =
    hostname.includes('poweratex') ||
    hostname.includes('admin') ||
    pathname.startsWith('/admin') ||
    search.includes('mode=admin');

  // Admin Authentication State
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => {
    return safeStorage.getItem('exora_admin_authed') === 'true';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (isAdminDomain) {
      return safeStorage.getItem('exora_admin_authed') === 'true' ? 'admin_console' : 'admin_login';
    }
    const hasStudentReg = params.get('reg') || safeStorage.getItem('exora_session_reg');
    if (hasStudentReg) {
      return 'student_portal';
    }
    return 'landing';
  });

  const [section, setSection] = useState<Section>('dashboard');
  const [students, setStudents] = useState<StudentWithSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [appApiError, setAppApiError] = useState<string | null>(null);

  // Theme state: Default 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeStorage.getItem('exora_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeStorage.setItem('exora_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loadAllData = useCallback(async () => {
    setLoadingStudents(true);
    setLoadingQuestions(true);
    setLoadingRooms(true);
    setAppApiError(null);

    try {
      const [sData, qData, rData] = await Promise.all([
        fetchStudentsWithSessions(),
        fetchQuestions(),
        fetchExamRooms(),
      ]);
      setStudents(sData);
      setQuestions(qData);
      setRooms(rData);
    } catch (e: any) {
      console.error('Failed to load portal data', e);
      setAppApiError(e?.message || 'Failed to connect to backend database.');
    } finally {
      setLoadingStudents(false);
      setLoadingQuestions(false);
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const loadStudents = loadAllData;
  const loadQuestions = loadAllData;
  const loadRooms = loadAllData;

  function handleAdminLogout() {
    safeStorage.removeItem('exora_admin_authed');
    setIsAdminAuthed(false);
    setViewMode('admin_login');
  }

  // A. STRICT ADMIN DOMAIN ROUTING OVERRIDE (poweratex.aarga.org / admin routes)
  if (isAdminDomain) {
    if (!isAdminAuthed || viewMode === 'admin_login') {
      return (
        <AdminLogin
          onSuccess={() => {
            safeStorage.setItem('exora_admin_authed', 'true');
            setIsAdminAuthed(true);
            setViewMode('admin_console');
          }}
        />
      );
    }
  } else {
    // B. STUDENT PORTAL & PUBLIC LANDING ROUTING (exora.aarga.org)
    // 1. Public Landing View
    if (viewMode === 'landing') {
      return (
        <LandingPage
          onEnterPortal={() => setViewMode('student_auth')}
        />
      );
    }

    // 2. Student Authentication View
    if (viewMode === 'student_auth') {
      return (
        <StudentAuth
          existingStudents={students}
          onAuthSuccess={() => setViewMode('student_portal')}
          onBackToLanding={() => setViewMode('landing')}
        />
      );
    }

    // 3. Student Portal / Dashboard / Exam Workspace
    if (viewMode === 'student_portal') {
      return (
        <div className="relative min-h-screen bg-[#f7f8fa] text-brand-900 transition-colors duration-200 dark:bg-[#08090b] dark:text-zinc-100">
          <div className="pointer-events-none fixed inset-0 bg-grid-light bg-grid opacity-60 dark:bg-grid-dark dark:opacity-30" />
          <PortalErrorBoundary>
            <StudentPortal
              students={students}
              rooms={rooms}
              questions={questions}
              onExamSubmitted={loadAllData}
              apiError={appApiError}
              onRetryFetch={loadAllData}
              loading={loadingStudents || loadingQuestions || loadingRooms}
              onLogoutStudent={() => setViewMode('student_auth')}
            />
          </PortalErrorBoundary>
        </div>
      );
    }
  }

  // 5. Authenticated Admin Proctor Console
  return (
    <div className="relative min-h-screen bg-[#f7f8fa] text-brand-950 transition-colors duration-200 dark:bg-[#08090b] dark:text-zinc-100">
      {/* Crisp background grid */}
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
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-brand-200/70 bg-white/80 px-5 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-[#08090b]/80 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-950 text-white dark:bg-zinc-100 dark:text-black">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight text-brand-950 dark:text-white">
                  Exora Admin
                </span>
              </div>
              <span className="hidden text-xs font-semibold capitalize text-brand-400 dark:text-zinc-500 md:inline">
                Admin Console / {section}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/80 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

              <button className="hidden items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-1.5 text-xs text-brand-400 transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-700 sm:flex">
                <Search className="h-3.5 w-3.5" />
                <span>Search console...</span>
                <kbd className="rounded border border-brand-200 bg-white px-1 text-[10px] font-semibold text-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  ⌘K
                </kbd>
              </button>

              <button className="relative rounded-xl border border-brand-200 bg-brand-50/70 p-2 text-brand-600 transition hover:bg-brand-100/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 py-1 pl-1 pr-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-950 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                  AD
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold text-brand-950 dark:text-zinc-100">
                    ece@quizportal
                  </p>
                  <p className="text-[10px] text-brand-500 dark:text-zinc-400">
                    Proctor Admin
                  </p>
                </div>
              </div>

              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                title="Logout Admin"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
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
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileNav active={section} onChange={setSection} />
    </div>
  );
}

export default App;
