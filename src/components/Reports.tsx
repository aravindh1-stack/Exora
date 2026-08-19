import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  FileText,
  Award,
  CheckCircle2,
  Flag,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import type { StudentWithSession, ExamRoom } from '@/lib/types';
import { Skeleton } from './ui';

interface ReportsProps {
  students: StudentWithSession[];
  rooms?: ExamRoom[];
  loading?: boolean;
}

export function Reports({ students, rooms = [], loading = false }: ReportsProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Derive unique department list from students and rooms
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    students.forEach((s) => {
      if (s.department) deptSet.add(s.department);
    });
    rooms.forEach((r) => {
      if (r.department) deptSet.add(r.department);
    });
    return Array.from(deptSet);
  }, [students, rooms]);

  // Filtered Students List based on Department, Status, and Search
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesDept =
        selectedDept === 'all' ||
        student.department.toLowerCase() === selectedDept.toLowerCase();

      const matchesStatus =
        selectedStatus === 'all' || student.status === selectedStatus;

      const matchesSearch =
        search.trim() === '' ||
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.register_no.toLowerCase().includes(search.toLowerCase()) ||
        student.department.toLowerCase().includes(search.toLowerCase());

      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [students, selectedDept, selectedStatus, search]);

  // Performance KPI Metrics based on Filtered Data
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const completed = filteredStudents.filter((s) => s.status === 'completed');
    const flagged = filteredStudents.filter((s) => s.status === 'flagged');

    const totalScoreSum = completed.reduce((acc, s) => acc + (s.score || 0), 0);
    const avgScore = completed.length > 0 ? (totalScoreSum / completed.length).toFixed(1) : '—';

    const distinctionCount = completed.filter((s) => s.score >= 80).length;

    return {
      total,
      completedCount: completed.length,
      flaggedCount: flagged.length,
      avgScore: avgScore !== '—' ? `${avgScore}%` : '—',
      distinctionCount,
    };
  }, [filteredStudents]);

  // Direct PDF File Downloader with Google Font Urbanist ONLY
  const handleDownloadPDFReport = async () => {
    if (filteredStudents.length === 0 || pdfGenerating) return;

    setPdfGenerating(true);
    try {
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const deptTitle = selectedDept === 'all' ? 'All Academic Departments' : `${selectedDept} Department`;

      // Create a temporary hidden container strictly styled with Urbanist font
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '794px'; // Standard A4 width at 96 DPI
      container.style.padding = '32px 40px';
      container.style.backgroundColor = '#ffffff';
      container.style.fontFamily = "'Urbanist', -apple-system, sans-serif";
      container.style.color = '#0f172a';

      container.innerHTML = `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Urbanist', sans-serif !important; }
        </style>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; font-family: 'Urbanist', sans-serif !important;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="/aarga-logo.png" style="height: 52px; width: auto; object-fit: contain;" />
            <div>
              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; font-family: 'Urbanist', sans-serif !important;">Exora Examination Portal</h1>
              <p style="font-size: 13px; font-weight: 600; color: #475569; margin-top: 3px; font-family: 'Urbanist', sans-serif !important;">Aarga Foundation & Aarga Private Limited</p>
            </div>
          </div>
        </div>

        <!-- Document Info -->
        <div style="margin-bottom: 20px; font-family: 'Urbanist', sans-serif !important;">
          <h2 style="font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'Urbanist', sans-serif !important;">OFFICIAL ACADEMIC EXAMINATION AUDIT REPORT</h2>
          <p style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px; font-family: 'Urbanist', sans-serif !important;">
            Department: ${deptTitle} &nbsp;|&nbsp; Date: ${reportDate} &nbsp;|&nbsp; Ref: EXORA-REP-${Date.now().toString().slice(-6)}
          </p>
        </div>

        <hr style="border: none; border-top: 1.5px solid #cbd5e1; margin-bottom: 24px;" />

        <!-- Student Roster Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'Urbanist', sans-serif !important;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 10px 12px; font-weight: 800; text-align: left; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">#</th>
              <th style="padding: 10px 12px; font-weight: 800; text-align: left; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">REGISTER NO</th>
              <th style="padding: 10px 12px; font-weight: 800; text-align: left; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">STUDENT NAME</th>
              <th style="padding: 10px 12px; font-weight: 800; text-align: left; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">DEPARTMENT & ROSTER</th>
              <th style="padding: 10px 12px; font-weight: 800; text-align: left; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">STATUS</th>
              <th style="padding: 10px 12px; font-weight: 800; text-align: right; border: 1px solid #0f172a; font-size: 11px; font-family: 'Urbanist', sans-serif !important;">SCORE (%)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents
              .map(
                (s, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 600; font-family: 'Urbanist', sans-serif !important;">${i + 1}</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a; font-family: 'Urbanist', sans-serif !important;">${s.register_no}</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a; font-family: 'Urbanist', sans-serif !important;">${s.name}</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 600; color: #334155; font-family: 'Urbanist', sans-serif !important;">${s.department} (Year ${s.year} • Sem ${s.semester})</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 800; color: ${s.status === 'completed' ? '#059669' : '#e11d48'}; font-family: 'Urbanist', sans-serif !important;">${s.status.toUpperCase()}</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 800; text-align: right; color: #0f172a; font-family: 'Urbanist', sans-serif !important;">${s.status === 'completed' ? `${s.score}%` : '—'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 600; color: #64748b; font-family: 'Urbanist', sans-serif !important;">
          <div>
            <p style="font-family: 'Urbanist', sans-serif !important;">This is a system-generated secure audit document. Authorized by Exora Proctoring Engine.</p>
            <p style="margin-top: 2px; font-family: 'Urbanist', sans-serif !important;">Aarga Foundation & Aarga Private Limited</p>
          </div>
          <div style="font-family: 'Urbanist', sans-serif !important;">Page 1 of 1</div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait 400ms to ensure Google Font Urbanist is fully downloaded and applied
      await new Promise((r) => setTimeout(r, 400));

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      await doc.html(container, {
        callback: (pdf) => {
          const fileName = `Exora_Academic_Report_${selectedDept.replace(/\s+/g, '_')}.pdf`;
          pdf.save(fileName);
          try {
            document.body.removeChild(container);
          } catch (e) {}
        },
        margin: [10, 10, 10, 10],
        autoPaging: 'text',
        width: 190,
        windowWidth: 794,
      });
    } catch (err) {
      console.error('Failed to generate PDF document:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;

    const headers = ['Register No', 'Student Name', 'Department', 'Year', 'Semester', 'Status', 'Score (%)', 'Flag Reason'];
    const rows = filteredStudents.map((s) => [
      `"${s.register_no}"`,
      `"${s.name}"`,
      `"${s.department}"`,
      s.year,
      s.semester,
      s.status,
      s.score,
      `"${s.flag_reason || 'None'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exora_student_score_report_${selectedDept.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Student Performance &amp; Score Reports
            </h2>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-900 dark:bg-zinc-800 dark:text-zinc-200">
              Department Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Filter student examination results, scores, and proctor compliance by department roster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredStudents.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV Roster</span>
          </button>

          <button
            onClick={handleDownloadPDFReport}
            disabled={filteredStudents.length === 0 || pdfGenerating}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 shadow-sm cursor-pointer"
          >
            <FileText className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
            <span>{pdfGenerating ? 'Downloading PDF...' : 'Download Official PDF Document'}</span>
          </button>
        </div>
      </motion.div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Total Roster Candidates
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-950 dark:bg-zinc-900 dark:text-zinc-200">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Enrolled in {selectedDept === 'all' ? 'All Departments' : selectedDept}
          </span>
        </div>

        <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Average Department Score
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.avgScore}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            {stats.distinctionCount} Candidates &gt;= 80%
          </span>
        </div>

        <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Completed Examinations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.completedCount}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            {stats.total > 0 ? `${((stats.completedCount / stats.total) * 100).toFixed(0)}% Completion Rate` : '0% Rate'}
          </span>
        </div>

        <div className="panel-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Proctor Incident Flags
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              <Flag className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.flaggedCount}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Session Integrity Violations
          </span>
        </div>
      </div>

      {/* Filter Control Toolbar */}
      <div className="panel-card flex flex-col gap-4 rounded-2xl p-5 dark:bg-[#0c0d10]">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Filter Roster Data by Department &amp; Status
          </h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Department Selection Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDept('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-slate-900 text-white shadow-subtle dark:bg-white dark:text-slate-950'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              All Departments
            </button>

            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedDept.toLowerCase() === dept.toLowerCase()
                    ? 'bg-slate-900 text-white shadow-subtle dark:bg-white dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search and Status Dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="flagged">Flagged</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate or SIN NO..."
                className="w-48 sm:w-60 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Student Reports Roster Table */}
      <div className="panel-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0d10]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-500">
                <th className="px-6 py-4">Candidate Details</th>
                <th className="px-6 py-4">SIN NO</th>
                <th className="px-6 py-4">Department &amp; Roster</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Score Percentage</th>
                <th className="px-6 py-4">Performance Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">
                    No student performance records found for the selected department filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isDistinction = s.score >= 80;
                  const isPass = s.score >= 50;

                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 font-mono text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-zinc-300">
                        {s.register_no}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-zinc-300">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {s.department}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Year {s.year} • Semester {s.semester}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
                            s.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                              : s.status === 'flagged'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.status === 'completed'
                                ? 'bg-emerald-500'
                                : s.status === 'flagged'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                            }`}
                          />
                          {s.status === 'completed'
                            ? 'Completed'
                            : s.status === 'flagged'
                              ? 'Flagged'
                              : 'In Progress'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                          {s.status === 'completed' ? `${s.score}%` : '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {s.status === 'completed' ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              isDistinction
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : isPass
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {isDistinction ? 'Distinction' : isPass ? 'Passed' : 'Needs Review'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">
                            Pending Result
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
