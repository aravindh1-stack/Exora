import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Flag,
  Award,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import type { StudentWithSession } from '@/lib/types';
import type { Question } from '@/lib/types';
import { Skeleton, StatusDot } from './ui';

interface DashboardProps {
  students: StudentWithSession[];
  questions: Question[];
  loading: boolean;
}

export function Dashboard({ students, questions, loading }: DashboardProps) {
  const stats = useMemo(() => {
    const completed = students.filter((s) => s.status === 'completed');
    const inProgress = students.filter((s) => s.status === 'in_progress');
    const flagged = students.filter((s) => s.status === 'flagged');
    const avgScore =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, s) => sum + s.score, 0) / completed.length,
          )
        : 0;
    const passRate =
      completed.length > 0
        ? Math.round(
            (completed.filter((s) => s.score >= 60).length /
              completed.length) *
              100,
          )
        : 0;
    return {
      total: students.length,
      active: inProgress.length,
      completed: completed.length,
      flagged: flagged.length,
      avgScore,
      passRate,
      totalQuestions: questions.length,
    };
  }, [students, questions]);

  const scoreBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const s of students) {
      if (s.status === 'completed') {
        const b = Math.min(4, Math.floor(s.score / 20));
        buckets[b]++;
      }
    }
    return buckets;
  }, [students]);

  const maxBucket = Math.max(...scoreBuckets, 1);

  const topicBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) {
      map.set(q.topic, (map.get(q.topic) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [questions]);

  const maxTopic = Math.max(...topicBreakdown.map((t) => t[1]), 1);

  const recentActivity = useMemo(() => {
    return [...students]
      .sort(
        (a, b) =>
          new Date(b.completed_at ?? b.created_at).getTime() -
          new Date(a.completed_at ?? a.created_at).getTime(),
      )
      .slice(0, 5);
  }, [students]);

  const systemHealth =
    stats.flagged === 0
      ? 'ok'
      : stats.flagged <= 2
        ? 'warn'
        : 'down';

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Top Banner Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Proctoring Console
          </h2>

          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Real-time examination metrics, malpractice alerts & question analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live Engine Active
          </span>
        </div>
      </motion.div>

      {/* Bento Grid Architecture */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
        {/* Bento Card 1: Total Roster */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="panel-card group relative overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Students
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +12.4%
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            {stats.completed} exams completed
          </p>
        </motion.div>

        {/* Bento Card 2: Active Exams */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="panel-card group relative overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Active Sessions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.active}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              In Progress
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            {stats.flagged} flagged for malpractice review
          </p>
        </motion.div>

        {/* Bento Card 3: Avg Score */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="panel-card group relative overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Average Score
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.avgScore}%
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {stats.passRate}% pass
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Based on completed sessions
          </p>
        </motion.div>

        {/* Bento Card 4: System Integrity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="panel-card group relative overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              System Health
            </span>
            <StatusDot status={systemHealth as 'ok' | 'warn' | 'down'} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {systemHealth === 'ok'
                ? 'Healthy'
                : systemHealth === 'warn'
                  ? 'Warning'
                  : 'Critical'}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-zinc-900 dark:text-zinc-300">
              OK
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            {stats.totalQuestions} active questions in bank
          </p>
        </motion.div>

        {/* Hero Bento Box: Score Analytics Histogram (2 Cols Wide, 2 Rows Tall) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-2 lg:row-span-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-slate-700 dark:text-zinc-300" />
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Score Distribution Analytics
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Performance range of completed student examinations
              </p>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              5 Buckets
            </span>
          </div>

          {/* Histogram Bars */}
          <div className="mt-8 flex h-52 items-end justify-between gap-4 px-2">
            {['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'].map(
              (label, i) => {
                const count = scoreBuckets[i];
                const heightPct = (count / maxBucket) * 100;
                const isPassing = i >= 3;
                return (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center gap-2.5"
                  >
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct, 6)}%` }}
                        transition={{
                          delay: 0.25 + i * 0.05,
                          type: 'spring',
                          stiffness: 140,
                          damping: 20,
                        }}
                        className={`w-full max-w-[56px] rounded-t-lg transition-colors ${
                          isPassing
                            ? 'bg-slate-900 dark:bg-zinc-100'
                            : 'bg-slate-300 dark:bg-zinc-700'
                        }`}
                      >
                        {count > 0 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-900 dark:text-white">
                            {count}
                          </span>
                        )}
                      </motion.div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      {label}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800/80 text-xs">
            <span className="text-slate-500 dark:text-zinc-400">
              Total Examinees evaluated: <strong className="text-slate-900 dark:text-white">{stats.completed}</strong>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.passRate}% Passing Standard
            </span>
          </div>
        </motion.div>

        {/* Side Bento Box: Exam Session Integrity Status (1 Col Wide, 2 Rows Tall) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="panel-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-2 lg:row-span-2"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-slate-700 dark:text-zinc-300" />
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Session Integrity
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Live States
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              Real-time monitoring of proctored student sessions
            </p>

            <div className="mt-6 space-y-5">
              <BentoStatusBar
                label="Completed Exams"
                count={stats.completed}
                total={stats.total}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                barColor="bg-emerald-600 dark:bg-emerald-400"
              />
              <BentoStatusBar
                label="Active In-Progress"
                count={stats.active}
                total={stats.total}
                icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                barColor="bg-amber-500 dark:bg-amber-400"
              />
              <BentoStatusBar
                label="Flagged Malpractice"
                count={stats.flagged}
                total={stats.total}
                icon={<Flag className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                barColor="bg-rose-600 dark:bg-rose-400"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200">
              <span>Proctoring Alert Status</span>
              <span className={stats.flagged > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {stats.flagged === 0 ? 'Clear' : `${stats.flagged} Review`}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
              {stats.flagged === 0
                ? 'No unauthorized window switching or tab changes recorded.'
                : 'Malpractice flags require administrator review in the Students panel.'}
            </p>
          </div>
        </motion.div>

        {/* Wide Bento Box: Questions by Subject / Topic */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="panel-card rounded-2xl p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-slate-700 dark:text-zinc-300" />
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Question Bank Topics
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {questions.length} Items
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Distribution of multiple-choice questions across subjects
          </p>

          <div className="mt-5 space-y-3">
            {topicBreakdown.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-zinc-500">
                No questions created yet.
              </p>
            ) : (
              topicBreakdown.map(([topic, count], i) => (
                <div key={topic} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs font-medium text-slate-700 dark:text-zinc-300">
                    {topic}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-zinc-900">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxTopic) * 100}%` }}
                      transition={{
                        delay: 0.3 + i * 0.04,
                        type: 'spring',
                        stiffness: 140,
                        damping: 20,
                      }}
                      className="absolute inset-y-0 left-0 rounded-md bg-slate-800 dark:bg-zinc-200"
                    />
                    <span className="relative flex h-full items-center px-2.5 text-[11px] font-bold text-slate-900 dark:text-white">
                      {count} questions
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Wide Bento Box: Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="panel-card rounded-2xl p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Recent Submissions
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              Latest 5
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Latest student exam completions & session statuses
          </p>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-zinc-800/60">
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-zinc-500">
                No recent exam activity recorded.
              </p>
            ) : (
              recentActivity.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        s.status === 'flagged'
                          ? 'bg-rose-600'
                          : s.status === 'in_progress'
                            ? 'bg-amber-600'
                            : 'bg-slate-900 dark:bg-zinc-100 dark:text-black'
                      }`}
                    >
                      {s.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {s.name}
                      </p>
                      <p className="truncate text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        {s.register_no}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-xs font-bold ${
                        s.status === 'flagged'
                          ? 'text-rose-600 dark:text-rose-400'
                          : s.status === 'in_progress'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {s.status === 'in_progress' ? 'Active' : `${s.score}%`}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-semibold capitalize ${
                        s.status === 'flagged'
                          ? 'text-rose-600 dark:text-rose-400'
                          : s.status === 'in_progress'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BentoStatusBar({
  label,
  count,
  total,
  icon,
  barColor,
}: {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  barColor: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-900">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
}


