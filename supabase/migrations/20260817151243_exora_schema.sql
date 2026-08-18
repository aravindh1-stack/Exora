/*
# Exora Exam Portal — Initial Schema (single-tenant admin panel, no auth)

1. Overview
This migration creates the core data model for the Exora admin panel: a question bank
of multiple-choice questions, a roster of students, and exam sessions that track each
student's score and malpractice status. No user accounts are required — the admin panel
is a single-tenant tool that reads/writes as the anon role.

2. New Tables
- `questions`
  - `id` uuid primary key
  - `text` text — the MCQ prompt
  - `options` text[4] — exactly four answer choices (enforced by app)
  - `correct_index` int 0–3 — index of the correct option
  - `topic` text — category/subject tag
  - `difficulty` text — 'easy' | 'medium' | 'hard'
  - `created_at` timestamptz default now()
- `students`
  - `id` uuid primary key
  - `register_no` text unique — student register number
  - `name` text
  - `email` text
  - `created_at` timestamptz default now()
- `exam_sessions`
  - `id` uuid primary key
  - `student_id` uuid FK -> students.id (cascade delete)
  - `status` text — 'completed' | 'in_progress' | 'flagged'
  - `score` numeric 0–100
  - `started_at` timestamptz
  - `completed_at` timestamptz nullable
  - `flag_reason` text nullable — why flagged for malpractice
  - `created_at` timestamptz default now()

3. Indexes
- `exam_sessions` on `student_id` and `status` for the monitoring table queries.

4. Security
- RLS enabled on all three tables.
- No sign-in screen → policies are `TO anon, authenticated` (shared admin tool data).
- Full CRUD permitted to anon + authenticated.

5. Notes
- The app enforces that `options` has exactly four entries and `correct_index` is in 0..3.
- `exam_sessions.score` is a percentage (0–100). System health is derived from session data.
*/

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
  created_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- questions: anon + authenticated CRUD
DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_questions" ON questions;
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_questions" ON questions;
CREATE POLICY "anon_update_questions" ON questions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_questions" ON questions;
CREATE POLICY "anon_delete_questions" ON questions FOR DELETE
  TO anon, authenticated USING (true);

-- students: anon + authenticated CRUD
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);

-- exam_sessions: anon + authenticated CRUD
DROP POLICY IF EXISTS "anon_select_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_select_exam_sessions" ON exam_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_insert_exam_sessions" ON exam_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_update_exam_sessions" ON exam_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_exam_sessions" ON exam_sessions;
CREATE POLICY "anon_delete_exam_sessions" ON exam_sessions FOR DELETE
  TO anon, authenticated USING (true);
