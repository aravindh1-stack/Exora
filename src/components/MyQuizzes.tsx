import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Clock,
  Building,
  Calendar,
  CheckCircle2,
  Eye,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flag,
  X,
} from 'lucide-react';
import type { StudentWithSession, ExamRoom, ExamSession } from '@/lib/types';
import { matchStudentToRoom, fetchAllSessionsForStudent } from '@/lib/queries';

interface MyQuizzesProps {
  student: StudentWithSession;
  rooms: ExamRoom[];
  onStartExam: (room: ExamRoom) => void;
  onViewAnswers: (room?: ExamRoom) => void;
}

type FilterTab = 'all' | 'pending' | 'completed' | 'flagged';

export function MyQuizzes({
  student,
  rooms,
  onStartExam,
  onViewAnswers,
}: MyQuizzesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  // Fetch real exam sessions from Supabase for this student
  useEffect(() => {
    let isMounted = true;
    if (student && student.id) {
      fetchAllSessionsForStudent(student.id).then((data) => {
        if (isMounted) {
          setSessions(data);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [student]);

  // Filter department matching rooms
  const deptRooms = useMemo(
    () => rooms.filter((r) => matchStudentToRoom(student, r)),
    [rooms, student],
  );

  // Map quiz items with exact session status
  const quizItems = useMemo(() => {
    return deptRooms.map((room) => {
      // Find matching session in real database records for this student and room
      const sessionMatch = sessions.find((s) => s.room_id === room.id);

      // Fallback matching if session_id exists on student object and only 1 room exists
      const isStudentSessionMatch =
        Boolean(student.session_id) &&
        (student.room_id === room.id || deptRooms.length === 1);

      let quizStatus: 'pending' | 'completed' | 'flagged' = 'pending';
      let score: number | null = null;

      if (sessionMatch) {
        if (sessionMatch.status === 'flagged') quizStatus = 'flagged';
        else if (sessionMatch.status === 'completed') quizStatus = 'completed';
        score = Number(sessionMatch.score);
      } else if (isStudentSessionMatch && student.status !== 'in_progress') {
        quizStatus = student.status === 'flagged' ? 'flagged' : 'completed';
        score = student.score;
      }

      return {
        room,
        quizStatus,
        score,
      };
    });
  }, [deptRooms, sessions, student]);

  // Filtered list based on Search Query & Tab Filter
  const filteredQuizzes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return quizItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.room.title.toLowerCase().includes(q) ||
        item.room.room_code.toLowerCase().includes(q) ||
        item.room.department.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'pending') return item.quizStatus === 'pending';
      if (filterTab === 'completed') return item.quizStatus === 'completed';
      if (filterTab === 'flagged') return item.quizStatus === 'flagged';
      return true;
    });
  }, [quizItems, searchQuery, filterTab]);

  const counts = useMemo(() => {
    const pending = quizItems.filter((q) => q.quizStatus === 'pending').length;
    const completed = quizItems.filter((q) => q.quizStatus === 'completed').length;
    const flagged = quizItems.filter((q) => q.quizStatus === 'flagged').length;
    return { all: quizItems.length, pending, completed, flagged };
  }, [quizItems]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel-card flex flex-wrap items-center justify-between gap-4 p-6 dark:bg-[#0c0d10]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:bg-zinc-900 dark:text-zinc-300">
            <BookOpen className="h-3.5 w-3.5" /> Departmental Examination Hub
          </span>
          <h2 className="font-display mt-2 text-xl font-bold text-brand-950 dark:text-white sm:text-2xl">
            My Enrolled Quizzes
          </h2>
          <p className="mt-1 text-xs text-brand-500 dark:text-zinc-400">
            Access assigned unit tests, review past answer keys, and launch proctored examinations.
          </p>
        </div>

        {/* Diagnostic Quick Checklist */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2 text-xs font-semibold text-brand-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>SEB Ready</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2 text-xs font-semibold text-brand-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Proctoring Active</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-[#0c0d10]">
          {(
            [
              { id: 'all', label: `All Quizzes (${counts.all})` },
              { id: 'pending', label: `Pending / Live (${counts.pending})` },
              { id: 'completed', label: `Completed (${counts.completed})` },
              { id: 'flagged', label: `Flagged (${counts.flagged})` },
            ] as const
          ).map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-brand-950 text-white shadow-subtle dark:bg-white dark:text-brand-950'
                    : 'text-brand-600 hover:bg-brand-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quiz title, room code..."
            className="w-full rounded-xl border border-brand-200 bg-white py-2 pl-10 pr-8 text-xs text-brand-950 placeholder:text-brand-300 outline-none transition focus:border-brand-950 dark:border-zinc-800 dark:bg-[#0c0d10] dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-950 dark:text-zinc-500 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="panel-card flex flex-col items-center justify-center rounded-2xl py-14 text-center dark:bg-[#0c0d10]">
          <BookOpen className="h-8 w-8 text-brand-300 dark:text-zinc-700" />
          <h3 className="font-display mt-3 text-sm font-bold text-brand-950 dark:text-white">
            No Quizzes Match Your Filter
          </h3>
          <p className="mt-1 max-w-sm text-xs text-brand-500 dark:text-zinc-400">
            {searchQuery
              ? `No quizzes found matching "${searchQuery}". Try clearing search or selecting a different tab.`
              : 'Try switching filter tabs to see available departmental quizzes.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map(({ room, quizStatus, score }, idx) => {
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="panel-card flex flex-col justify-between rounded-2xl p-6 transition hover:shadow-elevated dark:bg-[#0c0d10]"
              >
                <div>
                  {/* Status Badge & Room Code */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-500 dark:text-zinc-400">
                      #{room.room_code}
                    </span>
                    {quizStatus === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Live &amp; Pending
                      </span>
                    )}
                    {quizStatus === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Completed ({score}% Score)
                      </span>
                    )}
                    {quizStatus === 'flagged' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                        <Flag className="h-3 w-3" /> Flagged ({score}% Score)
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-display mt-3 text-base font-bold text-brand-950 dark:text-white line-clamp-2">
                    {room.title}
                  </h3>

                  {/* Info Metadata */}
                  <div className="mt-4 space-y-2 border-t border-brand-100 pt-3 text-xs text-brand-600 dark:border-zinc-800 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-brand-400 dark:text-zinc-500" />
                      <span>{room.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-brand-400 dark:text-zinc-500" />
                      <span>Year {room.year} • Semester {room.semester}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-brand-400 dark:text-zinc-500" />
                      <span>Target Duration: {room.duration_minutes} Mins</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 border-t border-brand-100 pt-4 dark:border-zinc-800">
                  {quizStatus === 'pending' ? (
                    <button
                      onClick={() => onStartExam(room)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-950 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-subtle transition hover:bg-brand-800 active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
                    >
                      <span>Launch Exam Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onViewAnswers(room)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-brand-950 shadow-subtle transition hover:bg-brand-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Answer Key</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
