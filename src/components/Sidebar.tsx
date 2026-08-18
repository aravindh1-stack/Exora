import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  DoorOpen,
  FileQuestion,
  Users,
  ShieldCheck,
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
];

export function Sidebar({
  active,
  onChange,
  studentCount,
  questionCount,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-colors dark:border-zinc-800/80 dark:bg-pitch-950 md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-black">
          <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Exora
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Exam Portal
          </p>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          const badge =
            item.id === 'students'
              ? studentCount
              : item.id === 'questions'
                ? questionCount
                : null;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon
                className={`relative h-4 w-4 ${
                  isActive
                    ? 'text-slate-900 dark:text-zinc-100'
                    : 'text-slate-400 dark:text-zinc-500'
                }`}
                strokeWidth={2}
              />
              <span className="relative">{item.label}</span>
              {badge !== null && (
                <span
                  className={`relative ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? 'bg-slate-200/80 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-500'
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              System Operational
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-normal text-slate-500 dark:text-zinc-500">
            Real-time monitoring active. Integrity engines ready.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-black/95 md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-zinc-500'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-lg bg-slate-100 dark:bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="relative h-4.5 w-4.5" strokeWidth={2} />
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

