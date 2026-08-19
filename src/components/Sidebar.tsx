import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  DoorOpen,
  FileQuestion,
  Users,
  ShieldCheck,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { Section } from '@/lib/types';

interface SidebarProps {
  active: Section;
  onChange: (s: Section) => void;
  studentCount: number;
  questionCount: number;
  roomCount?: number;
}

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rooms', label: 'Exam Rooms', icon: DoorOpen },
  { id: 'questions', label: 'Questions', icon: FileQuestion },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export function Sidebar({ active, onChange, studentCount, questionCount, roomCount = 0 }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-200/70 bg-white transition-colors dark:border-zinc-800/70 dark:bg-[#0a0b0d] md:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-200/80 dark:border-zinc-800/80">
        <img
          src="/aarga-logo.png"
          alt="Aarga Logo"
          className="h-9 w-auto max-w-[120px] object-contain"
          onError={(e) => {
            // fallback if logo fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
        <div>
          <h1 className="font-display text-[15px] font-bold tracking-tight text-brand-950 dark:text-white">
            Exora Admin
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 dark:text-zinc-500">
            Proctor Console
          </p>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-3">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-brand-300 dark:text-zinc-600">
          Admin Workspace
        </p>
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          const badge =
            item.id === 'students'
              ? studentCount
              : item.id === 'questions'
                ? questionCount
                : item.id === 'rooms'
                  ? roomCount
                  : null;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'text-brand-950 dark:text-white'
                  : 'text-brand-500 hover:bg-brand-50 hover:text-brand-950 dark:text-zinc-400 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-100'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-brand-200 bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon
                className={`relative h-4 w-4 ${
                  isActive ? 'text-brand-950 dark:text-zinc-100' : 'text-brand-400 dark:text-zinc-500'
                }`}
                strokeWidth={1.8}
              />
              <span className="relative">{item.label}</span>
              {badge !== null && (
                <span
                  className={`relative ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                    isActive
                      ? 'bg-brand-200/80 text-brand-950 dark:bg-zinc-800 dark:text-zinc-200'
                      : 'bg-brand-50 text-brand-400 dark:bg-zinc-900 dark:text-zinc-500'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pb-5">
        <div className="rounded-xl border border-brand-200/70 bg-brand-50/60 p-3.5 dark:border-zinc-800/70 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-brand-950 dark:text-zinc-200">
              System Operational
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-normal text-brand-400 dark:text-zinc-500">
            Real-time monitoring active. Integrity engines ready.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-200/70 bg-white/95 backdrop-blur-md dark:border-zinc-800/70 dark:bg-[#08090b]/95 md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-brand-950 dark:text-white' : 'text-brand-400 dark:text-zinc-500'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-lg bg-brand-50 dark:bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="relative h-4.5 w-4.5" strokeWidth={1.8} />
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
