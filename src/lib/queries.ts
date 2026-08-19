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
  for (const s of sessions ?? []) {
    if (!latestByStudent.has(s.student_id)) latestByStudent.set(s.student_id, s);
  }

  return (students ?? []).map((s: Student) => {
    const latest = latestByStudent.get(s.id);
    return {
      ...s,
      department: s.department ?? 'Computer Science',
      year: Number(s.year) || 1,
      semester: Number(s.semester) || 1,
      status: latest?.status ?? 'in_progress',
      score: latest ? Number(latest.score) : 0,
      flag_reason: latest?.flag_reason ?? null,
      completed_at: latest?.completed_at ?? null,
      session_id: latest?.id ?? null,
      room_id: latest?.room_id ?? null,
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
  if (!studentId) return [];
  try {
    const { data, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('student_id', studentId);

    if (error || !data) return [];
    return data;
  } catch (err) {
    console.error('Error fetching student sessions', err);
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
  const { data: session, error: sErr } = await supabase
    .from('exam_sessions')
    .insert({
      student_id: input.student_id,
      room_id: input.room_id || null,
      score: input.score,
      status: input.status,
      flag_reason: input.flag_reason || null,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sErr) throw sErr;

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
    console.error('Error fetching student exam responses:', err);
    return [];
  }
}





