import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  Timer,
  BarChart3,
  Lock,
  Activity,
  CheckCircle2,
  GraduationCap,
  User,
} from 'lucide-react';

interface LandingPageProps {
  onEnterPortal: () => void;
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Safe Exam Browser Lockdown',
    desc: 'Restricts external tools and unapproved applications for the full duration of every session.',
  },
  {
    icon: Activity,
    title: 'Live Proctoring Telemetry',
    desc: 'Real-time tab-switch detection and automated malpractice flags surfaced to your admin console.',
  },
  {
    icon: Timer,
    title: 'Persistent Session Timing',
    desc: 'Countdown state survives reloads and reconnects, so interruptions never cost a student time.',
  },
  {
    icon: BarChart3,
    title: 'Instant Evaluation',
    desc: 'Auto-graded scoring and topic-level analytics the moment a session is submitted.',
  },
];

const STATS = [
  { label: 'Uptime SLA', value: '99.9%' },
  { label: 'Avg. Grading Latency', value: '<1s' },
  { label: 'Proctoring Signals', value: '24/7' },
];

export function LandingPage({ onEnterPortal }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8fa] text-brand-900 dark:bg-[#08090b] dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-grid-light bg-grid opacity-70 dark:bg-grid-dark dark:opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-fade-radial dark:opacity-40" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white dark:bg-white dark:text-brand-900">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Exora</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onEnterPortal}
            className="flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/90 p-1.5 pr-4 text-xs font-bold text-brand-900 shadow-subtle transition hover:border-brand-300 hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            title="Student Portal Access / Sign In"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-900 text-white dark:bg-white dark:text-brand-900">
              <User className="h-4 w-4" />
            </div>
            <span>Student Portal Sign In</span>
          </button>
        </div>
      </header>



      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10 sm:px-8 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-600 shadow-subtle dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Proctoring Engine Online
          </span>

          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-6xl">
            Secure examinations,
            <br />
            <span className="text-brand-500 dark:text-zinc-400">built for enterprise scale.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-brand-500 dark:text-zinc-400 sm:text-base">
            Exora combines Safe Exam Browser lockdown, real-time proctoring telemetry, and instant
            auto-grading into a single, dependable examination workflow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onEnterPortal}
              className="flex items-center gap-2 rounded-xl bg-brand-900 px-6 py-3.5 text-sm font-bold text-white shadow-elevated transition hover:bg-brand-800 active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
            >
              <GraduationCap className="h-4.5 w-4.5" />
              Enter Student Portal
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-brand-200/70 rounded-2xl border border-brand-200/70 bg-white/70 py-6 backdrop-blur-sm dark:divide-zinc-800/70 dark:border-zinc-800/70 dark:bg-zinc-950/50"
        >
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl font-bold text-brand-950 dark:text-white">
                {s.value}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-brand-400 dark:text-zinc-500">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                className="panel-card flex items-start gap-4 p-5 dark:bg-zinc-950/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-950 dark:text-white">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-brand-500 dark:text-zinc-400">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-brand-400 dark:text-zinc-500"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> RLS-secured data layer
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-500" /> Session-isolated exam state
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SEB-verified environments
          </span>
        </motion.div>
      </main>
    </div>
  );
}
