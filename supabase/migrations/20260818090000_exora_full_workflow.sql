/*
  # Exora Exam Portal — Comprehensive Database Schema & Seed Data
  
  1. Core Tables:
     - `questions`: MCQ bank with options, correct answer index, topic, & difficulty.
     - `students`: Student candidate roster with unique register numbers.
     - `exam_sessions`: Tracks student exam state ('completed', 'in_progress', 'flagged'), score %, and flag reason.
     - `exam_responses`: Tracks student answers for each question during an exam.
     - `proctor_logs`: Anti-cheat incident log (tab switching, fullscreen exit, copy-paste attempts).
     
  2. Realtime & RLS:
     - Full RLS policies for `anon` and `authenticated` roles.
     - Realtime publication enabled for `exam_sessions` and `proctor_logs`.
     
  3. Seed Data:
     - Sample question bank, student roster, and live exam session records.
*/

-- 1. Create Core Tables
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  options text[] NOT NULL,
  correct_index int NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  topic text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'Computer Science',
  year int NOT NULL DEFAULT 1 CHECK (year BETWEEN 1 AND 4),
  semester int NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure existing students table has the new columns if it already existed
ALTER TABLE students ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'Computer Science';
ALTER TABLE students ADD COLUMN IF NOT EXISTS year int NOT NULL DEFAULT 1 CHECK (year BETWEEN 1 AND 4);
ALTER TABLE students ADD COLUMN IF NOT EXISTS semester int NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 8);


CREATE TABLE IF NOT EXISTS exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('completed','in_progress','flagged')),
  score numeric(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_index int CHECK (selected_index BETWEEN 0 AND 3),
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- e.g. 'tab_switch', 'fullscreen_exit', 'copy_attempt'
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for High-Performance Querying
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exam_responses_session ON exam_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_session ON proctor_logs(session_id);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctor_logs ENABLE ROW LEVEL SECURITY;

-- Questions Policies
DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_questions" ON questions;
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_questions" ON questions;
CREATE POLICY "anon_update_questions" ON questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_questions" ON questions;
CREATE POLICY "anon_delete_questions" ON questions FOR DELETE TO anon, authenticated USING (true);

-- Students Policies
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- Exam Sessions Policies
DROP POLICY IF EXISTS "anon_select_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_select_exam_sessions" ON exam_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_insert_exam_sessions" ON exam_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_update_exam_sessions" ON exam_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_delete_exam_sessions" ON exam_sessions FOR DELETE TO anon, authenticated USING (true);

-- Exam Responses Policies
DROP POLICY IF EXISTS "anon_crud_exam_responses" ON exam_responses;
CREATE POLICY "anon_crud_exam_responses" ON exam_responses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Proctor Logs Policies
DROP POLICY IF EXISTS "anon_crud_proctor_logs" ON proctor_logs;
CREATE POLICY "anon_crud_proctor_logs" ON proctor_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for Live Admin Dashboard Updates
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE exam_sessions, proctor_logs;
COMMIT;

-- 5. Seed Initial Data (Sample Questions & Students)
INSERT INTO questions (text, options, correct_index, topic, difficulty) VALUES
  ('What is the time complexity of searching in a balanced Binary Search Tree (BST)?', ARRAY['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 1, 'Data Structures', 'medium'),
  ('Which HTTP status code represents "Internal Server Error"?', ARRAY['200', '404', '403', '500'], 3, 'Web Development', 'easy'),
  ('What is the primary function of the Event Loop in Node.js?', ARRAY['Handling multi-threading', 'Processing non-blocking I/O callbacks', 'Compiling JavaScript to C++', 'Managing SQL transactions'], 1, 'Node.js', 'hard'),
  ('Which SQL clause is used to filter records after aggregation?', ARRAY['WHERE', 'ORDER BY', 'HAVING', 'GROUP BY'], 2, 'Databases', 'medium'),
  ('What does ACID stand for in Database Management Systems?', ARRAY['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Index, Data', 'Array, Code, Input, Output', 'Async, Concurrent, Internal, Direct'], 0, 'Databases', 'easy'),
  ('What is the default port for HTTP traffic?', ARRAY['21', '80', '443', '8080'], 1, 'Networking', 'easy'),
  ('In React, what hook is primarily used for handling side effects?', ARRAY['useState', 'useContext', 'useEffect', 'useReducer'], 2, 'React', 'easy'),
  ('Which algorithm is used for finding the shortest path in a weighted graph?', ARRAY['Kruskal', 'Dijkstra', 'Prim', 'BFS'], 1, 'Algorithms', 'hard'),
  ('What is the purpose of CORS in web security?', ARRAY['Encrypting passwords', 'Restricting cross-origin HTTP requests', 'Managing JWT tokens', 'Optimizing CSS loading'], 1, 'Security', 'medium'),
  ('What is a Closure in JavaScript?', ARRAY['A function bundled with references to its lexical environment', 'A method to close DB connections', 'A CSS layout grid property', 'A type of promise rejection'], 0, 'JavaScript', 'medium')
ON CONFLICT DO NOTHING;

INSERT INTO students (register_no, name, email) VALUES
  ('REG2026001', 'Aarav Sharma', 'aarav.sharma@univ.edu'),
  ('REG2026002', 'Priya Raman', 'priya.raman@univ.edu'),
  ('REG2026003', 'Karthik Subramanian', 'karthik.s@univ.edu'),
  ('REG2026004', 'Ananya Roy', 'ananya.roy@univ.edu'),
  ('REG2026005', 'Vikramaditya Singh', 'vikram.singh@univ.edu'),
  ('REG2026006', 'Divya Nair', 'divya.nair@univ.edu'),
  ('REG2026007', 'Rohan Mehta', 'rohan.mehta@univ.edu'),
  ('REG2026008', 'Siddharth Patel', 'sid.patel@univ.edu'),
  ('REG2026009', 'Meera Joshi', 'meera.joshi@univ.edu'),
  ('REG2026010', 'Rahul Verma', 'rahul.verma@univ.edu')
ON CONFLICT (register_no) DO NOTHING;

-- Insert Sample Exam Sessions
DO $$
DECLARE
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid; s7 uuid; s8 uuid; s9 uuid; s10 uuid;
BEGIN
  SELECT id INTO s1 FROM students WHERE register_no = 'REG2026001';
  SELECT id INTO s2 FROM students WHERE register_no = 'REG2026002';
  SELECT id INTO s3 FROM students WHERE register_no = 'REG2026003';
  SELECT id INTO s4 FROM students WHERE register_no = 'REG2026004';
  SELECT id INTO s5 FROM students WHERE register_no = 'REG2026005';
  SELECT id INTO s6 FROM students WHERE register_no = 'REG2026006';
  SELECT id INTO s7 FROM students WHERE register_no = 'REG2026007';
  SELECT id INTO s8 FROM students WHERE register_no = 'REG2026008';
  SELECT id INTO s9 FROM students WHERE register_no = 'REG2026009';
  SELECT id INTO s10 FROM students WHERE register_no = 'REG2026010';

  IF s1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exam_sessions WHERE student_id = s1) THEN
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s1, 'completed', 90.00, now() - interval '1 hour');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s2, 'completed', 85.00, now() - interval '2 hours');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s3, 'completed', 70.00, now() - interval '3 hours');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s5, 'completed', 50.00, now() - interval '4 hours');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s6, 'completed', 80.00, now() - interval '5 hours');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s7, 'completed', 65.00, now() - interval '6 hours');
    INSERT INTO exam_sessions (student_id, status, score, completed_at) VALUES (s8, 'completed', 88.00, now() - interval '15 minutes');
    INSERT INTO exam_sessions (student_id, status, score, flag_reason) VALUES (s9, 'flagged', 40.00, 'Tab switch detected 4 times during examination');
    INSERT INTO exam_sessions (student_id, status, score) VALUES (s10, 'in_progress', 0.00);
  END IF;
END $$;

-- 6. Targeted Exam Rooms Table
CREATE TABLE IF NOT EXISTS exam_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  room_code text NOT NULL UNIQUE,
  department text NOT NULL DEFAULT 'Computer Science',
  year int NOT NULL DEFAULT 1 CHECK (year BETWEEN 1 AND 4),
  semester int NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 8),
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Link questions and exam_sessions to exam_rooms
ALTER TABLE questions ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES exam_rooms(id) ON DELETE CASCADE;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES exam_rooms(id) ON DELETE CASCADE;

-- RLS Policies for exam_rooms
ALTER TABLE exam_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_crud_exam_rooms" ON exam_rooms;
CREATE POLICY "anon_crud_exam_rooms" ON exam_rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for exam_rooms
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE exam_sessions, proctor_logs, exam_rooms;
COMMIT;

-- 7. Admin Authentication Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_admin_users" ON admin_users;
CREATE POLICY "anon_crud_admin_users" ON admin_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO admin_users (username, password) VALUES
  ('ece@quizportal', 'Sscet@ecquiz&maintain*portal')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;


