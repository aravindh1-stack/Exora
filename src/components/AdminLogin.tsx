import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Activity,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { verifyAdminAuth } from '@/lib/queries';
import { Spinner } from './ui';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToLanding?: () => void;
}

export function AdminLogin({ onSuccess, onBackToLanding }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please enter your admin username and password.');
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyAdminAuth(username, password);
      if (isValid) {
        localStorage.setItem('exora_admin_authed', 'true');
        onSuccess();
      } else {
        setError('Invalid admin credentials. Access denied.');
      }
    } catch (e) {
      console.error(e);
      setError('Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#f7f8fa] text-brand-950 dark:bg-[#08090b] dark:text-zinc-100">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        {/* Left / Hero Side */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#08090b] p-10 text-white lg:col-span-5 lg:flex xl:col-span-5 xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-dark bg-grid opacity-30" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-fade-radial opacity-60" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img
                src="/aarga-logo.png"
                alt="Aarga Logo"
                className="h-10 w-auto max-w-[140px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <span className="font-display text-xl font-bold tracking-tight text-white">
                  Exora Admin
                </span>
                <span className="ml-2.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-zinc-400">
                  Proctor Control
                </span>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 my-auto py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Proctoring Security Suite Active</span>
            </span>

            <h1 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Centralized Exam Room &amp; Proctor Management
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Configure targeted examination rooms, publish questions, monitor live proctoring telemetry, and review auto-graded reports across all departments.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-200">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Restricted Proctor Authorization</h4>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Row Level Security (RLS) enforcement ensures authenticated admin control.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-200">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Automated Integrity Tracking</h4>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Real-time incident logs surface malpractice flags directly to your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="relative z-10 border-t border-zinc-800/80 pt-6 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zinc-400" />
              <span>SSCET Administrative Console • Exora Core</span>
            </div>
          </div>
        </div>

        {/* Right / Form Side */}
        <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:px-14 lg:py-12 xl:col-span-7 xl:px-20">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-950 text-white dark:bg-white dark:text-brand-950 shadow-subtle">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="font-display font-bold text-brand-950 dark:text-white">
                Exora Admin
              </span>
            </div>

            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-brand-500 transition hover:text-brand-950 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Overview</span>
              </button>
            )}
          </div>

          {/* Form Workspace */}
          <div className="my-auto py-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mx-auto max-w-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-white shadow-subtle dark:bg-white dark:text-brand-950">
                <KeyRound className="h-6 w-6" />
              </div>

              <h2 className="font-display mt-5 text-2xl font-bold tracking-tight text-brand-950 dark:text-white sm:text-3xl">
                Proctor Admin Console
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-brand-500 dark:text-zinc-400 sm:text-sm">
                Enter your administrative credentials to manage exam rooms, question banks, and student metrics.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="mt-8 space-y-5"
              >
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-zinc-400">
                    Admin Username *
                  </label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ece@quizportal"
                      className="w-full rounded-xl border border-brand-200 bg-white py-3 pl-10 pr-4 text-xs font-normal text-brand-950 placeholder:text-brand-300 outline-none transition focus:border-brand-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-zinc-400">
                    Security Password *
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400 dark:text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-brand-200 bg-white py-3 pl-10 pr-4 text-xs font-normal text-brand-950 placeholder:text-brand-300 outline-none transition focus:border-brand-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-950 py-3.5 text-xs font-medium uppercase tracking-wider text-white shadow-elevated transition hover:bg-brand-800 disabled:opacity-50 active:scale-[0.99] dark:bg-white dark:text-brand-950 dark:hover:bg-zinc-200"
                >
                  {loading ? (
                    <>
                      <Spinner size={16} /> Authenticating Admin...
                    </>
                  ) : (
                    <>
                      <span>Login to Admin Console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Footer Security Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-200/60 pt-4 text-xs text-brand-400 dark:border-zinc-800 dark:text-zinc-500">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Authorized Proctoring Scope
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Encrypted Session Token
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
