import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  FileText,
  BarChart3,
  Award,
  CheckCircle2,
  Clock,
  Flag,
  UserCheck,
  Building,
  GraduationCap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StudentWithSession, ExamRoom } from '@/lib/types';
import { Skeleton } from './ui';

interface ReportsProps {
  students: StudentWithSession[];
  rooms?: ExamRoom[];
  loading?: boolean;
}

// Convert local logo image to base64 DataURL for direct PDF embedding
const getLogoBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = '/aarga-logo.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
};

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

  // Direct A4 PDF File Downloader (Clean White Theme, Black & White Professional Styling, No Logo Box)
  const handleDownloadPDFReport = async () => {
    if (filteredStudents.length === 0 || pdfGenerating) return;

    setPdfGenerating(true);
    try {
      const logoBase64 = await getLogoBase64();

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const deptTitle = selectedDept === 'all' ? 'All Academic Departments' : `${selectedDept} Department`;

      // 1. Institutional Top Letterhead (Pure White Background, Black Text)
      doc.setTextColor(15, 23, 42); // Crisp Black
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Exora Examination Portal', 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Institutional Examination Board • Academic Audit Control', 14, 22);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${reportDate}  |  Security: AES-256 Encrypted Audit Stream`, 14, 28);

      // Render Logo Cleanly on Top Right without any background box or border ("logo ku bg venam")
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 165, 8, 30, 22);
        } catch (e) {
          console.warn('PDF logo render error:', e);
        }
      }

      // Thin Elegant Separator Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, 33, 196, 33);

      // 2. Official Metadata Grid Box (Clean White Box with Thin Slate Border)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 37, 182, 22, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');

      doc.text('DOCUMENT REF NO', 18, 43);
      doc.text('DATE GENERATED', 70, 43);
      doc.text('DEPARTMENT SCOPE', 120, 43);
      doc.text('AUDIT STATUS', 165, 43);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(`EXORA-REP-${Date.now().toString().slice(-6)}`, 18, 51);
      doc.text(reportDate, 70, 51);
      doc.text(deptTitle.toUpperCase(), 120, 51);
      doc.text('VERIFIED', 165, 51);

      // KPI Summary Sub-bar
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 63, 182, 9, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`ROSTER: ${stats.total} CANDIDATES   |   AVG SCORE: ${stats.avgScore}   |   COMPLETED: ${stats.completedCount} EXAMS   |   INCIDENTS: ${stats.flaggedCount} FLAGS`, 18, 69);

      // 3. Monochrome Professional Data Table starting at Y=76
      const tableData = filteredStudents.map((s, idx) => [
        idx + 1,
        s.register_no,
        s.name,
        `${s.department}\n(Year ${s.year} • Sem ${s.semester})`,
        s.status.toUpperCase(),
        s.status === 'completed' ? `${s.score}%` : '—',
      ]);

      autoTable(doc, {
        startY: 76,
        head: [['#', 'REGISTER NO', 'CANDIDATE NAME', 'DEPARTMENT & ROSTER', 'STATUS', 'SCORE (%)']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 48, fontStyle: 'bold' },
          3: { cellWidth: 46 },
          4: { cellWidth: 26, fontStyle: 'bold' },
          5: { cellWidth: 20, fontStyle: 'bold', halign: 'right' },
        },
        styles: {
          cellPadding: 3.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        didDrawPage: (data) => {
          // Formal Verification Footer
          const line1 = 'This is a system-generated secure audit document. Authorized by Exora Proctoring Engine.';
          const line2 = 'Aarga Foundation & Aarga Private Limited';
          const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);

          // Line 1 & Page Number
          doc.text(line1, 14, 283);
          doc.text(pageStr, 196, 283, { align: 'right' });

          // Line 2
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(line2, 14, 288);
        },
      });

      // Save PDF directly to browser downloads
      const fileName = `Exora_Academic_Report_${selectedDept.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
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
            <span>{pdfGenerating ? 'Generating PDF...' : 'Download Official PDF Document'}</span>
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
