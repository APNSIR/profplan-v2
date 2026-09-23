'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { load, save, ProfPlanData } from '@/lib/store';
import PageGuide from '@/components/PageGuide';
import {
    FileSpreadsheet,
    FileText,
    Settings2,
    Trash2,
    Edit3,
    Filter,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    Sparkles,
    Printer
} from 'lucide-react';

export default function Reports() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    const [d, setD] = useState<ProfPlanData>({
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
        classes: []
    });

    const [correctionMode, setCorrectionMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('ALL');
    const [selectedSemester, setSelectedSemester] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    useEffect(() => {
        setMounted(true);

        const store = load();

        if (store) {
            setD(store);
        }

        const refresh = () => {
            const updated = load();
            if (updated) {
                setD(updated);
            }
        };

        window.addEventListener('profplan-change', refresh);
        window.addEventListener('storage', refresh);

        return () => {
            window.removeEventListener('profplan-change', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    const courses = useMemo(() => d?.courses || [], [d]);
    const logs = useMemo(() => d?.logs || [], [d]);

    // Extract unique semesters from courses or logs
    const semesters = useMemo(() => {
        const set = new Set<string>();

        courses.forEach((c: any) => {
            if (c.semester) {
                set.add(c.semester);
            }
        });

        logs.forEach((l: any) => {
            if (l.semester) {
                set.add(l.semester);
            }
        });

        return Array.from(set);
    }, [courses, logs]);

    /* =====================================================
        FILTERED & CHRONOLOGICAL SORTING
    ===================================================== */
    const filteredLogs = useMemo(() => {
        if (!logs) return [];

        return logs
            .filter((l: any) => {
                if (startDate && l.date < startDate) return false;
                if (endDate && l.date > endDate) return false;

                if (
                    selectedCourseId !== 'ALL' &&
                    l.courseId !== selectedCourseId
                ) {
                    return false;
                }

                if (selectedSemester !== 'ALL') {
                    const course = courses.find(
                        (c: any) => c.id === l.courseId
                    );

                    const semMatch =
                        l.semester === selectedSemester ||
                        course?.semester === selectedSemester;

                    if (!semMatch) return false;
                }

                if (
                    selectedStatus !== 'ALL' &&
                    l.status !== selectedStatus
                ) {
                    return false;
                }

                return true;
            })
            .sort((a: any, b: any) => {
                const dateA = String(a.date || '');
                const dateB = String(b.date || '');

                if (dateA !== dateB) {
                    return dateA.localeCompare(dateB);
                }

                const startA = String(a.actualStart || '');
                const startB = String(b.actualStart || '');

                return startA.localeCompare(startB);
            });
    }, [
        logs,
        courses,
        startDate,
        endDate,
        selectedCourseId,
        selectedSemester,
        selectedStatus
    ]);

    /* =====================================================
        METRICS
    ===================================================== */
    const totalHours = useMemo(() => {
        return filteredLogs
            .filter(
                (l: any) =>
                    l.status === 'Taken' ||
                    l.status === 'Compensated'
            )
            .reduce(
                (sum: number, log: any) =>
                    sum + Number(log.hours || 0),
                0
            );
    }, [filteredLogs]);

    const takenClasses = useMemo(() => {
        return filteredLogs.filter(
            (log: any) =>
                log.status === 'Taken' ||
                log.status === 'Compensated'
        ).length;
    }, [filteredLogs]);

    const latestDate =
        filteredLogs.length > 0
            ? filteredLogs[filteredLogs.length - 1].date
            : '—';

    /* =====================================================
        HELPERS & RECORD ACTIONS
    ===================================================== */

    function courseName(courseId: string) {
        return (
            d.courses?.find(
                (c: any) => c.id === courseId
            )?.name || 'General / Special Class'
        );
    }

    function courseCode(courseId: string) {
        return (
            d.courses?.find(
                (c: any) => c.id === courseId
            )?.code || ''
        );
    }

    function courseSemester(log: any) {
        return (
            log.semester ||
            d.courses?.find(
                (c: any) => c.id === log.courseId
            )?.semester ||
            ''
        );
    }

    function getPlannedTopicName(log: any) {
        if (log.plannedTopicName) {
            return log.plannedTopicName;
        }

        if (log.topicId) {
            const topic = d.topics?.find(
                (t: any) => t.id === log.topicId
            );

            if (topic) {
                return topic.name;
            }
        }

        return '—';
    }

    function getActuallyCovered(log: any) {
        return (
            log.covered ||
            getPlannedTopicName(log) ||
            '—'
        );
    }

    function slotForLog(slotId: string) {
        return d.slots?.find(
            (s: any) => s.id === slotId
        );
    }

    function openForCorrection(logId: string) {
        router.push(
            `/log?editId=${encodeURIComponent(logId)}`
        );
    }

    function deleteLogEntry(
        logId: string,
        e?: React.MouseEvent
    ) {
        if (e) {
            e.stopPropagation();
        }

        const targetLog = (d.logs || []).find(
            (l: any) => l.id === logId
        );

        const logDate = targetLog?.date || 'this';
        const course = courseName(
            targetLog?.courseId || ''
        );

        const confirmed = window.confirm(
            `Are you sure you want to delete the class entry for "${course}" on ${logDate}?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        const updatedLogs = (d.logs || []).filter(
            (l: any) => l.id !== logId
        );

        const updatedData = {
            ...d,
            logs: updatedLogs
        };

        save(updatedData);
        setD(updatedData);
    }

    /* =====================================================
        OFFICIAL EXCEL (.XLSX) EXPORT
    ===================================================== */

    function exportExcel() {
        if (filteredLogs.length === 0) {
            alert(
                'No logs recorded to export for the selected filters.'
            );
            return;
        }

        const reportData = filteredLogs.map(
            (l: any, index: number) => {
                const slot = slotForLog(l.slotId) as any;

                return {
                    'Sl. No.': index + 1,
                    Date: l.date || '',
                    Period: slot?.period
                        ? `Period ${slot.period}`
                        : 'Extra Class',
                    Time: `${l.actualStart || slot?.start || ''} - ${l.actualEnd || slot?.end || ''}`,
                    'Course / Subject': `${courseName(l.courseId)} ${courseCode(l.courseId)
                        ? `(${courseCode(l.courseId)})`
                        : ''
                        }`,
                    'Semester / Class': courseSemester(l),
                    'Planned Topic':
                        getPlannedTopicName(l),
                    'Actually Covered':
                        getActuallyCovered(l),
                    Status: l.status || '',
                    'Contact Hours': Number(
                        l.hours || 0
                    ).toFixed(2),
                    Attendance: l.attendance ?? '—',
                    'Remarks / Deviations':
                        l.remarks || ''
                };
            }
        );

        const worksheet =
            XLSX.utils.json_to_sheet(reportData);

        worksheet['!cols'] = [
            { wch: 8 },
            { wch: 12 },
            { wch: 14 },
            { wch: 18 },
            { wch: 30 },
            { wch: 16 },
            { wch: 28 },
            { wch: 32 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 25 }
        ];

        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                ['An Initiative by APNSIR FOUNDATION'],
                [
                    'Academic Lesson Planning & Daily Progress Register'
                ],
                []
            ],
            { origin: 'A1' }
        );

        const signatureRow =
            filteredLogs.length + 6;

        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                [
                    'Signature of Teacher',
                    '',
                    '',
                    'Signature of HOD',
                    '',
                    '',
                    '',
                    'Signature of Principal'
                ]
            ],
            {
                origin: `A${signatureRow}`
            }
        );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Progress Register'
        );

        XLSX.writeFile(
            workbook,
            `APNSIR_ProfPlan_Register_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`
        );
    }

    /* =====================================================
        OFFICIAL PDF EXPORT
    ===================================================== */

    function exportPDF() {
        if (filteredLogs.length === 0) {
            alert(
                'No logs recorded to export for the selected filters.'
            );
            return;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');

        doc.text(
            'IN HUMBLE SERVICE TO OUR TEACHERS',
            14,
            15
        );

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        doc.text(
            'APNSIR FOUNDATION · Academic Lesson Planning & Daily Progress Register',
            14,
            21
        );

        doc.setLineWidth(0.3);
        doc.line(14, 26, 283, 26);

        let y = 34;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        doc.text('Sl.', 14, y);
        doc.text('Date', 22, y);
        doc.text('Period', 42, y);
        doc.text('Subject / Code', 58, y);
        doc.text('Planned Topic', 105, y);
        doc.text('Actually Covered', 160, y);
        doc.text('Status', 215, y);
        doc.text('Hours', 238, y);
        doc.text('Remarks', 253, y);

        doc.setLineWidth(0.1);
        doc.line(14, y + 2, 283, y + 2);

        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        filteredLogs.forEach(
            (l: any, idx: number) => {
                if (y > 185) {
                    doc.addPage();
                    y = 20;
                }

                const slot = slotForLog(
                    l.slotId
                ) as any;

                doc.text(
                    String(idx + 1),
                    14,
                    y
                );

                doc.text(
                    String(l.date || ''),
                    22,
                    y
                );

                doc.text(
                    String(
                        slot?.period
                            ? `P${slot.period}`
                            : 'Extra'
                    ),
                    42,
                    y
                );

                doc.text(
                    String(
                        courseName(
                            l.courseId
                        )
                    ).slice(0, 22),
                    58,
                    y
                );

                doc.text(
                    String(
                        getPlannedTopicName(l)
                    ).slice(0, 28),
                    105,
                    y
                );

                doc.text(
                    String(
                        getActuallyCovered(l)
                    ).slice(0, 32),
                    160,
                    y
                );

                doc.text(
                    String(l.status || ''),
                    215,
                    y
                );

                doc.text(
                    String(
                        Number(
                            l.hours || 0
                        ).toFixed(2)
                    ),
                    238,
                    y
                );

                doc.text(
                    String(
                        l.remarks || '—'
                    ).slice(0, 18),
                    253,
                    y
                );

                y += 6;
            }
        );

        if (y > 175) {
            doc.addPage();
            y = 25;
        } else {
            y += 15;
        }

        doc.setFont(
            'helvetica',
            'bold'
        );

        doc.text(
            'Signature of Teacher',
            25,
            y
        );

        doc.text(
            'Signature of HOD',
            130,
            y
        );

        doc.text(
            'Signature of Principal',
            230,
            y
        );

        doc.save(
            `APNSIR_ProfPlan_Register_${startDate || 'all'}_to_${endDate || 'all'}.pdf`
        );
    }

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading Academic Progress Register...
                </div>
            </div>
        );
    }

    const hasActiveFilters =
        startDate ||
        endDate ||
        selectedCourseId !== 'ALL' ||
        selectedSemester !== 'ALL' ||
        selectedStatus !== 'ALL';

    return (
        <div className="space-y-6 pb-16 max-w-7xl mx-auto">

            {/* NAVIGATIONAL BACK BUTTON */}
            <div className="flex items-center justify-between print:hidden">
                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm hover:shadow-md transition-all duration-200 transform active:scale-95"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>

                    <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 group-hover:text-blue-900 tracking-tight">
                            Back to Today Dashboard
                        </span>

                        <span className="block text-[10px] font-semibold text-slate-400 group-hover:text-blue-600/80 -mt-0.5">
                            Return to Daily Workspace
                        </span>
                    </div>
                </Link>
            </div>

            {/* HERO BANNER */}
            <section className="relative overflow-hidden rounded-3xl border border-blue-900/40 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-xl md:px-9 print:hidden">
                <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-200">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            An Initiative by APNSIR FOUNDATION
                        </div>

                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
                            Reports &amp; Progress Register
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
                            Inspection-ready chronological register with direct Excel &amp; PDF compliance exports.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 px-6 py-3.5 backdrop-blur-md text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                            Filtered Entries
                        </p>

                        <p className="mt-0.5 text-3xl font-black text-white">
                            {filteredLogs.length}
                        </p>
                    </div>
                </div>
            </section>

            {/* PRINT-ONLY OFFICIAL HEADER */}
            <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
                <h1 className="text-xl font-black tracking-tight uppercase">
                    E-Lesson Plan-cum-Progress Register
                </h1>

                <p className="text-xs font-bold mt-0.5">
                    Academic Progress &amp; Workload Compliance Register
                </p>

                <div className="flex justify-between text-[11px] font-semibold mt-2 pt-2 border-t border-slate-300">
                    <span>
                        Generated:{' '}
                        {new Date().toLocaleDateString(
                            'en-IN',
                            {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            }
                        )}
                    </span>

                    <span>
                        Total Contact Hours:{' '}
                        {totalHours.toFixed(2)} hrs
                    </span>
                </div>
            </div>

            {/* GUIDED ONBOARDING BANNER */}
            <div className="print:hidden">
                <PageGuide
                    guideKey="reports_compliance"
                    title="Progress Reports & Compliance Register: Quick Guide"
                    summary="Review your chronological teaching register, filter by date, course or semester, and generate official documents."
                    steps={[
                        {
                            step: '1. Filter Records',
                            desc: 'Click "Advanced Filters & Sorting" to isolate specific date ranges, subjects, semesters, or status types.'
                        },
                        {
                            step: '2. Manage & Correct',
                            desc: 'Click "Manage / Correct" to unlock edit and delete actions on any past entry.'
                        },
                        {
                            step: '3. Export Official Register',
                            desc: 'Download audit-ready spreadsheets via Excel (.xlsx) or print formatted signature registers in PDF.'
                        }
                    ]}
                />
            </div>

            {/* SUMMARY METRICS */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Filtered Classes
                    </span>

                    <p className="mt-1 text-3xl font-extrabold text-slate-900">
                        {filteredLogs.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Classes Taken
                    </span>

                    <p className="mt-1 text-3xl font-extrabold text-emerald-600">
                        {takenClasses}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Teaching Hours
                    </span>

                    <p className="mt-1 text-3xl font-extrabold text-indigo-600">
                        {totalHours.toFixed(2)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Latest Record
                    </span>

                    <p className="mt-1 text-2xl font-extrabold text-amber-600">
                        {latestDate}
                    </p>
                </div>
            </section>

            {/* ACTION CONTROLS */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 print:hidden">

                <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                        Teaching Progress Register
                    </h2>

                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Arranged chronologically for School/university and departmental audits.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">

                    <button
                        type="button"
                        onClick={() =>
                            setShowFilters(!showFilters)
                        }
                        className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black shadow-sm transition border ${hasActiveFilters
                            ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                    >
                        <Filter className="w-4 h-4 text-blue-500" />

                        <span>
                            Advanced Filter &amp; Sorting
                        </span>

                        {hasActiveFilters && (
                            <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full text-[10px]">
                                Active
                            </span>
                        )}

                        {showFilters ? (
                            <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                            <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                    </button>

                    <div className="flex flex-wrap items-center gap-3">

                        <button
                            type="button"
                            onClick={exportExcel}
                            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition transform active:scale-95"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Export Excel (.xlsx)
                        </button>

                        <button
                            type="button"
                            onClick={exportPDF}
                            className="flex items-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition transform active:scale-95"
                        >
                            <FileText className="w-4 h-4" />
                            Save PDF Register
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-2xl shadow-md transition transform active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setCorrectionMode(
                                    !correctionMode
                                )
                            }
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold rounded-2xl text-white shadow-md transition transform active:scale-95 ${correctionMode
                                ? 'bg-red-700 hover:bg-red-800 ring-2 ring-red-400'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            <Settings2 className="w-3.5 h-3.5 text-white" />

                            {correctionMode
                                ? '✓ Done Correcting'
                                : 'Manage / Correct'}
                        </button>
                    </div>
                </div>

                {/* FILTER PANEL */}
                {showFilters && (
                    <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">

                        <div className="flex items-center justify-between">

                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Filter Parameters
                            </span>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        setSelectedCourseId(
                                            'ALL'
                                        );
                                        setSelectedSemester(
                                            'ALL'
                                        );
                                        setSelectedStatus(
                                            'ALL'
                                        );
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Start Date
                                </label>

                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        setStartDate(
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    End Date
                                </label>

                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) =>
                                        setEndDate(
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Course / Subject
                                </label>

                                <select
                                    value={selectedCourseId}
                                    onChange={(e) =>
                                        setSelectedCourseId(
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">
                                        All Courses
                                    </option>

                                    {courses.map(
                                        (c: any) => (
                                            <option
                                                key={c.id}
                                                value={c.id}
                                            >
                                                {c.name}{' '}
                                                {c.code
                                                    ? `(${c.code})`
                                                    : ''}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Semester / Section
                                </label>

                                <select
                                    value={selectedSemester}
                                    onChange={(e) =>
                                        setSelectedSemester(
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">
                                        All Semesters
                                    </option>

                                    {semesters.map(
                                        (sem: string) => (
                                            <option
                                                key={sem}
                                                value={sem}
                                            >
                                                {sem}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Class Status
                                </label>

                                <select
                                    value={selectedStatus}
                                    onChange={(e) =>
                                        setSelectedStatus(
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">
                                        All Statuses
                                    </option>
                                    <option value="Taken">
                                        Taken
                                    </option>
                                    <option value="Compensated">
                                        Compensated
                                    </option>
                                    <option value="Postponed">
                                        Postponed
                                    </option>
                                    <option value="Cancelled">
                                        Cancelled
                                    </option>
                                    <option value="Leave">
                                        Leave
                                    </option>
                                    <option value="Mass Bunk">
                                        Mass Bunk
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 font-medium">
                            Showing filtered results (
                            {filteredLogs.length}{' '}
                            matching records)
                        </div>
                    </div>
                )}
            </section>

            {/* REGISTER TABLE */}
            <section className="overflow-hidden rounded-2xl border border-blue-900/20 bg-white shadow-md print:border-none print:shadow-none">

                <div className="overflow-x-auto">

                    <table className="w-full min-w-[1100px] border-collapse text-left text-sm print:min-w-full">

                        <thead>
                            <tr className="border-b-2 border-blue-900 bg-blue-950 text-blue-50 text-[12px] font-black uppercase tracking-wider print:bg-slate-100 print:text-slate-900">

                                <th className="py-4 px-4 text-center w-14 border-r border-blue-900/60 print:border-slate-300">
                                    Sl.
                                </th>

                                <th className="py-4 px-4 w-32 border-r border-blue-900/60 print:border-slate-300">
                                    Date
                                </th>

                                <th className="py-4 px-4 w-40 border-r border-blue-900/60 print:border-slate-300">
                                    Period / Time
                                </th>

                                <th className="py-4 px-4 border-r border-blue-900/60 print:border-slate-300">
                                    Course / Subject
                                </th>

                                <th className="py-4 px-4 border-r border-blue-900/60 print:border-slate-300">
                                    Planned Topic
                                </th>

                                <th className="py-4 px-4 border-r border-blue-900/60 print:border-slate-300">
                                    Actually Covered
                                </th>

                                <th className="py-4 px-4 text-center w-28 border-r border-blue-900/60 print:border-slate-300">
                                    Status
                                </th>

                                <th className="py-4 px-4 text-right w-24 border-r border-blue-900/60 print:border-slate-300">
                                    Hours
                                </th>

                                {correctionMode && (
                                    <th className="py-4 px-4 text-center w-36 bg-amber-600 text-white print:hidden">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">

                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            correctionMode
                                                ? 9
                                                : 8
                                        }
                                        className="py-12 text-center text-slate-400 font-medium italic"
                                    >
                                        No matching teaching progress records found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(
                                    (
                                        l: any,
                                        index: number
                                    ) => {
                                        const slot =
                                            slotForLog(
                                                l.slotId
                                            ) as any;

                                        return (
                                            <tr
                                                key={l.id}
                                                className={`transition ${correctionMode
                                                    ? 'bg-amber-50/40 hover:bg-amber-100/60 border-l-4 border-amber-500'
                                                    : index % 2 === 0
                                                        ? 'bg-white hover:bg-blue-50/40'
                                                        : 'bg-slate-50/70 hover:bg-blue-50/50'
                                                    }`}
                                            >
                                                <td className="py-3.5 px-4 text-center font-bold text-slate-500 border-r border-slate-100 print:border-slate-200">
                                                    {index + 1}
                                                </td>

                                                <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100 print:border-slate-200">
                                                    {l.date}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap border-r border-slate-100 print:border-slate-200">
                                                    <div className="font-extrabold text-slate-800">
                                                        {slot?.period
                                                            ? `Period ${slot.period}`
                                                            : l.classType ||
                                                            'Extra Class'}
                                                    </div>

                                                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                        {l.actualStart ||
                                                            slot?.start ||
                                                            ''}{' '}
                                                        –{' '}
                                                        {l.actualEnd ||
                                                            slot?.end ||
                                                            ''}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 border-r border-slate-100 print:border-slate-200">
                                                    <div className="font-extrabold text-slate-900 leading-snug">
                                                        {courseName(
                                                            l.courseId
                                                        )}
                                                    </div>

                                                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                                                        {courseSemester(
                                                            l
                                                        )}{' '}
                                                        {courseCode(
                                                            l.courseId
                                                        ) &&
                                                            `• ${courseCode(
                                                                l.courseId
                                                            )}`}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-600 border-r border-slate-100 max-w-[180px] print:border-slate-200">
                                                    {getPlannedTopicName(
                                                        l
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 font-semibold text-slate-900 border-r border-slate-100 max-w-[220px] print:border-slate-200">
                                                    <div>
                                                        {getActuallyCovered(
                                                            l
                                                        )}
                                                    </div>

                                                    {l.remarks && (
                                                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                                                            Note:{' '}
                                                            {
                                                                l.remarks
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-center whitespace-nowrap border-r border-slate-100 print:border-slate-200">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold ${l.status ===
                                                            'Taken'
                                                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                                            : l.status ===
                                                                'Compensated'
                                                                ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                                                                : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                                                            }`}
                                                    >
                                                        {l.status ||
                                                            'Taken'}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap border-r border-slate-100 print:border-slate-200">
                                                    {Number(
                                                        l.hours || 0
                                                    ).toFixed(2)}
                                                </td>

                                                {correctionMode && (
                                                    <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                                                        <div className="flex items-center justify-center gap-2">

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openForCorrection(
                                                                        l.id
                                                                    )
                                                                }
                                                                title="Edit Details"
                                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition border border-blue-200"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(
                                                                    e
                                                                ) =>
                                                                    deleteLogEntry(
                                                                        l.id,
                                                                        e
                                                                    )
                                                                }
                                                                title="Delete Entry"
                                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition border border-rose-200"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Delete
                                                            </button>

                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    }
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* OFFICIAL SIGN-OFF FOOTER */}
                <div className="hidden print:grid grid-cols-3 gap-8 pt-16 pb-6 px-4 text-center text-xs font-bold text-slate-800">
                    <div className="border-t border-slate-400 pt-2">
                        Teacher / Educator Signature
                    </div>

                    <div className="border-t border-slate-400 pt-2">
                        Head of Department (HOD)
                    </div>

                    <div className="border-t border-slate-400 pt-2">
                        Principal / Academic Dean
                    </div>
                </div>
            </section>
        </div>
    );
}