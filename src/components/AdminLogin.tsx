import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { verifyAdminAuth } from '@/lib/queries';
import { Spinner } from './ui';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="panel-card w-full max-w-md rounded-2xl p-6 sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-subtle dark:bg-zinc-100 dark:text-black">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Exora Admin Authentication
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Strictly restricted access for authorized exam proctors.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Admin Username *
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ece@quizportal"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Security Password *
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-pitch-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-subtle transition hover:bg-slate-800 disabled:opacity-50 active:scale-[0.99] dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? (
              <>
                <Spinner size={16} /> Authenticating...
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
  );
}
