export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  topic: string;
  difficulty: Difficulty;
  room_id?: string | null;
  created_at: string;
}

export type StudentStatus = 'completed' | 'in_progress' | 'flagged';

export interface Student {
  id: string;
  register_no: string;
  name: string;
  email: string;
  department: string;
  year: number;
  semester: number;
  created_at: string;
}

export interface ExamRoom {
  id: string;
  title: string;
  room_code: string;
  department: string;
  year: number;
  semester: number;
  duration_minutes: number;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export interface ExamSession {
  id: string;
  student_id: string;
  room_id?: string | null;
  status: StudentStatus;
  score: number;
  started_at: string;
  completed_at: string | null;
  flag_reason: string | null;
  created_at: string;
}

export interface StudentWithSession extends Student {
  status: StudentStatus;
  score: number;
  flag_reason: string | null;
  completed_at: string | null;
  session_id: string | null;
  room_id?: string | null;
}

export type Section = 'dashboard' | 'rooms' | 'questions' | 'students' | 'reports';

