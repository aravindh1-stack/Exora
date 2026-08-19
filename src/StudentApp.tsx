import { useState, useEffect, useCallback } from 'react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { StudentPortal } from '@/components/StudentPortal';
import { LandingPage } from '@/components/LandingPage';
import { fetchQuestions, fetchStudentsWithSessions, fetchExamRooms } from '@/lib/queries';
import { safeStorage } from '@/lib/storage';
import { PortalErrorBoundary } from '@/components/PortalErrorBoundary';

export function StudentApp() {
  const [students, setStudents] = useState<StudentWithSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Skip the landing page automatically if a session is already mid-flight
  // (e.g. URL has ?reg=&room= or SEB relaunch) so we never interrupt an active exam.
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasActiveSession =
      params.get('reg') || safeStorage.getItem('exora_session_reg');
    return !hasActiveSession;
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [sData, qData, rData] = await Promise.all([
        fetchStudentsWithSessions(),
        fetchQuestions(),
        fetchExamRooms(),
      ]);
      setStudents(sData);
      setQuestions(qData);
      setRooms(rData);
    } catch (e: any) {
      console.error('Failed to load student portal data', e);
      setApiError(e?.message || 'Failed to connect to backend database inside Safe Exam Browser.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (showLanding) {
    return <LandingPage onEnterPortal={() => setShowLanding(false)} />;
  }

  return (
    <div className="relative min-h-screen bg-[#f7f8fa] text-brand-900 transition-colors duration-200 dark:bg-[#08090b] dark:text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-light bg-grid opacity-60 dark:bg-grid-dark dark:opacity-30" />
      <PortalErrorBoundary>
        <StudentPortal
          students={students}
          rooms={rooms}
          questions={questions}
          onExamSubmitted={loadData}
          apiError={apiError}
          onRetryFetch={loadData}
          loading={loading}
        />
      </PortalErrorBoundary>
    </div>
  );
}
