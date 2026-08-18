import { useState, useEffect, useCallback } from 'react';
import type { StudentWithSession, ExamRoom, Question } from '@/lib/types';
import { PortalErrorBoundary } from '@/components/PortalErrorBoundary';

export function StudentApp() {
  const [students, setStudents] = useState<StudentWithSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
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


