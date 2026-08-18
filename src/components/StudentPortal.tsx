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
} from 'lucide-react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { submitExamSession, logProctoringIncident, matchStudentToRoom } from '@/lib/queries';
import { Spinner } from './ui';

interface StudentPortalProps {
  students: StudentWithSession[];
  rooms: ExamRoom[];
  questions: Question[];
  onExamSubmitted: () => void;
}

type Stage = 'verify' | 'instructions' | 'exam' | 'submitted';

export function StudentPortal({
  students,
  rooms,
  questions,
  onExamSubmitted,
}: StudentPortalProps) {
  const [stage, setStage] = useState<Stage>('verify');
  const [registerNo, setRegisterNo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [activeStudent, setActiveStudent] = useState<StudentWithSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<ExamRoom | null>(null);
  const [roomQuestions, setRoomQuestions] = useState<Question[]>([]);

  // Exam state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  // Strict SEB Detection State
  const isSEBVerified = useMemo(() => {
    const ua = navigator.userAgent;
    return ua.includes('SEB') || ua.includes('SafeExamBrowser');
  }, []);

  // 1. Candidate Verification & Stage Transition Handler
  function handleVerifyCandidate() {
    setVerifyError(null);
    const reg = registerNo.trim();
    const code = roomCode.trim();

    if (!reg) {
      setVerifyError('Please enter your SIN No / Register Number.');
      return;
    }
    if (!code) {
      setVerifyError('Please enter your Exam Room Access Code.');
      return;
    }

    const studentMatch = students.find(
      (s) => s.register_no.toLowerCase() === reg.toLowerCase(),
    );
    if (!studentMatch) {
      setVerifyError(`Student with SIN No "${reg}" was not found in the roster.`);
      return;
    }

    const roomMatch = rooms.find(
      (r) => r.room_code.toLowerCase() === code.toLowerCase(),
    );
    if (!roomMatch) {
      setVerifyError(`Exam Room with code "${code}" does not exist.`);
      return;
    }

    // Check Department, Year, and Semester Eligibility
    const isEligible = matchStudentToRoom(studentMatch, roomMatch);
    if (!isEligible) {
      setVerifyError(
        `Access Denied: You belong to ${studentMatch.department || 'CS'} (Year ${
          studentMatch.year || 1
        }, Sem ${studentMatch.semester || 1}), but this exam room is reserved for ${
          roomMatch.department
        } (Year ${roomMatch.year}, Sem ${roomMatch.semester}).`,
      );
      return;
    }

    // Check if student already completed this exam
    if (studentMatch.status === 'completed' || studentMatch.status === 'flagged') {
      setVerifyError('You have already submitted this examination session.');
      return;
    }

    // Get questions for this room
    let qList = questions.filter((q) => q.room_id === roomMatch.id);
    if (qList.length === 0) {
      qList = questions.slice(0, 10);
    }

    // Persistent Timer Calculation (handles exit & 2 min re-entry seamlessly)
    const storageKey = `exora_start_${studentMatch.id}_${roomMatch.id}`;
    const existingStart = localStorage.getItem(storageKey);
    let startTimestamp = Date.now();

    if (existingStart) {
      startTimestamp = Number(existingStart);
    } else {
      localStorage.setItem(storageKey, String(startTimestamp));
    }

    const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    const totalSeconds = roomMatch.duration_minutes * 60;
    const remainingSeconds = totalSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      setVerifyError('Exam time limit has expired for your session.');
      return;
    }

    setActiveStudent(studentMatch);
    setActiveRoom(roomMatch);
    setRoomQuestions(qList);
    setTimeLeft(remainingSeconds);

    // Proceed to SEB Verification Stage
    setStage('seb_check');
  }

  // Auto-launch exam workspace when inside SEB
  useEffect(() => {
    if (stage === 'seb_check' && isSEBVerified) {
      setStage('exam');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  }, [stage, isSEBVerified]);

  // 3. Proctoring Tab-Switch Detection & Copy/Paste Lockdown Hook
  useEffect(() => {
    if (stage !== 'exam') return;

    // Prevent copy, cut, paste, right-click, and text selection
    const preventAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleKeydown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, Ctrl+A, F12
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'u', 'a', 'p', 's'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        setWarningToast('Copy / Paste & Shortcuts are strictly disabled!');
        setTimeout(() => setWarningToast(null), 3000);
      }
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setWarningsCount((prev) => {
          const next = prev + 1;
          const msg = `Warning ${next}/3: Tab switch or window minimization detected!`;
          setWarningToast(msg);

          // Log incident to database
          if (activeStudent && activeRoom) {
            logProctoringIncident({
              event_type: 'tab_switch',
              details: `Student ${activeStudent.name} (${activeStudent.register_no}) switched tab. Warning #${next}`,
            });
          }

          setTimeout(() => setWarningToast(null), 4000);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('copy', preventAction, true);
    window.addEventListener('cut', preventAction, true);
    window.addEventListener('paste', preventAction, true);
    window.addEventListener('contextmenu', preventAction, true);
    window.addEventListener('selectstart', preventAction, true);
    window.addEventListener('keydown', handleKeydown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('copy', preventAction, true);
      window.removeEventListener('cut', preventAction, true);
      window.removeEventListener('paste', preventAction, true);
      window.removeEventListener('contextmenu', preventAction, true);
      window.removeEventListener('selectstart', preventAction, true);
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, [stage, activeStudent, activeRoom]);

  // 4. Live Exam Countdown Timer Hook
  useEffect(() => {
    if (stage !== 'exam' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  // 5. Submit Exam Handler
  const handleFinalSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (!activeStudent || !activeRoom || submitting) return;

      setSubmitting(true);
      try {
        // Calculate score
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

        const pct =
          roomQuestions.length > 0
            ? Math.round((correctCount / roomQuestions.length) * 100)
            : 0;

        const isFlagged = warningsCount >= 3;
        const status = isFlagged ? 'flagged' : 'completed';
        const flagReason = isFlagged
          ? `Malpractice: Switched tabs/minimized window ${warningsCount} times`
          : undefined;

        await submitExamSession({
          student_id: activeStudent.id,
          room_id: activeRoom.id,
          score: pct,
          status,
          flag_reason: flagReason,
          answers: answerPayload,
        });

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

  // Format time remaining MM:SS
  const formattedTime = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);



  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <AnimatePresence mode="wait">
        {/* Stage 1: World-Class Student Examination Landing & Verification Portal */}
        {stage === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Header Navigation */}
            <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md dark:bg-zinc-100 dark:text-black">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    EXORA STUDENT PORTAL
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    SSCET Enterprise Examination System
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Proctoring & SEB Lockdown Engine Active
              </div>
            </div>

            {/* Hero Grid: Login Card + Platform Features Bento Box */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Student Login Panel */}
              <div className="panel-card relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:col-span-6">
                <div className="border-b border-slate-100 pb-5 dark:border-zinc-800">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> Student Candidate Verification
                  </span>
                  <h2 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
                    Examination Entry
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    Enter your assigned SIN Number (Register No) and Exam Room Code to begin.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyCandidate();
                  }}
                  className="mt-6 space-y-4"
                >
                  {/* SIN / Register No Input */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      SIN No / Register Number *
                    </label>
                    <input
                      value={registerNo}
                      onChange={(e) => setRegisterNo(e.target.value)}
                      placeholder="e.g. REG2026001"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
                    />
                  </div>

                  {/* Exam Room Access Code Input */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Exam Room Access Code *
                    </label>
                    <div className="relative mt-1.5">
                      <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <input
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CS-Y3S5-891"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 font-mono text-sm uppercase text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  {/* Error Banner */}
                  {verifyError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{verifyError}</span>
                    </motion.div>
                  )}

                  {/* Anti-Cheat Compliance Badge */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:border-zinc-800/80 dark:bg-zinc-950/50 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Safe Exam Browser & Anti-Cheat Enforced</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
                      Fullscreen monitoring, persistent timer tracking, and tab telemetry active.
                    </p>
                  </div>

                  {/* Verify Button */}
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 active:scale-[0.99] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    <span>Verify Credentials & Launch Examination</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Right Column: Platform Overview & Bento Grid */}
              <div className="space-y-4 lg:col-span-6">
                <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800/80 dark:bg-pitch-900/60">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Exora Student Examination Portal
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    A secure, proctored digital assessment system designed specifically for students of SSCET.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
                      <ShieldCheck className="h-5 w-5 text-indigo-500" />
                      <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                        Safe Exam Browser
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        Locks down external tools & unapproved web applications during tests.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                        Persistent Timer
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        Seamlessly resumes your exact balance timing if interrupted.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                      <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                        Automated Telemetry
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        Real-time tab switch tracking & automated malpractice flags.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
                      <Award className="h-5 w-5 text-emerald-500" />
                      <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                        Instant Evaluation
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        Instant auto-grading & score breakdown upon final submission.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-100/60 px-5 py-3.5 text-xs text-slate-500 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Need Help?</span>
                  <span>Contact your Department Examination Coordinator</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 2: Safe Exam Browser (SEB) Launcher Screen */}
        {stage === 'seb_check' && activeStudent && activeRoom && (
          <motion.div
            key="seb_check"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel-card mx-auto max-w-xl rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Candidate Identity Verified
                </span>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {activeRoom.title}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">
                Code: {activeRoom.room_code}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <span className="text-slate-500 dark:text-zinc-400">Student Name</span>
                <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{activeStudent.name}</p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">SIN: {activeStudent.register_no}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <span className="text-slate-500 dark:text-zinc-400">Target Group</span>
                <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{activeRoom.department}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Year {activeRoom.year} • Sem {activeRoom.semester}</p>
              </div>
            </div>

            {/* Safe Exam Browser (SEB) Launch Card */}
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Safe Exam Browser (SEB) Required
                </h4>
              </div>

              <p className="mt-2 text-xs text-amber-950 dark:text-amber-300/80">
                To guarantee exam integrity, this exam must be taken inside <strong>Safe Exam Browser</strong>. Please download SEB if not installed, or launch SEB directly below.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <a
                  href="https://safeexambrowser.org/download_en.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 dark:border-amber-800 dark:bg-pitch-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <span>1. Install Safe Exam Browser</span>
                </a>

                <button
                  onClick={() => {
                    const proto = window.location.protocol === 'https:' ? 'sebs:' : 'seb:';
                    const directUrl = `${proto}//${window.location.host}${window.location.pathname}?mode=student&room=${activeRoom.room_code}`;
                    window.location.href = directUrl;
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>2. Launch Safe Exam Browser</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800">
              <button
                onClick={() => setStage('verify')}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Verification
              </button>
            </div>
          </motion.div>
        )}

        {/* Stage 3: Live Exam Workspace */}
        {stage === 'exam' && activeRoom && currentQ && (
          <motion.div
            key="exam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Warning Toast */}
            {warningToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{warningToast}</span>
              </motion.div>
            )}

            {/* Exam Header */}
            <div className="panel-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activeRoom.title}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Question {currentIdx + 1} of {roomQuestions.length}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Warning Pill */}
                {warningsCount > 0 && (
                  <span className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warnings: {warningsCount}/3
                  </span>
                )}

                {/* Timer Badge */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-1.5 font-mono text-sm font-bold text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>{formattedTime}</span>
                </div>

                {/* Exit Exam Button */}
                <button
                  onClick={() => {
                    const confirmExit = window.confirm(
                      'Are you sure you want to Exit Exam? Your timer will continue running in the background until time expires.',
                    );
                    if (confirmExit) {
                      setStage('verify');
                      setActiveStudent(null);
                      setActiveRoom(null);
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  title="Exit Examination"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit Exam</span>
                </button>
              </div>
            </div>

            {/* Question Workspace Layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              {/* Question Card */}
              <div className="panel-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      {currentQ.topic}
                    </span>
                    <span className="text-xs font-semibold capitalize text-slate-400 dark:text-zinc-500">
                      {currentQ.difficulty} Difficulty
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                    {currentIdx + 1}. {currentQ.text}
                  </h3>

                  {/* Options List */}
                  <div className="mt-6 space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[currentQ.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: optIdx,
                            }))
                          }
                          className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left text-xs font-medium transition ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-subtle dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                              : 'border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-300 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {currentIdx < roomQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentIdx((i) => i + 1)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                      >
                        Next <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFinalSubmit(false)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Spinner size={14} /> Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Submit Exam
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Question Palette Sidebar */}
              <div className="panel-card rounded-2xl p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Question Palette
                </h4>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {roomQuestions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold transition ${
                          isCurrent
                            ? 'border-2 border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-zinc-100 dark:text-black'
                            : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-500'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-950/60" />
                    <span>Answered ({Object.keys(selectedAnswers).length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-slate-100 dark:bg-zinc-900" />
                    <span>Unanswered ({roomQuestions.length - Object.keys(selectedAnswers).length})</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 4: Submission & Score Summary */}
        {stage === 'submitted' && activeRoom && activeStudent && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel-card mx-auto max-w-md rounded-2xl p-6 text-center sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Award className="h-8 w-8" />
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Exam Submitted Successfully!
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Your examination responses have been recorded in the system.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Score Achieved</span>
              <p className="mt-1 text-4xl font-extrabold text-slate-900 dark:text-white">
                {finalScore}%
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {finalScore && finalScore >= 60 ? 'Standard Passed' : 'Below Threshold'}
              </p>
            </div>

            <button
              onClick={() => {
                setStage('verify');
                setRegisterNo('');
                setRoomCode('');
                setActiveStudent(null);
                setActiveRoom(null);
              }}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              Return to Student Login
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
