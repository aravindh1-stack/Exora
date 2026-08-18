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
import { AdminLogin } from '@/components/AdminLogin';
import { PortalErrorBoundary } from '@/components/PortalErrorBoundary';
import { fetchQuestions, fetchStudentsWithSessions, fetchExamRooms } from '@/lib/queries';


import { safeStorage } from '@/lib/storage';

function App() {
  // Explicit Domain Routing:
  // Admin Console: adminatexora.aarga.org OR host containing 'admin' OR /admin OR ?mode=admin
  // Student Portal: exora.aarga.org OR any standard domain
  const isAdminPortal =
    window.location.hostname === 'adminatexora.aarga.org' ||
    window.location.hostname.startsWith('admin') ||
    window.location.hostname.includes('admin') ||
    window.location.pathname.startsWith('/admin') ||
    window.location.search.includes('mode=admin');



  // Root URL & exora-zeta.vercel.app default to Student Exam Portal
  const isStudentPortal = !isAdminPortal;

  // Admin Authentication State
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => {
    return safeStorage.getItem('exora_admin_authed') === 'true';
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

  const loadStudents = loadAllData;
  const loadQuestions = loadAllData;
  const loadRooms = loadAllData;


  function handleAdminLogout() {
    safeStorage.removeItem('exora_admin_authed');
    setIsAdminAuthed(false);
  }

  if (isStudentPortal) {
    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
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
          />
        </PortalErrorBoundary>
      </div>
    );
  }



  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
      {/* Crisp background grid */}
      <div className="pointer-events-none fixed inset-0 bg-grid-light bg-grid opacity-60 dark:bg-grid-dark dark:opacity-30" />

      {!isAdminAuthed ? (
        /* Admin Login Screen */
        <AdminLogin onSuccess={() => setIsAdminAuthed(true)} />
      ) : (
        /* Authenticated Admin Proctor Console */
        <div className="relative flex min-h-screen">
          <Sidebar
            active={section}
            onChange={setSection}
            studentCount={students.length}
            questionCount={questions.length}
            roomCount={rooms.length}
          />

          <div className="flex flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-pitch-950/80 md:px-8">
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

                <button className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-700 sm:flex">
                  <Search className="h-3.5 w-3.5" />
                  <span>Search console...</span>
                  <kbd className="rounded border border-slate-200 bg-white px-1 text-[10px] font-semibold text-slate-500 dark:border-zinc-700 dark:bg-pitch-900 dark:text-zinc-400">
                    ⌘K
                  </kbd>
                </button>

                <button className="relative rounded-lg border border-slate-200 bg-slate-100/70 p-2 text-slate-600 transition hover:bg-slate-200/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                </button>

                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/70 py-1 pl-1 pr-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                    AD
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      ece@quizportal
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Proctor Admin
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
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
      )}

      <MobileNav active={section} onChange={setSection} />
    </div>
  );
}

export default App;
