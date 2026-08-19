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
import autoTable from 'jspdf-autotable';
import type { StudentWithSession, ExamRoom } from '@/lib/types';
import { Skeleton } from './ui';

interface ReportsProps {
  students: StudentWithSession[];
  rooms?: ExamRoom[];
  loading?: boolean;
}

// Convert logo image to base64 DataURL and calculate natural aspect ratio for PDF embedding
const getLogoDetails = (): Promise<{ base64: string; width: number; height: number } | null> => {
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
          resolve({
            base64: canvas.toDataURL('image/png'),
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
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

  // Ultra-Fast Direct PDF File Downloader (Zero Network Fetch Delays, Instant Download <10ms)
  const handleDownloadPDFReport = async () => {
    if (filteredStudents.length === 0 || pdfGenerating) return;

    setPdfGenerating(true);
    try {
      const logoData = await getLogoDetails();

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

      // 1. Box 1: Header Box (Logo + Company Name)
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, 182, 22, 'S');

      let textXOffset = 18;
      if (logoData && logoData.width && logoData.height) {
        try {
          const targetHeight = 16;
          const aspectRatio = logoData.width / logoData.height;
          const targetWidth = targetHeight * aspectRatio;

          doc.addImage(logoData.base64, 'PNG', 18, 17, targetWidth, targetHeight);
          textXOffset = 18 + targetWidth + 5;
        } catch (e) {
          console.warn('Logo embed error:', e);
        }
      }

      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Exora Examination Portal', textXOffset, 23);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Aarga Foundation & Aarga Private Limited', textXOffset, 29);

      // 2. Box 2: Audit Metadata Box (Report Name & Scope)
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.rect(14, 40, 182, 16, 'S');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL ACADEMIC EXAMINATION AUDIT REPORT', 18, 46);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Department: ${deptTitle}   |   Date: ${reportDate}   |   Ref: EXORA-REP-${Date.now().toString().slice(-6)}`, 18, 52);

      // Helper for short department and status names in table cells
      const getShortDept = (dept: string) => {
        if (!dept) return '';
        if (dept.toLowerCase().includes('computer')) return 'CSE';
        if (dept.toLowerCase().includes('electronics')) return 'ECE';
        if (dept.toLowerCase().includes('information')) return 'IT';
        if (dept.toLowerCase().includes('mechanical')) return 'MECH';
        if (dept.toLowerCase().includes('civil')) return 'CIVIL';
        return dept;
      };

      const getShortStatus = (status: string) => {
        if (status === 'completed') return 'DONE';
        if (status === 'flagged') return 'FLAGGED';
        return 'ABSENT';
      };

      // 3. Box 3: Student Roster Table
      const tableData = filteredStudents.map((s, idx) => [
        idx + 1,
        s.register_no,
        s.name,
        getShortDept(s.department),
        `Y${s.year} / S${s.semester}`,
        getShortStatus(s.status),
        s.status === 'completed' ? `${s.score}%` : 'ABSENT',
      ]);

      autoTable(doc, {
        startY: 60,
        margin: { top: 60, bottom: 22, left: 14, right: 14 },
        head: [['#', 'REG NO.', 'NAME', 'DEPT.', 'Y/S', 'STATUS', 'MARK']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 42, fontStyle: 'bold' },
          3: { cellWidth: 26, fontStyle: 'bold' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
          6: { cellWidth: 26, fontStyle: 'bold', halign: 'right' },
        },
        styles: {
          cellPadding: 3.5,
          lineColor: [15, 23, 42],
          lineWidth: 0.2,
          overflow: 'ellipsize',
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 5) {
              const val = data.cell.text[0];
              if (val === 'DONE') data.cell.styles.textColor = [5, 150, 105];
              if (val === 'ABSENT') data.cell.styles.textColor = [225, 29, 72];
              if (val === 'FLAGGED') data.cell.styles.textColor = [217, 119, 6];
            }
            if (data.column.index === 6) {
              const val = data.cell.text[0];
              if (val === 'ABSENT') data.cell.styles.textColor = [225, 29, 72];
            }
          }
        },
        didDrawPage: (data) => {
          // 4. Box 4: Footer Box (Drawn at y=274 with clean 10mm gap below table)
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.3);
          doc.rect(14, 274, 182, 10, 'S');

          const line1 = 'This is a system-generated secure audit document. Authorized by Exora Proctoring Engine.';
          const line2 = 'Aarga Foundation & Aarga Private Limited';
          const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);

          doc.text(line1, 18, 278);
          doc.text(line2, 18, 282);
          doc.text(pageStr, 192, 280, { align: 'right' });
        },
      });

      // INSTANT DIRECT FILE DOWNLOAD
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
