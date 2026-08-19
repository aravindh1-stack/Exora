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
  KeyRound,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onEnterPortal: () => void;
  onEnterAdmin?: () => void;
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

const TELEMETRY_STATS = [
  { label: 'Uptime SLA', value: '99.9%', trend: 'Operational' },
  { label: 'Grading Latency', value: '<250ms', trend: 'Real-Time' },
  { label: 'Proctoring Telemetry', value: '24/7 Active', trend: 'Encrypted' },
];

export function LandingPage({ onEnterPortal, onEnterAdmin }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8fa] text-brand-900 dark:bg-[#08090b] dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-grid-light bg-grid opacity-70 dark:bg-grid-dark dark:opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-fade-radial dark:opacity-40" />

      {/* Header Navigation */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <img
            src="/aarga-logo.png"
            alt="Aarga Logo"
            className="h-9 w-auto max-w-[120px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-brand-950 dark:text-white">
              Exora
            </span>
            <span className="ml-2 rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              v3.0.0 Enterprise
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onEnterAdmin && (
            <button
              onClick={onEnterAdmin}
              className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </button>
          )}

          <button
            onClick={onEnterPortal}
            className="flex items-center gap-2 rounded-xl bg-brand-950 px-4 py-2 text-xs font-bold text-white shadow-subtle transition hover:bg-brand-800 active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
          >
            <User className="h-3.5 w-3.5" />
            <span>Student Sign In</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10 sm:px-8 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700 shadow-subtle dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Uptime Engine Online</span>
          </span>

          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-6xl">
            Enterprise Examination &amp;
            <br />
            <span className="text-brand-500 dark:text-zinc-400">Proctoring Platform</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-brand-500 dark:text-zinc-400 sm:text-base">
            Exora combines Safe Exam Browser lockdown, real-time proctoring telemetry, and instant
            auto-grading into a frictionless institutional assessment workflow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onEnterPortal}
              className="flex items-center gap-2.5 rounded-xl bg-brand-950 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-elevated transition hover:bg-brand-800 active:scale-[0.98] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Enter Student Portal</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {onEnterAdmin && (
              <button
                onClick={onEnterAdmin}
                className="flex items-center gap-2 rounded-xl border border-brand-200/80 bg-white px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-800 shadow-subtle transition hover:bg-brand-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <KeyRound className="h-4 w-4 text-brand-500 dark:text-zinc-400" />
                <span>Admin Proctor Console</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Telemetry Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-1 divide-y divide-brand-200/70 rounded-2xl border border-brand-200/70 bg-white/80 backdrop-blur-md dark:divide-zinc-800/70 dark:border-zinc-800/70 dark:bg-zinc-950/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {TELEMETRY_STATS.map((s) => (
            <div key={s.label} className="p-5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                <span>{s.trend}</span>
              </div>
              <p className="font-display mt-1 text-2xl font-bold text-brand-950 dark:text-white">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-brand-400 dark:text-zinc-500">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                className="panel-card flex items-start gap-4 p-5 dark:bg-[#0c0d10]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-900 dark:bg-zinc-900 dark:text-zinc-100">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-brand-950 dark:text-white">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-brand-500 dark:text-zinc-400">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-brand-400 dark:text-zinc-500"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> RLS-Secured Database Layer
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-500" /> Multi-tier safeStorage Fallback
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SEB Kiosk Lockdown Compliant
          </span>
        </motion.div>
      </main>
    </div>
  );
}
