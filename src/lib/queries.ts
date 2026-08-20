import {
  supabase,
} from './supabase';
import type {
  Question,
  Student,
  StudentWithSession,
  ExamRoom,
} from './types';

export async function fetchStudentsWithSessions(): Promise<StudentWithSession[]> {
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('*')
    .order('register_no', { ascending: true });
  if (sErr) throw sErr;

  const { data: sessions, error: eErr } = await supabase
    .from('exam_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (eErr) throw eErr;

  const latestByStudent = new Map<string, (typeof sessions)[number]>();
  const flaggedStudentKeys = new Set<string>();
  const flaggedSessionByStudent = new Map<string, (typeof sessions)[number]>();

  for (const s of sessions ?? []) {
    if (s.student_id) {
      const normKey = s.student_id.toLowerCase().trim();
      if (!latestByStudent.has(normKey)) latestByStudent.set(normKey, s);

      // Check if candidate was flagged in ANY exam room
      if (s.status === 'flagged') {
        flaggedStudentKeys.add(normKey);
        if (!flaggedSessionByStudent.has(normKey)) {
          flaggedSessionByStudent.set(normKey, s);
        }
      }
    }
  }

  return (students ?? []).map((s: Student) => {
    const sIdKey = s.id ? s.id.toLowerCase().trim() : '';
    const sRegKey = s.register_no ? s.register_no.toLowerCase().trim() : '';

    const latest = latestByStudent.get(sIdKey) || latestByStudent.get(sRegKey);
    const flaggedSession = flaggedSessionByStudent.get(sIdKey) || flaggedSessionByStudent.get(sRegKey);

    // Candidate is FLAGGED if marked on student record OR flagged in ANY exam room repository session!
    const isFlagged = s.status === 'flagged' || flaggedStudentKeys.has(sIdKey) || flaggedStudentKeys.has(sRegKey) || Boolean(flaggedSession);
    const activeSession = isFlagged ? (flaggedSession || latest) : latest;

    return {
      ...s,
      department: s.department ?? 'Computer Science',
      year: Number(s.year) || 1,
      semester: Number(s.semester) || 1,
      status: isFlagged ? 'flagged' : (latest?.status ?? s.status ?? 'in_progress'),
      score: isFlagged ? 0 : (latest ? Number(latest.score) : 0),
      flag_reason: activeSession?.flag_reason ?? (s as any).flag_reason ?? (isFlagged ? 'Proctoring integrity violation' : null),
      completed_at: activeSession?.completed_at ?? latest?.completed_at ?? null,
      session_id: activeSession?.id ?? latest?.id ?? null,
      room_id: activeSession?.room_id ?? latest?.room_id ?? null,
    };
  });
}

export async function fetchStudentByRegisterNo(registerNo: string): Promise<StudentWithSession | null> {
  const normReg = registerNo.trim();
  if (!normReg) return null;

  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('*')
    .ilike('register_no', normReg)
    .maybeSingle();

  if (sErr || !student) return null;

  const { data: sessions, error: eErr } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const latest = sessions && sessions.length > 0 ? sessions[0] : null;

  return {
    ...student,
    department: student.department ?? 'Electronics & Communication',
    year: Number(student.year) || 3,
    semester: Number(student.semester) || 5,
    status: latest?.status ?? 'in_progress',
    score: latest ? Number(latest.score) : 0,
    flag_reason: latest?.flag_reason ?? null,
    completed_at: latest?.completed_at ?? null,
    session_id: latest?.id ?? null,
    room_id: latest?.room_id ?? null,
  };
}

export async function fetchAllSessionsForStudent(studentId: string): Promise<ExamSession[]> {
  if (!studentId || studentId === 'default-candidate') return [];
  try {
    const { data, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('student_id', studentId);

    if (error || !data) return [];
    return data;
  } catch (err) {
    return [];
  }
}

export type StudentInput = Omit<Student, 'id' | 'created_at'>;

export async function createStudent(input: StudentInput): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      register_no: input.register_no,
      name: input.name,
      email: input.email,
      department: input.department,
      year: input.year,
      semester: input.semester,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchExamRooms(): Promise<ExamRoom[]> {
  const { data, error } = await supabase
    .from('exam_rooms')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type ExamRoomInput = Omit<ExamRoom, 'id' | 'created_at' | 'status'> & {
  status?: 'active' | 'completed' | 'archived';
};

export async function createExamRoom(input: ExamRoomInput): Promise<ExamRoom> {
  const { data, error } = await supabase
    .from('exam_rooms')
    .insert({
      title: input.title,
      room_code: input.room_code,
      department: input.department,
      year: input.year,
      semester: input.semester,
      duration_minutes: input.duration_minutes,
      status: input.status ?? 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExamRoom(id: string): Promise<void> {
  const { error } = await supabase.from('exam_rooms').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchQuestions(): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SEB API Error] Supabase fetchQuestions failed:', error.message || error);
      throw new Error(error.message || 'Database error while fetching questions.');
    }
    return data ?? [];
  } catch (err: any) {
    console.error('[SEB Fetch Exception]:', err);
    throw err;
  }
}


export type QuestionInput = Omit<Question, 'id' | 'created_at'>;

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      text: input.text,
      options: input.options,
      correct_index: input.correct_index,
      topic: input.topic,
      difficulty: input.difficulty,
      room_id: input.room_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .update({
      text: input.text,
      options: input.options,
      correct_index: input.correct_index,
      topic: input.topic,
      difficulty: input.difficulty,
      room_id: input.room_id || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
}

export async function submitExamSession(input: {
  student_id: string;
  room_id?: string;
  score: number;
  status: 'completed' | 'flagged';
  flag_reason?: string;
  answers: { question_id: string; selected_index: number; is_correct: boolean }[];
}) {
  let targetStudentId = input.student_id;

  // 1. Ensure student status & score are updated on students table
  try {
    const { data: existing } = await supabase
      .from('students')
      .select('id, register_no')
      .or(`id.eq.${input.student_id},register_no.eq.${input.student_id}`)
      .maybeSingle();

    if (existing) {
      targetStudentId = existing.id;
      await supabase
        .from('students')
        .update({
          status: input.status,
          score: input.score,
          flag_reason: input.flag_reason || null,
        })
        .eq('id', existing.id);
    } else {
      // Upsert new student record if testing with a new register number
      const { data: newStu } = await supabase
        .from('students')
        .upsert(
          {
            register_no: input.student_id,
            name: `Candidate ${input.student_id}`,
            department: 'Computer Science',
            year: 1,
            semester: 1,
            status: input.status,
            score: input.score,
            flag_reason: input.flag_reason || null,
          },
          { onConflict: 'register_no' }
        )
        .select()
        .maybeSingle();

      if (newStu) {
        targetStudentId = newStu.id;
      }
    }
  } catch (err) {
    console.warn('Could not update/upsert students table record:', err);
  }

  // 2. Insert into exam_sessions
  const { data: session, error: sErr } = await supabase
    .from('exam_sessions')
    .insert({
      student_id: targetStudentId,
      room_id: input.room_id || null,
      score: input.score,
      status: input.status,
      flag_reason: input.flag_reason || null,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sErr) console.error('Failed to insert exam_session:', sErr);

  if (input.answers.length > 0 && session) {
    const responses = input.answers.map((a) => ({
      session_id: session.id,
      question_id: a.question_id,
      selected_index: a.selected_index,
      is_correct: a.is_correct,
    }));
    await supabase.from('exam_responses').insert(responses);
  }

  return session;
}

export async function verifyAdminAuth(username: string, pass: string): Promise<boolean> {
  // Check against Supabase admin_users table
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('username', username.trim())
    .eq('password', pass.trim())
    .maybeSingle();

  if (!error && data) {
    return true;
  }

  // Secure client fallback for specified credentials
  return username.trim() === 'ece@quizportal' && (pass.trim() === 'Exora@ecquiz&maintain*portal' || pass.trim() === 'Sscet@ecquiz&maintain*portal');
}

export async function logProctoringIncident(input: {
  session_id?: string;
  event_type: string;
  details?: string;
}) {
  if (!input.session_id) return;
  await supabase.from('proctor_logs').insert({
    session_id: input.session_id,
    event_type: input.event_type,
    details: input.details || null,
  });
}

export function matchStudentToRoom(student: StudentWithSession, room: ExamRoom): boolean {
  const sDept = (student.department || 'Computer Science').toLowerCase().trim();
  const rDept = (room.department || '').toLowerCase().trim();
  const sYr = Number(student.year) || 1;
  const rYr = Number(room.year);
  const sSem = Number(student.semester) || 1;
  const rSem = Number(room.semester);

  const deptMatches = sDept === rDept || sDept.includes(rDept) || rDept.includes(sDept);
  const yrMatches = sYr === rYr;
  const semMatches = sSem === rSem;

  return deptMatches && yrMatches && semMatches;
}


export interface ExamResponseDetail {

  id: string;
  session_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  question?: Question;
}

export async function fetchStudentResponses(sessionId: string): Promise<ExamResponseDetail[]> {
  if (!sessionId) return [];

  try {
    const { data: responses, error } = await supabase
      .from('exam_responses')
      .select('*')
      .eq('session_id', sessionId);

    if (error || !responses || responses.length === 0) {
      return [];
    }

    const qIds = responses.map((r) => r.question_id);
    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .in('id', qIds);

    const qMap = new Map<string, Question>();
    (qData || []).forEach((q) => qMap.set(q.id, q));

    return responses.map((r) => ({
      ...r,
      question: qMap.get(r.question_id),
    }));
  } catch (err) {
    console.error('Failed to fetch student responses:', err);
    return [];
  }
}

export function getQuestionsForRoom(allQuestions: Question[], room: ExamRoom): Question[] {
  if (!allQuestions || allQuestions.length === 0 || !room) return [];

  const normRoomId = (room.id || '').toLowerCase().trim();
  const normRoomCode = (room.room_code || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  return allQuestions.filter((q) => {
    if (!q.room_id) return false;
    const qRoomId = q.room_id.toLowerCase().trim();
    const qRoomCode = q.room_id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return qRoomId === normRoomId || qRoomCode === normRoomCode;
  });
}
