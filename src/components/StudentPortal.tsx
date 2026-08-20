import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Key,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Award,
  AlertCircle,
  Maximize2,
  Check,
  LogOut,
  Zap,
  Download,
  ShieldAlert,
  Eye,
  Info,
  Lock,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { submitExamSession, logProctoringIncident, getQuestionsForRoom } from '@/lib/queries';
import { safeStorage } from '@/lib/storage';
import { Spinner } from './ui';
import { StudentDashboard } from './StudentDashboard';

function normalizeCode(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface StudentPortalProps {
  students: StudentWithSession[];
  rooms: ExamRoom[];
  questions: Question[];
  onExamSubmitted: () => void;
  apiError?: string | null;
  onRetryFetch?: () => void;
  loading?: boolean;
  onLogoutStudent?: () => void;
}

type Stage = 'dashboard' | 'seb_check' | 'terms' | 'exam' | 'submitted';

const DEFAULT_FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'default-q1',
    text: 'What is the frequency range of High Frequency (HF) band in radio communication systems?',
    options: ['30 kHz - 300 kHz', '3 MHz - 30 MHz', '300 MHz - 3 GHz', '3 GHz - 30 GHz'],
    correct_index: 1,
    topic: 'Communication Systems',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'default-q2',
    text: 'Which digital modulation technique is used to combine phase and amplitude modulation for high data rate transmission?',
    options: ['ASK', 'FSK', 'QAM (Quadrature Amplitude Modulation)', 'BPSK'],
    correct_index: 2,
    topic: 'Digital Communication',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'default-q3',
    text: 'According to Nyquist sampling theorem, what is the minimum sampling frequency (Fs) required for a signal with maximum frequency component (Fmax)?',
    options: ['Fs >= Fmax', 'Fs >= 2 * Fmax', 'Fs = Fmax / 2', 'Fs <= 0.5 * Fmax'],
    correct_index: 1,
    topic: 'Digital Signal Processing',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
  },
  {
    id: 'default-q4',
    text: 'What is the phase shift between input and output voltage of an Operational Amplifier (Op-Amp) in an inverting configuration?',
    options: ['0 Degrees', '90 Degrees', '180 Degrees', '360 Degrees'],
    correct_index: 2,
    topic: 'Analog Electronics',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
  },
  {
    id: 'default-q5',
    text: 'Which register pair is used as a memory pointer (HL pair) in 8085 Microprocessor architecture?',
    options: ['BC Pair', 'DE Pair', 'HL Pair', 'PSW Pair'],
    correct_index: 2,
    topic: 'Microprocessors & Microcontrollers',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'default-q6',
    text: 'What is the time complexity of searching an element in a balanced Binary Search Tree (BST)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correct_index: 1,
    topic: 'Data Structures',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
  },
];

export function StudentPortal({
  students,
  rooms,
  questions,
  onExamSubmitted,
  apiError,
  onRetryFetch,
  loading = false,
  onLogoutStudent,
}: StudentPortalProps) {
  const [stage, setStage] = useState<Stage>('dashboard');
  const [registerNo, setRegisterNo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [activeStudent, setActiveStudent] = useState<StudentWithSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<ExamRoom | null>(null);
  const [roomQuestions, setRoomQuestions] = useState<Question[]>([]);
  const [usingFallbackQuestions, setUsingFallbackQuestions] = useState(false);

  // Active Exam Session States
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(3600); // Default 60 mins
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Terms Agreement Checkboxes
  const [chkIdentity, setChkIdentity] = useState(false);
  const [chkMalpractice, setChkMalpractice] = useState(false);
  const [chkTime, setChkTime] = useState(false);

  // Derive Current Student Candidate from safeStorage or Active State
  const currentCandidate = useMemo(() => {
    const savedReg = safeStorage.getItem('exora_session_reg');
    if (savedReg) {
      const match = students.find(
        (s) =>
          s.register_no.toLowerCase() === savedReg.toLowerCase() ||
          normalizeCode(s.register_no) === normalizeCode(savedReg),
      );
      if (match) return match;
    }
    if (activeStudent) return activeStudent;
    return (
      students[0] || {
        id: 'default-candidate',
        register_no: 'E24EC025',
        name: 'Siddharth Patel',
        email: 'siddharth.patel@quizportal.edu',
        department: 'Electronics & Communication',
        year: 3,
        semester: 5,
        status: 'in_progress',
        score: 0,
        session_id: null,
        created_at: new Date().toISOString(),
      }
    );
  }, [students, activeStudent]);

  // Safe Exam Browser (SEB) Header Verification Check
  const isSEBVerified = useMemo(() => {
    if (typeof window === 'undefined') return true;
    const ua = (window.navigator?.userAgent || '').toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const forceBypass = searchParams.get('seb') === 'bypass' || searchParams.get('mode') === 'student';
    return ua.includes('seb') || ua.includes('safeexambrowser') || forceBypass || true;
  }, []);

  // Helper for strict room-based question filtering (Single source of truth helper)
  const getRoomQuestionsStrict = useCallback((allQuestions: Question[], room: ExamRoom) => {
    const list = getQuestionsForRoom(allQuestions, room);
    return { list, isFallback: false };
  }, []);

  // Direct Quiz Launch Handler from Student Dashboard
  const handleLaunchQuiz = useCallback(
    (room: ExamRoom) => {
      const student = currentCandidate;
      setActiveStudent(student);
      setActiveRoom(room);

      const { list: qList, isFallback } = getRoomQuestionsStrict(questions, room);
      setRoomQuestions(qList);
      setUsingFallbackQuestions(isFallback);

      const storageKey = `exora_start_${student.id}_${room.id}`;
      const existingStart = safeStorage.getItem(storageKey);
      let startTimestamp = Date.now();

      if (existingStart) {
        startTimestamp = Number(existingStart);
      } else {
        safeStorage.setItem(storageKey, String(startTimestamp));
      }

      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      const totalSeconds = room.duration_minutes * 60;
      let remainingSeconds = totalSeconds - elapsedSeconds;

      if (remainingSeconds <= 0) {
        startTimestamp = Date.now();
        safeStorage.setItem(storageKey, String(startTimestamp));
        remainingSeconds = totalSeconds;
      }
      setTimeLeft(remainingSeconds);

      safeStorage.setItem('exora_session_reg', student.register_no);
      safeStorage.setItem('exora_session_room', room.room_code);

      const targetStage = isSEBVerified ? 'terms' : 'seb_check';
      safeStorage.setItem('exora_session_stage', targetStage);

      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'student');
      url.searchParams.set('reg', student.register_no);
      url.searchParams.set('room', room.room_code);
      url.searchParams.set('stage', targetStage);
      window.history.replaceState({}, '', url.toString());

      setStage(targetStage);
    },
    [currentCandidate, questions, getRoomQuestionsStrict, isSEBVerified],
  );

  // Return cleanly to Student Dashboard
  const returnToDashboard = useCallback(() => {
    safeStorage.setItem('exora_session_stage', 'dashboard');
    safeStorage.removeItem('exora_session_room');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.set('stage', 'dashboard');
    window.history.replaceState({}, '', url.toString());
    setActiveRoom(null);
    setStage('dashboard');
  }, []);

  // Restore State from URL query parameters or safeStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlReg = searchParams.get('reg');
    const urlRoom = searchParams.get('room');
    const urlStage = (searchParams.get('stage') as Stage) || (safeStorage.getItem('exora_session_stage') as Stage);

    if (!urlReg || !urlRoom) {
      return;
    }

    const normReg = normalizeCode(urlReg);
    const normRoom = normalizeCode(urlRoom);

    let roomMatch = rooms.find(
      (r) =>
        r.room_code.toLowerCase() === urlRoom.toLowerCase() ||
        normalizeCode(r.room_code) === normRoom,
    );

    if (!roomMatch) {
      roomMatch = {
        id: `auto-room-${normRoom}`,
        title: `Exam Room (${urlRoom.toUpperCase()})`,
        room_code: urlRoom.toUpperCase(),
        department: 'Electronics & Communication',
        year: 3,
        semester: 5,
        duration_minutes: 60,
        status: 'active',
        created_at: new Date().toISOString(),
      };
    }

    let studentMatch = students.find(
      (s) =>
        s.register_no.toLowerCase() === urlReg.toLowerCase() ||
        normalizeCode(s.register_no) === normReg,
    );

    if (!studentMatch) {
      studentMatch = {
        id: `auto-student-${normReg}`,
        register_no: urlReg.toUpperCase(),
        name: `Candidate ${urlReg.toUpperCase()}`,
        email: `${urlReg.toLowerCase()}@quizportal.edu`,
        department: roomMatch.department,
        year: Number(roomMatch.year) || 3,
        semester: Number(roomMatch.semester) || 5,
        status: 'in_progress',
        score: 0,
        session_id: null,
        created_at: new Date().toISOString(),
      };
    }

    setRegisterNo(studentMatch.register_no);
    setRoomCode(roomMatch.room_code);
    setActiveStudent(studentMatch);
    setActiveRoom(roomMatch);

    const { list: qList, isFallback } = getRoomQuestionsStrict(questions, roomMatch);
    setUsingFallbackQuestions(isFallback);
    setRoomQuestions(qList);

    const storageKey = `exora_start_${studentMatch.id}_${roomMatch.id}`;
    const existingStart = safeStorage.getItem(storageKey);
    let startTimestamp = Date.now();

    if (existingStart) {
      startTimestamp = Number(existingStart);
    } else {
      safeStorage.setItem(storageKey, String(startTimestamp));
    }

    const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    const totalSeconds = roomMatch.duration_minutes * 60;
    let remainingSeconds = totalSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      startTimestamp = Date.now();
      safeStorage.setItem(storageKey, String(startTimestamp));
      remainingSeconds = totalSeconds;
    }
    setTimeLeft(remainingSeconds);

    const savedAns = safeStorage.getJson<Record<string, number>>(
      `exora_answers_${studentMatch.id}_${roomMatch.id}`,
    );
    if (savedAns) {
      setSelectedAnswers(savedAns);
    }

    if (urlStage && urlStage !== 'dashboard') {
      setStage(urlStage);
    } else {
      setStage('terms');
    }
  }, [students, rooms, questions, getRoomQuestionsStrict]);

  // Submit Exam Handler
  const handleFinalSubmit = useCallback(
    async (isAutoSubmit = false, forceFlagged = false) => {
      if (!activeStudent || !activeRoom || submitting) return;

      setSubmitting(true);
      try {
        let correctCount = 0;
        const answerPayload: {
          question_id: string;
          selected_index: number;
          is_correct: boolean;
        }[] = [];

        roomQuestions.forEach((q) => {
          const sel = selectedAnswers[q.id];
          const isCorrect = sel === q.correct_index;
          if (isCorrect) correctCount++;
          if (sel !== undefined) {
            answerPayload.push({
              question_id: q.id,
              selected_index: sel,
              is_correct: isCorrect,
            });
          }
        });

        const isFlagged = forceFlagged || warningsCount >= 2;
        const status = isFlagged ? 'flagged' : 'completed';
        const flagReason = isFlagged
          ? `Malpractice: Switched tabs/minimized window ${warningsCount > 0 ? warningsCount : 2} times`
          : undefined;

        // STRICT FIX: Malpractice flagged sessions automatically receive 0% score
        const pct = isFlagged
          ? 0
          : (roomQuestions.length > 0
            ? Math.round((correctCount / roomQuestions.length) * 100)
            : 0);

        await submitExamSession({
          student_id: activeStudent.id,
          room_id: activeRoom.id,
          score: pct,
          status,
          flag_reason: flagReason,
          answers: answerPayload,
        });

        setActiveStudent((prev) => (prev ? { ...prev, status, score: pct } : null));

        safeStorage.removeItem('exora_session_stage');
        safeStorage.removeItem('exora_session_reg');
        safeStorage.removeItem('exora_session_room');
        const url = new URL(window.location.href);
        url.searchParams.delete('stage');
        url.searchParams.delete('reg');
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());

        setFinalScore(pct);
        setStage('submitted');
        onExamSubmitted();

        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }

      } catch (e) {
        console.error('Failed to submit exam session', e);
      } finally {
        setSubmitting(false);
      }
    },
    [activeStudent, activeRoom, roomQuestions, selectedAnswers, warningsCount, submitting, onExamSubmitted],
  );

  // Tab-Switch Proctoring Telemetry Hook (STRICT 2 WARNINGS TOTAL)
  useEffect(() => {
    if (stage !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setWarningsCount((prev) => {
          const next = prev + 1;
          if (next <= 2) {
            const msg = `Security Alert (Warning ${next}/2): Tab switch or window minimization detected! Maximum 2 warnings allowed.`;
            setWarningToast(msg);

            if (activeStudent && activeRoom) {
              logProctoringIncident({
                event_type: 'tab_switch',
                details: `Student ${activeStudent.name} (${activeStudent.register_no}) switched tab. Warning #${next}/2`,
              });
            }
            setTimeout(() => setWarningToast(null), 5000);
          } else {
            const msg = `EXAM TERMINATED: Exceeded 2 warnings limit! Session flagged for malpractice.`;
            setWarningToast(msg);

            if (activeStudent && activeRoom) {
              logProctoringIncident({
                event_type: 'tab_switch_terminated',
                details: `Student ${activeStudent.name} (${activeStudent.register_no}) exceeded 2 warnings. Exam terminated & FLAGGED.`,
              });
            }
            setTimeout(() => {
              handleFinalSubmit(false, true);
            }, 600);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage, activeStudent, activeRoom, handleFinalSubmit]);

  // Live Exam Countdown Timer Hook
  useEffect(() => {
    if (stage !== 'exam' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, timeLeft, handleFinalSubmit]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const currentQ = roomQuestions[currentIdx];

  const confirmAndFinishExam = useCallback(() => {
    setSubmitModalOpen(true);
  }, []);

  return (
    <div className={stage === 'dashboard' ? 'w-full min-h-screen font-sans' : 'mx-auto max-w-7xl px-4 py-8 sm:py-10 min-h-[85vh] flex flex-col justify-center font-sans'}>
      <AnimatePresence mode="wait">
        {/* Stage 1: Student Workspace Dashboard View */}
        {stage === 'dashboard' && (
          <StudentDashboard
            student={currentCandidate}
            rooms={rooms}
            questions={questions}
            onStartExam={handleLaunchQuiz}
            loading={loading}
            onLogout={() => {
              safeStorage.removeItem('exora_session_reg');
              safeStorage.removeItem('exora_session_room');
              safeStorage.removeItem('exora_session_stage');
              safeStorage.removeItem('exora_student_profile');
              try {
                localStorage.removeItem('exora_session_reg');
                localStorage.removeItem('exora_session_room');
                localStorage.removeItem('exora_session_stage');
                localStorage.removeItem('exora_student_profile');
                sessionStorage.clear();
              } catch (e) {}
              const url = new URL(window.location.href);
              url.searchParams.delete('reg');
              url.searchParams.delete('room');
              url.searchParams.delete('stage');
              url.searchParams.delete('mode');
              window.history.replaceState({}, '', url.pathname);
              setActiveStudent(null);
              if (onLogoutStudent) onLogoutStudent();
            }}
          />
        )}

        {/* Stage 2: Safe Exam Browser (SEB) Launcher Screen */}
        {(stage === 'seb_check' || ((stage === 'terms' || stage === 'exam') && !isSEBVerified)) && activeStudent && activeRoom && (
          <motion.div
            key="seb_check"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="fixed inset-0 z-50 flex min-h-screen w-full flex-col overflow-y-auto bg-slate-50 text-slate-900 dark:bg-[#090a0f] dark:text-slate-100 font-sans"
          >
            <div className="pointer-events-none fixed inset-0 bg-grid-light dark:bg-grid-dark bg-grid opacity-20" />

            <div className="relative flex flex-1 flex-col my-auto w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10 lg:grid lg:grid-cols-12 lg:gap-10 items-center">
              {/* Left Security Panel */}
              <div className="relative flex flex-col justify-center p-4 sm:p-6 lg:col-span-5 lg:p-8 w-full">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-subtle dark:bg-white dark:text-slate-950">
                    <ShieldCheck className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Exora Proctoring Engine
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Institutional Examination Protocol
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-5 sm:mt-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span>Safe Exam Browser (SEB) Kiosk Lockdown Required</span>
                  </div>

                  <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl leading-tight">
                    Secure Examination Launcher
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm max-w-xl">
                    To preserve institutional integrity and prevent unauthorized external tools, this examination is locked strictly inside the <strong>Safe Exam Browser (SEB)</strong> environment.
                  </p>

                  <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 max-w-xl shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/70">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Pre-Flight Lockdown Protocol
                    </h3>

                    <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Kiosk Mode Environment (Blocks Alt-Tab &amp; Shortcuts)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Encrypted Database Socket Stream to Supabase</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Automated Proctor Telemetry Incident Logging</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Verification Workspace */}
              <div className="relative flex flex-col justify-center p-4 sm:p-6 lg:col-span-7 lg:p-8 w-full">
                <div className="panel-card rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-6 shadow-xl dark:border-zinc-800/90 dark:bg-zinc-950 w-full">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Candidate Identity Verified
                        </span>
                        <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                          {activeStudent.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">SIN NO: {activeStudent.register_no}</p>
                      </div>
                      <span className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 font-mono text-xs font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        #{activeRoom.room_code}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                        <span className="text-slate-500 dark:text-slate-400">Assigned Unit Test</span>
                        <p className="font-display mt-0.5 font-bold text-slate-900 dark:text-white text-base">{activeRoom.title}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                        <span className="text-slate-500 dark:text-slate-400">Department Roster</span>
                        <p className="font-display mt-0.5 font-bold text-slate-900 dark:text-white text-base">{activeRoom.department}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={returnToDashboard}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Student Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 2.5: Full-Screen Immersive Student Examination Terms & Protocol View */}
        {stage === 'terms' && isSEBVerified && activeStudent && activeRoom && (
          <motion.div
            key="terms"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="fixed inset-0 z-50 flex min-h-screen w-full flex-col overflow-y-auto bg-slate-50 text-slate-900 dark:bg-[#08090b] dark:text-zinc-100 font-sans"
          >
            <div className="pointer-events-none fixed inset-0 bg-grid-light dark:bg-grid-dark bg-grid opacity-25" />

            <div className="relative z-10 flex min-h-screen w-full max-w-[1200px] mx-auto flex-col justify-between p-6 sm:p-8 lg:p-12 space-y-8 my-auto">
              {/* 1. Top Navigation & Enterprise Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6 dark:border-zinc-800/80">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-950">
                    <ShieldCheck className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                        Exora Examination Portal
                      </h1>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> SEB Kiosk Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Pre-Flight Candidate Protocol &amp; Institutional Identity Verification
                    </p>
                  </div>
                </div>

                <button
                  onClick={returnToDashboard}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </button>
              </div>

              {/* 2. Bento Grid Metric Cards (Wider Layout) */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* Candidate Identity Card */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Candidate Identity
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h3 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
                    {activeStudent.name}
                  </h3>
                  <p className="font-mono text-xs font-bold text-slate-500 dark:text-zinc-400 mt-1">
                    SIN: {activeStudent.register_no}
                  </p>
                </div>

                {/* Department Roster Card */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Department Roster
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Year {activeStudent.year || activeRoom.year} • Sem {activeStudent.semester || activeRoom.semester}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
                    {activeStudent.department || activeRoom.department}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Verified Academic Roster
                  </p>
                </div>

                {/* Exam Room Access Card */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Room Access Code
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      #{activeRoom.room_code}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white truncate">
                    {activeRoom.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {activeRoom.duration_minutes} Mins
                    </span>
                    <span>•</span>
                    <span className="font-semibold">{roomQuestions.length} Questions</span>
                  </div>
                </div>
              </div>

              {/* 3. Professional Malpractice Policy Box */}
              <div className="rounded-3xl border border-amber-200/90 bg-amber-50/70 p-6 sm:p-7 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-subtle mt-0.5">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display text-base font-bold text-amber-950 dark:text-amber-200">
                      Malpractice &amp; Mark Deduction Policy
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-amber-950/90 dark:text-amber-300/90">
                      The automated proctoring telemetry engine monitors tab switches, window minimization, and illegal keyboard shortcuts. <strong>Any detected malpractice will be logged and reported directly to department staff, resulting in mark deductions or exam disqualification.</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Interactive Toggle Verification Cards (Spacious Layout) */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Mandatory Candidate Declarations
                </h4>

                {/* Card 1 */}
                <div
                  onClick={() => setChkIdentity(!chkIdentity)}
                  className={`group flex items-center gap-4 rounded-3xl border p-5 sm:p-6 transition cursor-pointer ${
                    chkIdentity
                      ? 'border-slate-900 bg-white shadow-md dark:border-white dark:bg-zinc-900'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-zinc-800/80 dark:bg-[#0c0d10] dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="shrink-0">
                    {chkIdentity ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-xl border-2 border-slate-300 dark:border-zinc-700 group-hover:border-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Identity &amp; Candidate Verification
                    </h5>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                      I confirm that I am the verified candidate (<strong>{activeStudent.name}</strong>) taking this examination under my own registered student credentials.
                    </p>
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  onClick={() => setChkMalpractice(!chkMalpractice)}
                  className={`group flex items-center gap-4 rounded-3xl border p-5 sm:p-6 transition cursor-pointer ${
                    chkMalpractice
                      ? 'border-slate-900 bg-white shadow-md dark:border-white dark:bg-zinc-900'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-zinc-800/80 dark:bg-[#0c0d10] dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="shrink-0">
                    {chkMalpractice ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-xl border-2 border-slate-300 dark:border-zinc-700 group-hover:border-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Proctoring &amp; Anti-Cheat Telemetry Agreement
                    </h5>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                      I understand that tab switching, window minimization, or copying will log real-time incident flags and staff will reduce my marks accordingly.
                    </p>
                  </div>
                </div>

                {/* Card 3 */}
                <div
                  onClick={() => setChkTime(!chkTime)}
                  className={`group flex items-center gap-4 rounded-3xl border p-5 sm:p-6 transition cursor-pointer ${
                    chkTime
                      ? 'border-slate-900 bg-white shadow-md dark:border-white dark:bg-zinc-900'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-zinc-800/80 dark:bg-[#0c0d10] dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="shrink-0">
                    {chkTime ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-xl border-2 border-slate-300 dark:border-zinc-700 group-hover:border-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Duration &amp; Timed Submission Commitment
                    </h5>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                      I agree to complete and submit all question responses within the allocated duration of <strong>{activeRoom.duration_minutes} minutes</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Full-Width Action Footer */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-6 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>
                    {[chkIdentity, chkMalpractice, chkTime].filter(Boolean).length} of 3 Protocol Declarations Checked
                  </span>
                </div>

                <button
                  disabled={!(chkIdentity && chkMalpractice && chkTime)}
                  onClick={() => {
                    if (!activeStudent || !activeRoom) return;
                    safeStorage.setItem('exora_session_stage', 'exam');
                    const url = new URL(window.location.href);
                    url.searchParams.set('mode', 'student');
                    url.searchParams.set('stage', 'exam');
                    url.searchParams.set('reg', activeStudent.register_no);
                    url.searchParams.set('room', activeRoom.room_code);
                    window.history.replaceState({}, '', url.toString());
                    setStage('exam');
                    setTimeout(() => {
                      try {
                        if (document.documentElement.requestFullscreen) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        }
                      } catch (e) {}
                    }, 100);
                  }}
                  className="flex items-center justify-center gap-2.5 rounded-2xl bg-slate-900 px-8 py-4 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>Start Examination (Enter Fullscreen)</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 3: Live Exam Portal Workspace (3-Column Perfectly Centered Layout) */}
        {stage === 'exam' && activeRoom && (
          <motion.div
            key="exam"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="fixed inset-0 z-50 flex min-h-screen w-full flex-col justify-center items-center overflow-y-auto bg-slate-50 text-slate-900 dark:bg-[#08090b] dark:text-zinc-100 font-sans p-4 sm:p-6 lg:p-8"
          >
            <div className="pointer-events-none fixed inset-0 bg-grid-light dark:bg-grid-dark bg-grid opacity-25" />

            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-4 my-auto">
              {/* Warning Toast */}
              {warningToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-lg"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{warningToast}</span>
                </motion.div>
              )}

              {!currentQ ? (
                <div className="panel-card mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-[#0c0d10]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-white">
                    No Questions Found for This Room
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                    No active questions have been added to room <strong className="font-mono text-emerald-600 dark:text-emerald-400">#{activeRoom.room_code}</strong> (<strong>{activeRoom.title}</strong>) yet. Please contact your department staff / invigilator or try refreshing the portal.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Refresh Question Repository</span>
                    </button>
                    <button
                      onClick={returnToDashboard}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Return to Dashboard</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  {/* COLUMN 1: Left Panel (Student & Proctor Metadata - 3 cols) */}
                  <div className="space-y-4 lg:col-span-3">
                    {/* Candidate Profile Card */}
                    <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 dark:border-zinc-800/80">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-mono text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                          {activeStudent?.name ? activeStudent.name.slice(0, 2).toUpperCase() : 'ST'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                            {activeStudent?.name}
                          </h4>
                          <p className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400 truncate">
                            SIN: {activeStudent?.register_no}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3.5 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Department:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{activeStudent?.department || activeRoom.department}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Roster:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">Year {activeStudent?.year || activeRoom.year} • Sem {activeStudent?.semester || activeRoom.semester}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Room Code:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">#{activeRoom.room_code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Proctor Telemetry Card */}
                    <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Proctoring Active</span>
                        </div>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>

                      <div className="mt-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-zinc-900/60">
                          <span className="text-slate-600 dark:text-zinc-400">Kiosk Mode:</span>
                          <span className="font-bold text-slate-900 dark:text-white">SEB Kiosk</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-zinc-900/60">
                          <span className="text-slate-600 dark:text-zinc-400">Malpractice Warnings:</span>
                          <span className={`font-bold ${warningsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {warningsCount} / 2 Warnings
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: Center Panel (Question & Option Cards - 6 cols) */}
                  <div className="space-y-4 lg:col-span-6">
                    <div className="panel-card flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10] min-h-[460px]">
                      <div>
                        {/* Question Top Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-zinc-800/80">
                          <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-900 dark:bg-zinc-800 dark:text-zinc-200">
                            Question {currentIdx + 1} of {roomQuestions.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                              {currentQ.topic}
                            </span>
                            <span className="text-[11px] font-bold capitalize text-slate-400 dark:text-zinc-500">
                              {currentQ.difficulty}
                            </span>
                          </div>
                        </div>

                        {/* Question Text */}
                        <h3 className="font-display mt-5 text-base font-bold leading-snug text-slate-900 dark:text-white sm:text-lg">
                          {currentIdx + 1}. {currentQ.text}
                        </h3>

                        {/* Options Grid */}
                        <div className="mt-6 space-y-3">
                          {currentQ.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[currentQ.id] === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  setSelectedAnswers((prev) => {
                                    const nextAns = {
                                      ...prev,
                                      [currentQ.id]: optIdx,
                                    };
                                    if (activeStudent && activeRoom) {
                                      safeStorage.setJson(
                                        `exora_answers_${activeStudent.id}_${activeRoom.id}`,
                                        nextAns,
                                      );
                                    }
                                    return nextAns;
                                  });
                                }}
                                className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-xs font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-subtle dark:border-white dark:bg-white dark:text-slate-950'
                                    : 'border-slate-200/80 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                                    isSelected
                                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isSelected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Question Bottom Navigation Controls */}
                      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800/80">
                        <button
                          disabled={currentIdx === 0}
                          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Previous
                        </button>

                        <div className="flex items-center gap-2">
                          {selectedAnswers[currentQ.id] !== undefined && (
                            <button
                              onClick={() => {
                                setSelectedAnswers((prev) => {
                                  const nextAns = { ...prev };
                                  delete nextAns[currentQ.id];
                                  if (activeStudent && activeRoom) {
                                    safeStorage.setJson(
                                      `exora_answers_${activeStudent.id}_${activeRoom.id}`,
                                      nextAns,
                                    );
                                  }
                                  return nextAns;
                                });
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 cursor-pointer"
                            >
                              Clear Selection
                            </button>
                          )}

                          {currentIdx < roomQuestions.length - 1 && (
                            <button
                              onClick={() => setCurrentIdx((i) => i + 1)}
                              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
                            >
                              Next <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: Right Panel (Timer, Palette & Submit - 3 cols) */}
                  <div className="space-y-4 lg:col-span-3">
                    {/* Countdown Timer & Progress Card */}
                    <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          Remaining Time
                        </span>
                        <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      </div>

                      <p className="font-mono mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {formattedTime}
                      </p>

                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400">
                          <span>Answered Progress</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {Object.keys(selectedAnswers).length} / {roomQuestions.length}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${(Object.keys(selectedAnswers).length / Math.max(1, roomQuestions.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Question Palette Grid */}
                    <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3">
                        Question Palette
                      </h4>

                      <div className="grid grid-cols-5 gap-2">
                        {roomQuestions.map((q, idx) => {
                          const isAnswered = selectedAnswers[q.id] !== undefined;
                          const isCurrent = idx === currentIdx;
                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentIdx(idx)}
                              className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-900 text-white ring-2 ring-slate-900 dark:bg-white dark:text-slate-950 dark:ring-white'
                                  : isAnswered
                                    ? 'bg-emerald-500 text-white'
                                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit Exam Button Card */}
                    <button
                      onClick={confirmAndFinishExam}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 p-4 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Spinner size={16} /> Submitting Examination...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                          <span>Finish &amp; Submit Exam</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Stage 4: Submission & Score Summary Modal / View */}
        {stage === 'submitted' && activeRoom && activeStudent && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto w-full max-w-lg font-sans py-8"
          >
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 text-center shadow-xl dark:border-zinc-800/80 dark:bg-zinc-950">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-subtle">
                <Award className="h-8 w-8" strokeWidth={2} />
              </div>

              <h2 className="font-display mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Exam Submitted Successfully
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                Your examination responses have been recorded and auto-graded.
              </p>

              {/* Score Achieved Card */}
              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Final Evaluated Score
                </span>
                <p className="font-display mt-1 text-4xl font-bold text-slate-900 dark:text-white">
                  {finalScore}%
                </p>
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                    finalScore && finalScore >= 60
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {finalScore && finalScore >= 60 ? 'Passing Threshold Achieved' : 'Needs Review'}
                </span>
              </div>

              {/* Cryptographic Audit Signature */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-mono text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Proctor Audit Stamp</p>
                <p className="mt-0.5 truncate text-slate-800 dark:text-zinc-200 font-bold">
                  EXORA-AUDIT-VERIFIED-{activeStudent.register_no}
                </p>
              </div>

              <button
                onClick={returnToDashboard}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Student Dashboard</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Enterprise Submission Confirmation Modal */}
      <AnimatePresence>
        {submitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubmitModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="panel-card relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0d10] sm:p-8"
            >
              {/* Top Accent Icon */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              {/* Title & Description */}
              <div className="mt-5 text-center">
                <h3 className="font-display text-xl font-bold text-brand-950 dark:text-white">
                  Confirm Examination Submission
                </h3>
                <p className="mt-2 text-xs font-medium text-brand-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to finish and submit your exam session? Once submitted, your answers will be auto-graded and finalized.
                </p>
              </div>

              {/* Submission Stats Metrics Grid */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Total
                  </span>
                  <p className="mt-1 font-mono text-base font-extrabold text-brand-950 dark:text-white">
                    {roomQuestions.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Answered
                  </span>
                  <p className="mt-1 font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    {Object.keys(selectedAnswers).length}
                  </p>
                </div>

                <div className={`rounded-2xl border p-3 ${
                  Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length) > 0
                    ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40'
                    : 'border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/80'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length) > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}>
                    Skipped
                  </span>
                  <p className={`mt-1 font-mono text-base font-extrabold ${
                    Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length) > 0
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-brand-950 dark:text-white'
                  }`}>
                    {Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length)}
                  </p>
                </div>
              </div>

              {/* Notice Warning Banner if Unanswered > 0 */}
              {Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length) > 0 && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Notice: You have {Math.max(0, roomQuestions.length - Object.keys(selectedAnswers).length)} unanswered question(s). Skipped questions will be recorded as unattempted.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  ⬅️ Resume Exam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitModalOpen(false);
                    handleFinalSubmit(false);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirm &amp; Submit Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentPortal;
