import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DoorOpen,
  Plus,
  Search,
  Users,
  Clock,
  Key,
  Building,
  Calendar,
  Trash2,
  X,
  Check,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import type { ExamRoom, StudentWithSession, Question } from '@/lib/types';
import { Skeleton, Spinner } from './ui';
import { createExamRoom, deleteExamRoom, createQuestion, deleteQuestion, matchStudentToRoom, type ExamRoomInput } from '@/lib/queries';

interface RoomsProps {
  rooms: ExamRoom[];
  students: StudentWithSession[];
  questions: Question[];
  loading: boolean;
  onReload: () => void;
  onSelectRoomForQuestions?: (roomId: string) => void;
}

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'AI & Data Science',
  'Electronics & Comm.',
  'Electrical & Electronics',
  'Mechanical Eng.',
  'Civil Eng.',
];

export function Rooms({
  rooms,
  students,
  questions,
  loading,
  onReload,
}: RoomsProps) {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ExamRoom | null>(null);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.room_code.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [rooms, search]);

  async function handleDeleteRoom() {
    if (!deleteId) return;
    try {
      await deleteExamRoom(deleteId);
      setDeleteId(null);
      onReload();
    } catch (e) {
      console.error('Failed to delete room', e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Targeted Exam Rooms
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Create exam rooms restricted to specific Departments, Years, and Semesters.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-subtle transition hover:bg-slate-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Exam Room
        </button>
      </motion.div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room title, code, or dept..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
          />
        </div>

        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
          {rooms.length} Active Rooms
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="panel-card flex flex-col items-center justify-center rounded-2xl py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-900">
            <DoorOpen className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">
            No Exam Rooms Found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {rooms.length === 0
              ? 'Create your first targeted exam room to assign questions to specific students.'
              : 'No exam rooms match your current search query.'}
          </p>
          {rooms.length === 0 && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Create Room
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room) => {
              const matchingStudents = students.filter((s) => matchStudentToRoom(s, room));

              const roomQuestions = questions.filter(
                (q) => q.room_id === room.id,
              );

              return (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  onClick={() => setActiveRoom(room)}
                  className="panel-card group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-5 transition hover:border-slate-300 dark:hover:border-zinc-700"
                >
                  <div>
                    {/* Header: Title & Room Code Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {room.title}
                          </h3>
                        </div>
                        <p className="mt-1 flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                          <Key className="h-3 w-3 text-amber-500" />
                          Code: <span className="text-slate-900 dark:text-zinc-100">{room.room_code}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(room.id);
                        }}
                        className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Delete Exam Room"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Target Audience Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        <Building className="h-3 w-3" />
                        {room.department}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        Year {room.year} • Sem {room.semester}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-950/40">
                      <div>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                          <Users className="h-3 w-3" /> Eligible Candidates
                        </span>
                        <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                          {matchingStudents.length} Students
                        </p>
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                          <Clock className="h-3 w-3" /> Duration
                        </span>
                        <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                          {room.duration_minutes} Mins
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                      {roomQuestions.length} Questions
                    </span>

                    <span className="text-xs font-semibold text-slate-900 group-hover:underline dark:text-white">
                      Enter Workspace →
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Exam Room Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <CreateRoomModal
            onClose={() => setAddModalOpen(false)}
            onReload={() => {
              setAddModalOpen(false);
              onReload();
            }}
          />
        )}
      </AnimatePresence>

      {/* Dedicated In-Room Workspace Modal */}
      <AnimatePresence>
        {activeRoom && (
          <RoomWorkspaceModal
            room={activeRoom}
            students={students}
            questions={questions}
            onClose={() => setActiveRoom(null)}
            onReload={onReload}
          />
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
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
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Delete Exam Room?
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                This will remove the room and unassign its questions.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRoom}
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



function RoomWorkspaceModal({
  room,
  students,
  questions,
  onClose,
  onReload,
}: {
  room: ExamRoom;
  students: StudentWithSession[];
  questions: Question[];
  onClose: () => void;
  onReload: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'candidates' | 'questions'>('candidates');
  const [createQuestionModalOpen, setCreateQuestionModalOpen] = useState(false);

  // Filter matching candidates
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => matchStudentToRoom(s, room));
  }, [students, room]);

  // Filter room questions
  const roomQuestions = useMemo(() => {
    return questions.filter((q) => q.room_id === room.id);
  }, [questions, room]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2 }}
        className="panel-card relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl p-6"
      >
        {/* Top Header */}
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                {room.title}
              </h2>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
                Code: {room.room_code}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {room.department}
              </span>
              <span>•</span>
              <span>Year {room.year}</span>
              <span>•</span>
              <span>Semester {room.semester}</span>
              <span>•</span>
              <span>Duration: {room.duration_minutes} Mins</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'candidates'
                  ? 'bg-white text-slate-900 shadow-subtle dark:bg-zinc-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Eligible Candidates ({eligibleStudents.length})
            </button>

            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'questions'
                  ? 'bg-white text-slate-900 shadow-subtle dark:bg-zinc-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4 text-amber-500" />
              Room Questions ({roomQuestions.length})
            </button>
          </div>

          {activeTab === 'questions' && (
            <button
              onClick={() => setCreateQuestionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-subtle transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Add Room Question
            </button>
          )}
        </div>

        {/* Tab 1 Content: Eligible Candidates Roster */}
        {activeTab === 'candidates' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {eligibleStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-10 w-10 text-slate-300 dark:text-zinc-700" />
                <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-zinc-200">
                  No Matching Candidates Found
                </h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-zinc-400">
                  No registered students in your roster match <strong>{room.department}</strong>, <strong>Year {room.year}</strong>, and <strong>Semester {room.semester}</strong>. Add new students in the Students tab to grant them access!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1.2fr_2fr_1.5fr_1fr] gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  <span>SIN No</span>
                  <span>Student Name</span>
                  <span>Email</span>
                  <span>Exam Status</span>
                </div>
                {eligibleStudents.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[1.2fr_2fr_1.5fr_1fr] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-xs transition hover:bg-slate-50 dark:border-zinc-800/80 dark:bg-pitch-900 dark:hover:bg-zinc-900/60"
                  >
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {student.register_no}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900 dark:text-white">
                        {student.name}
                      </p>
                    </div>
                    <span className="truncate text-slate-500 dark:text-zinc-400">
                      {student.email || '—'}
                    </span>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          student.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                            : student.status === 'flagged'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                        }`}
                      >
                        {student.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Room Questions Bank */}
        {activeTab === 'questions' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {roomQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 dark:text-zinc-700" />
                <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-zinc-200">
                  No Questions Created For This Room
                </h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-zinc-400">
                  Questions added here will be strictly delivered to candidates in <strong>{room.department} (Year {room.year}, Sem {room.semester})</strong>.
                </p>
                <button
                  onClick={() => setCreateQuestionModalOpen(true)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {roomQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 text-xs dark:border-zinc-800/80 dark:bg-pitch-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-black">
                          Q{qIdx + 1}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {q.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                          {q.topic}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await deleteQuestion(q.id);
                              await onReload();
                            } catch (e) {
                              console.error('Failed to delete question', e);
                            }
                          }}
                          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          title="Delete Question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correct_index;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-slate-100 bg-slate-50 text-slate-700 dark:border-zinc-800/50 dark:bg-zinc-950/40 dark:text-zinc-400'
                            }`}
                          >
                            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal inside Workspace to Add Question */}
        <AnimatePresence>
          {createQuestionModalOpen && (
            <CreateInRoomQuestionModal
              roomId={room.id}
              department={room.department}
              onClose={() => setCreateQuestionModalOpen(false)}
              onReload={() => {
                setCreateQuestionModalOpen(false);
                onReload();
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function CreateInRoomQuestionModal({
  roomId,
  department,
  onClose,
  onReload,
}: {
  roomId: string;
  department: string;
  onClose: () => void;
  onReload: () => void;
}) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [topic, setTopic] = useState(department);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!text.trim()) {
      setError('Question prompt is required.');
      return;
    }
    if (options.some((o) => !o.trim())) {
      setError('All 4 answer options must be filled.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createQuestion({
        text: text.trim(),
        options: options.map((o) => o.trim()),
        correct_index: correctIndex,
        topic: topic.trim() || department,
        difficulty,
        room_id: roomId,
      });
      await onReload();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save question.');
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
            <Plus className="h-4.5 w-4.5 text-slate-900 dark:text-white" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Add Question To Room
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
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Question Prompt *
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="e.g. What is the time complexity of Quick Sort in average case?"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Options (Select correct option radio button) *
            </label>
            <div className="mt-1 space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_index"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="w-5 text-center font-mono text-xs font-semibold text-slate-400 dark:text-zinc-500">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[i] = e.target.value;
                      setOptions(copy);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Topic Tag
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Data Structures"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
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
                Save Question
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateRoomModal({
  onClose,
  onReload,
}: {
  onClose: () => void;
  onReload: () => void;
}) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState(3);
  const [semester, setSemester] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique room code based on dept prefix + random number
  const generatedCode = useMemo(() => {
    const prefix = department.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-Y${year}S${semester}-${rand}`;
  }, [department, year, semester]);

  async function handleSave() {
    if (!title.trim()) {
      setError('Exam room title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const roomInput: ExamRoomInput = {
        title: title.trim(),
        room_code: generatedCode,
        department,
        year,
        semester,
        duration_minutes: Number(durationMinutes),
        status: 'active',
      };
      await createExamRoom(roomInput);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create exam room.');
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
        className="panel-card relative z-10 w-full max-w-lg rounded-xl p-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4.5 w-4.5 text-slate-900 dark:text-white" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create Targeted Exam Room
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
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Exam Room Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures Mid-Term Examination"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Target Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Target Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Target Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Sem {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Duration (Mins)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="text-slate-500 dark:text-zinc-400">Auto-Generated Access Code</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
              {generatedCode}
            </p>
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
                Creating...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Create Room
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

