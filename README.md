# 🛡️ Exora — Enterprise AI & Online Exam Proctoring Platform

Exora is a modern, high-performance Online Exam Proctoring & Assessment Management Platform featuring targeted exam rooms, candidate roster isolation, live proctoring anti-cheat telemetry, and real-time auto-grading powered by Supabase.

---

## ✨ Features

- 🏛️ **Targeted Exam Rooms**: Create exam rooms restricted strictly to specific Departments, Years, and Semesters.
- 👥 **Candidate Roster Management**: Academic profiles with SIN Number, Department, Year, and Semester metadata.
- 🎓 **Standalone Student Exam Portal**: Distraction-free candidate portal for `exora.aarga.org`.
- 🛡️ **Admin Proctor Console**: Bento grid analytics dashboard for `adminatexora.aarga.org`.
- ⏳ **Live Countdown Timer & Navigator**: Interactive question palette with auto-submission.
- ⚠️ **Anti-Cheat Proctoring Engine**: Real-time tab switching detection and proctoring telemetry logging.
- 🌙 **Pitch Black Dark & Clean Light Modes**: Customized Bento grid UI built with Tailwind CSS and Framer Motion.

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend / Database**: Supabase (PostgreSQL), Supabase Realtime & RLS Policies.

---

## 🛠️ Quick Start

```bash
# Clone the repository
git clone https://github.com/aravindh1-stack/Exora.git

# Navigate into project directory
cd exora

# Install dependencies
npm install

# Set up Environment Variables in .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Start Development Server
npm run dev
```
