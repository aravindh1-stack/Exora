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
} from 'lucide-react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { submitExamSession, logProctoringIncident, matchStudentToRoom, createStudent } from '@/lib/queries';
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
  const [usingFallbackQuestions, setUsingFallbackQuestions] = useState<boolean>(false);

  // Terms & Conditions Checkbox States
  const [chkIdentity, setChkIdentity] = useState(false);
  const [chkMalpractice, setChkMalpractice] = useState(false);
  const [chkTime, setChkTime] = useState(false);

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

  // Derived current question (safeguarded against empty/undefined arrays)
  const currentQ = useMemo(() => {
    if (!roomQuestions || roomQuestions.length === 0) return null;
    return roomQuestions[currentIdx] || roomQuestions[0] || null;
  }, [roomQuestions, currentIdx]);

  // Active Student Candidate (Restored dynamically from activeStudent, safeStorage profile, or matching students DB list)
  const currentCandidate = useMemo<StudentWithSession>(() => {
    if (activeStudent) return activeStudent;

    const savedProfile = safeStorage.getJson<StudentWithSession>('exora_student_profile');
    if (savedProfile && savedProfile.register_no) return savedProfile;

    const savedReg =
      safeStorage.getItem('exora_session_reg') ||
      new URLSearchParams(window.location.search).get('reg');

    if (savedReg && students && students.length > 0) {
      const match = students.find(
        (s) => s.register_no.toLowerCase() === savedReg.toLowerCase(),
      );
      if (match) return match;
    }

    if (students && students.length > 0) return students[0];

    return {
      id: 'student-default',
      register_no: 'E24EC025',
      name: 'Candidate Student',
      email: 'student@sscet.edu',
      department: 'Electronics & Communication',
      year: 3,
      semester: 5,
      status: 'in_progress',
      score: 0,
      session_id: null,
      created_at: new Date().toISOString(),
    };
  }, [activeStudent, students]);

  useEffect(() => {
    const savedProfile = safeStorage.getJson<StudentWithSession>('exora_student_profile');
    const savedReg =
      savedProfile?.register_no ||
      safeStorage.getItem('exora_session_reg') ||
      new URLSearchParams(window.location.search).get('reg');

    if (savedReg && students && students.length > 0) {
      const match = students.find(
        (s) => s.register_no.toLowerCase() === savedReg.toLowerCase(),
      );
      if (match) {
        setActiveStudent(match);
      } else if (savedProfile) {
        setActiveStudent(savedProfile);
      }
    }
  }, [students]);

  // Helper for strict room-based question filtering
  const getRoomQuestionsStrict = useCallback((allQuestions: Question[], room: ExamRoom) => {
    if (!allQuestions || allQuestions.length === 0) {
      return { list: DEFAULT_FALLBACK_QUESTIONS, isFallback: true };
    }

    const normRoomId = (room.id || '').toLowerCase();
    const normRoomCode = normalizeCode(room.room_code);

    // 1. Strict match by question.room_id === room.id or room.room_code
    let filtered = allQuestions.filter((q) => {
      if (!q.room_id) return false;
      const qRoom = q.room_id.toLowerCase();
      return qRoom === normRoomId || normalizeCode(q.room_id) === normRoomCode;
    });

    // 2. If no direct room_id match, check if room title or department matches topic
    if (filtered.length === 0 && (room.title || room.department)) {
      const roomTitle = normalizeCode(room.title);
      const roomDept = normalizeCode(room.department);
      filtered = allQuestions.filter((q) => {
        if (!q.topic) return false;
        const topicNorm = normalizeCode(q.topic);
        return roomTitle.includes(topicNorm) || roomDept.includes(topicNorm);
      });
    }

    // 3. Use default fallbacks if no specific questions exist for this room
    if (filtered.length === 0) {
      return { list: DEFAULT_FALLBACK_QUESTIONS, isFallback: true };
    }

    return { list: filtered, isFallback: false };
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

  // Listen for browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlStage = searchParams.get('stage') as Stage;
      if (!urlStage || urlStage === 'dashboard') {
        returnToDashboard();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [returnToDashboard]);


  // Restore State from URL query parameters or safeStorage (Handles SEB page reloads cleanly)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlReg = searchParams.get('reg');
    const urlRoom = searchParams.get('room');
    const urlStage = (searchParams.get('stage') as Stage) || (safeStorage.getItem('exora_session_stage') as Stage);

    // Do NOT auto-bypass login if user is on entry page without explicit query credentials
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
        email: `${urlReg.toLowerCase()}@sscet.edu`,
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
      {},
    );
    if (savedAns && Object.keys(savedAns).length > 0) {
      setSelectedAnswers(savedAns);
    }

    if (urlStage) {
      let targetStage = urlStage;
      if ((targetStage === 'terms' || targetStage === 'exam') && !isSEBVerified) {
        targetStage = 'seb_check';
      }
      setStage(targetStage);
    }
  }, [students, rooms, questions, loading, getRoomQuestionsStrict, isSEBVerified]);

  // 1. Candidate Verification & Stage Transition Handler
  function handleVerifyCandidate() {
    setVerifyError(null);
    const reg = registerNo.trim();
    const code = roomCode.trim();

    // 1. Mandatory Validation
    if (!reg && !code) {
      setVerifyError('Please enter both your Register Number / SIN No and Exam Room Access Code.');
      return;
    }
    if (!reg) {
      setVerifyError('Please enter your SIN No / Register Number.');
      return;
    }
    if (!code) {
      setVerifyError('Please enter your Exam Room Access Code.');
      return;
    }

    const normReg = normalizeCode(reg);
    const normCode = normalizeCode(code);

    // Strict Room Code Verification against database
    const roomMatch = rooms.find(
      (r) =>
        r.room_code.toLowerCase() === code.toLowerCase() ||
        normalizeCode(r.room_code) === normCode,
    );

    if (!roomMatch) {
      setVerifyError(`Invalid Exam Room Code: Access code "${code}" does not exist in the active room database.`);
      return;
    }


    // Match Student (Exact or Normalized or Auto-Provision Candidate)
    let studentMatch = students.find(
      (s) =>
        s.register_no.toLowerCase() === reg.toLowerCase() ||
        normalizeCode(s.register_no) === normReg,
    );

    if (!studentMatch) {
      studentMatch = {
        id: `auto-student-${normReg}`,
        register_no: reg.toUpperCase(),
        name: `Candidate ${reg.toUpperCase()}`,
        email: `${reg.toLowerCase()}@sscet.edu`,
        department: roomMatch.department,
        year: Number(roomMatch.year) || 3,
        semester: Number(roomMatch.semester) || 5,
        status: 'in_progress',
        score: 0,
        session_id: null,
        created_at: new Date().toISOString(),
      };

      // Auto-insert to database in background
      createStudent({
        register_no: studentMatch.register_no,
        name: studentMatch.name,
        email: studentMatch.email,
        department: studentMatch.department,
        year: studentMatch.year,
        semester: studentMatch.semester,
      }).catch((e) => console.warn('[Auto-provision student notice]:', e?.message || e));
    }

    // Check if student already completed this exam
    if (studentMatch.status === 'completed' || studentMatch.status === 'flagged') {
      setVerifyError('You have already submitted this examination session.');
      return;
    }

    // Strict Room-Based Question Filtering
    const { list: qList, isFallback } = getRoomQuestionsStrict(questions, roomMatch);
    setUsingFallbackQuestions(isFallback);
    setRoomQuestions(qList);



    // Persistent Timer Calculation (handles exit & re-entry seamlessly via safeStorage)
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
      // If student has not submitted in DB, reset stale local test timer
      startTimestamp = Date.now();
      safeStorage.setItem(storageKey, String(startTimestamp));
      remainingSeconds = totalSeconds;
    }

    setActiveStudent(studentMatch);
    setActiveRoom(roomMatch);
    setRoomQuestions(qList);
    setTimeLeft(remainingSeconds);

    const targetStage: Stage = isSEBVerified ? 'terms' : 'seb_check';

    // Store auth session tokens in safeStorage & sync URL query params for SEB
    safeStorage.setItem('exora_session_reg', studentMatch.register_no);
    safeStorage.setItem('exora_session_room', roomMatch.room_code);
    safeStorage.setItem('exora_session_stage', targetStage);

    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'student');
    url.searchParams.set('reg', studentMatch.register_no);
    url.searchParams.set('room', roomMatch.room_code);
    url.searchParams.set('stage', targetStage);
    window.history.replaceState({}, '', url.toString());

    setStage(targetStage);
  }



  // Auto-transition to Terms when inside SEB, or enforce seb_check when outside SEB
  useEffect(() => {
    if (stage === 'seb_check' && isSEBVerified) {
      safeStorage.setItem('exora_session_stage', 'terms');
      setStage('terms');
    } else if ((stage === 'terms' || stage === 'exam') && !isSEBVerified) {
      safeStorage.setItem('exora_session_stage', 'seb_check');
      setStage('seb_check');
    }
  }, [stage, isSEBVerified]);



  // Global Copy/Paste & ContextMenu Lockdown Hook (Active across all portal stages)
  useEffect(() => {
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

    window.addEventListener('copy', preventAction, true);
    window.addEventListener('cut', preventAction, true);
    window.addEventListener('paste', preventAction, true);
    window.addEventListener('contextmenu', preventAction, true);
    window.addEventListener('selectstart', preventAction, true);
    window.addEventListener('keydown', handleKeydown, true);

    return () => {
      window.removeEventListener('copy', preventAction, true);
      window.removeEventListener('cut', preventAction, true);
      window.removeEventListener('paste', preventAction, true);
      window.removeEventListener('contextmenu', preventAction, true);
      window.removeEventListener('selectstart', preventAction, true);
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, []);

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

        // Clear active session keys from safeStorage & URL
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

  // Tab-Switch Proctoring Telemetry Hook
  useEffect(() => {
    if (stage !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setWarningsCount((prev) => {
          const next = prev + 1;
          if (next <= 2) {
            const msg = `⚠️ Warning ${next}/2: Tab switch or window minimization detected! Exceeding 2 warnings will terminate your exam and flag for malpractice.`;
            setWarningToast(msg);

            if (activeStudent && activeRoom) {
              logProctoringIncident({
                event_type: 'tab_switch',
                details: `Student ${activeStudent.name} (${activeStudent.register_no}) switched tab. Warning #${next}/2`,
              });
            }
            setTimeout(() => setWarningToast(null), 5000);
          } else {
            const msg = `🚨 EXAM TERMINATED: Exceeded 2 warnings! Session automatically marked as FLAGGED for malpractice.`;
            setWarningToast(msg);

            if (activeStudent && activeRoom) {
              logProctoringIncident({
                event_type: 'tab_switch_terminated',
                details: `Student ${activeStudent.name} (${activeStudent.register_no}) exceeded 2 warnings. Exam terminated & FLAGGED.`,
              });
            }
            setTimeout(() => {
              handleFinalSubmit(false);
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
  }, [stage, timeLeft, handleFinalSubmit]);

  // Format time remaining MM:SS
  const formattedTime = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);



  // Confirm & Finish Exam Handler
  const confirmAndFinishExam = useCallback(() => {
    const total = roomQuestions.length;
    const answered = Object.keys(selectedAnswers).length;
    const unAnswered = Math.max(0, total - answered);

    let msg = `Are you sure you want to finish and submit your examination session?`;
    if (unAnswered > 0) {
      msg += `\n\n⚠️ Notice: You have ${unAnswered} unanswered question(s). Skipped questions will be recorded as unattempted.`;
    }

    if (window.confirm(msg)) {
      handleFinalSubmit(false);
    }
  }, [roomQuestions, selectedAnswers, handleFinalSubmit]);

  return (
    <div className={stage === 'dashboard' ? 'w-full min-h-screen' : 'mx-auto max-w-5xl px-4 py-8 sm:py-12 min-h-[85vh] flex flex-col justify-center'}>


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


        {/* Stage 2: Safe Exam Browser (SEB) Launcher Screen (Theme-Responsive Full Page Split Screen) */}
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
              {/* Left / Hero Security Panel */}
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
                      SSCET Examination Protocol
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-5 sm:mt-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                    <span>Safe Exam Browser (SEB) Kiosk Lockdown Required</span>
                  </div>

                  <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl leading-tight">
                    Secure Examination Launcher
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm max-w-xl">
                    To preserve institutional integrity and prevent unauthorized external tools, this examination is locked strictly inside the <strong>Safe Exam Browser (SEB)</strong> environment.
                  </p>

                  {/* Pre-Flight Checklist Card */}
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

                <div className="mt-8 pt-4 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 max-w-xl">
                  <span>Proctoring Engine v2.4</span>
                  <span>AES-256 Encrypted Session</span>
                </div>
              </div>

              {/* Right / Interactive Verification & Launch Workspace */}
              <div className="relative flex flex-col justify-center p-4 sm:p-6 lg:col-span-7 lg:p-8 w-full">
                <div className="panel-card rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-6 shadow-xl dark:border-zinc-800/90 dark:bg-zinc-950 w-full">
                  {/* Candidate Profile Details Card */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
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
                        <span className="text-slate-500 dark:text-slate-400">Target Department &amp; Roster</span>
                        <p className="font-display mt-0.5 font-bold text-slate-900 dark:text-white text-base">{activeRoom.department}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Year {activeRoom.year} • Sem {activeRoom.semester}</p>
                      </div>
                    </div>
                  </div>

                  {/* Launch Actions Container */}
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-6 space-y-5 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <div className="flex items-start gap-3.5">
                      <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-display text-base font-bold text-amber-950 dark:text-amber-200">
                          Launch Exam via Safe Exam Browser
                        </h4>
                        <p className="text-xs text-amber-950/80 dark:text-amber-300/80 mt-0.5">
                          Follow the steps below to launch the proctored examination environment.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 pt-2">
                      <a
                        href="https://safeexambrowser.org/download_en.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 rounded-xl border border-amber-300 bg-white px-4 py-4 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 shadow-sm"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        <span>1. Download SEB Client</span>
                      </a>

                      <button
                        onClick={() => {
                          const proto = window.location.protocol === 'https:' ? 'sebs:' : 'seb:';
                          const directUrl = `${proto}//${window.location.host}${window.location.pathname}?mode=student&room=${activeRoom.room_code}`;
                          window.location.href = directUrl;
                        }}
                        className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-4 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-elevated transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 active:scale-[0.98]"
                      >
                        <Maximize2 className="h-4 w-4 text-white dark:text-slate-950 shrink-0" />
                        <span>2. Launch Safe Exam Browser</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      onClick={returnToDashboard}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Student Dashboard</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 2.5: Student Dashboard & Examination Terms Agreement */}
        {stage === 'terms' && isSEBVerified && activeStudent && activeRoom && (
          <motion.div
            key="terms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel-card mx-auto max-w-2xl rounded-2xl p-6 sm:p-8"
          >
            {/* Department-Wise Live Quiz Priority Alert Banner */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4 text-xs dark:border-amber-700/60 dark:bg-amber-950/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <Zap className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Priority Notice — Active Department Quiz
                    </span>
                    <h4 className="font-display text-sm font-bold text-brand-950 dark:text-white">
                      {activeRoom.title} ({activeRoom.room_code})
                    </h4>
                    <p className="mt-0.5 text-xs text-brand-600 dark:text-zinc-300">
                      Active for <strong>{activeRoom.department}</strong> (Year {activeRoom.year} • Sem {activeRoom.semester}). Complete early to avoid grade penalties!
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100/90 px-3 py-1.5 font-mono text-xs font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    <Clock className="h-3.5 w-3.5" /> {activeRoom.duration_minutes} Mins
                  </span>
                </div>
              </div>
            </div>

            {/* Student Dashboard Profile & Performance Cards */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand-200/80 bg-brand-50/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                  Verified Candidate
                </span>
                <p className="font-display mt-1 text-sm font-bold text-brand-950 dark:text-white">{activeStudent.name}</p>
                <p className="font-mono text-xs font-semibold text-brand-500 dark:text-zinc-400">SIN: {activeStudent.register_no}</p>
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-brand-50/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                  Department Roster
                </span>
                <p className="font-display mt-1 text-sm font-bold text-brand-950 dark:text-white">{activeStudent.department || activeRoom.department}</p>
                <p className="text-xs font-medium text-brand-500 dark:text-zinc-400">Year {activeStudent.year || activeRoom.year} • Sem {activeStudent.semester || activeRoom.semester}</p>
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-brand-50/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                  Score Record
                </span>
                <p className="font-display mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {activeStudent.score > 0 ? `${activeStudent.score}% Achieved` : 'Ready to Attempt'}
                </p>
                <p className="text-xs font-medium text-brand-500 dark:text-zinc-400">Status: {activeStudent.status === 'completed' ? 'Completed' : 'Enrolled'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-brand-100 pb-4 dark:border-zinc-800">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Safe Exam Browser Verified
                </span>
                <h3 className="font-display mt-2 text-lg font-bold text-brand-950 dark:text-white">
                  {activeRoom.title}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-brand-500 dark:text-zinc-400">
                Code: {activeRoom.room_code}
              </span>
            </div>

            {/* Terms & Rules Cards */}
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                <h4 className="font-display flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Malpractice &amp; Mark Deduction Policy</span>
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-950/90 dark:text-amber-300/90">
                  The automated proctoring telemetry engine monitors tab switches, window minimization, and illegal shortcuts. <strong>Any detected malpractice will be logged and reported directly to department staff, resulting in mark deductions or exam disqualification.</strong>
                </p>
              </div>

              {/* Mandatory 3 Checkboxes */}
              <div className="space-y-3 rounded-2xl border border-brand-200/80 bg-white p-4.5 text-xs dark:border-zinc-800/80 dark:bg-zinc-950/50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chkIdentity}
                    onChange={(e) => setChkIdentity(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-950 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs font-normal leading-relaxed text-brand-800 dark:text-zinc-300">
                    I confirm that I am the verified candidate (<strong>{activeStudent.name}</strong>) taking this examination under my own identity.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chkMalpractice}
                    onChange={(e) => setChkMalpractice(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-950 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs font-normal leading-relaxed text-brand-800 dark:text-zinc-300">
                    I understand that tab switching, window minimization, or copying will log warnings and staff will reduce my marks accordingly.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chkTime}
                    onChange={(e) => setChkTime(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-950 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs font-normal leading-relaxed text-brand-800 dark:text-zinc-300">
                    I agree to complete and submit all question responses within the allocated duration of <strong>{activeRoom.duration_minutes} minutes</strong>.
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-brand-100 pt-4 dark:border-zinc-800">
              <button
                onClick={returnToDashboard}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 transition hover:text-brand-950 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>

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
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-950 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-elevated transition hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
              >
                <Maximize2 className="h-4 w-4" />
                <span>Start Examination (Enter Fullscreen)</span>
              </button>
            </div>

          </motion.div>
        )}

        {/* Stage 3: Live Exam Workspace */}
        {stage === 'exam' && activeRoom && (
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

            {!currentQ ? (
              <div className="panel-card mx-auto max-w-md rounded-2xl p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  No Questions Added Yet
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                  This exam room (<strong>{activeRoom.title}</strong>) does not have any questions assigned yet. Please inform your instructor or department admin to add questions to room <code>{activeRoom.room_code}</code>.
                </p>
                <button
                  onClick={returnToDashboard}
                  className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  Return to Student Portal Login
                </button>
              </div>
            ) : (
              <>
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
                <div className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-1.5 font-mono text-sm font-bold text-brand-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                  <Clock className="h-4 w-4 text-brand-400 dark:text-zinc-500" />
                  <span>{formattedTime}</span>
                </div>


                {/* Finish Exam Button */}
                <button
                  onClick={confirmAndFinishExam}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition active:scale-[0.98]"
                  title="Finish and submit examination session"
                >
                  {submitting ? (
                    <>
                      <Spinner size={14} /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Finish Exam</span>
                    </>
                  )}
                </button>

                {/* Exit Exam Button */}
                <button
                  onClick={() => {
                    const confirmExit = window.confirm(
                      'Are you sure you want to Exit Exam? Your timer will continue running in the background until time expires.',
                    );
                    if (confirmExit) {
                      safeStorage.removeItem('exora_session_reg');
                      safeStorage.removeItem('exora_session_room');
                      safeStorage.removeItem('exora_session_stage');
                      const url = new URL(window.location.href);
                      url.searchParams.delete('stage');
                      url.searchParams.delete('reg');
                      url.searchParams.delete('room');
                      window.history.replaceState({}, '', url.toString());
                      setStage('verify');
                      setActiveStudent(null);
                      setActiveRoom(null);
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  title="Exit Examination"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>

            {/* Offline Fallback Questions Badge */}
            {usingFallbackQuestions && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Offline / Diagnostic Fallback Question Set Active (SEB Safe Mode)</span>
              </div>
            )}

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
                    {currentIdx < roomQuestions.length - 1 && (
                      <button
                        onClick={() => setCurrentIdx((i) => i + 1)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                      >
                        Next <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={confirmAndFinishExam}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {submitting ? (
                        <>
                          <Spinner size={14} /> Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Finish & Submit Exam
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>


              {/* Question Palette Sidebar */}
              <div className="panel-card flex flex-col rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-500 dark:text-zinc-400">
                    Question Palette
                  </h4>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-500 dark:bg-zinc-900 dark:text-zinc-400">
                    {Object.keys(selectedAnswers).length}/{roomQuestions.length}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-2">
                  {roomQuestions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                          isCurrent
                            ? 'border-2 border-brand-900 bg-brand-900 text-white shadow-subtle dark:border-white dark:bg-white dark:text-brand-950'
                            : isAnswered
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50'
                              : 'bg-brand-50 text-brand-400 ring-1 ring-inset ring-brand-200/60 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 border-t border-brand-100 pt-4 text-[11px] text-brand-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-100 ring-1 ring-emerald-300 dark:bg-emerald-950/60 dark:ring-emerald-800" />
                      Answered
                    </span>
                    <span className="font-semibold text-brand-800 dark:text-zinc-200">
                      {Object.keys(selectedAnswers).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand-50 ring-1 ring-brand-200 dark:bg-zinc-900 dark:ring-zinc-700" />
                      Unanswered
                    </span>
                    <span className="font-semibold text-brand-800 dark:text-zinc-200">
                      {roomQuestions.length - Object.keys(selectedAnswers).length}
                    </span>
                  </div>
                </div>

                {/* Finish Exam */}
                <button
                  onClick={confirmAndFinishExam}
                  disabled={submitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-brand-800 disabled:opacity-50 dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
                >
                  {submitting ? (
                    <>
                      <Spinner size={14} /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Finish Exam
                    </>
                  )}
                </button>
              </div>


            </div>
            </>
            )}
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
              onClick={returnToDashboard}
              className="mt-6 w-full rounded-xl bg-brand-900 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-brand-800 dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
            >
              Return to Student Dashboard
            </button>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentPortal;

