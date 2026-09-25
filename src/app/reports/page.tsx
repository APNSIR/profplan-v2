'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { load, save, loadProfile, ProfPlanData, UserProfile } from '@/lib/store';
import { exportProfPlanBackup, restoreProfPlanBackup } from '@/lib/backup';
import { requestGoogleAccessToken, syncToGoogleDrive, restoreFromGoogleDrive } from '@/lib/gdrive';
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
    Printer,
    Calendar,
    Clock,
    Layers,
    UserCheck,
    Download,
    UploadCloud,
    DatabaseBackup,
    Cloud,
    RefreshCw
} from 'lucide-react';

export default function Reports() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Syncing states
    const [isRestoringFile, setIsRestoringFile] = useState(false);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [isCloudRestoring, setIsCloudRestoring] = useState(false);
    const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

    const [d, setD] = useState<ProfPlanData>({
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
        classes: []
    });
    const [profile, setProfile] = useState<UserProfile | null>(null);

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
        const userProf = loadProfile();
        if (userProf) {
            setProfile(userProf);
        }

        const refresh = () => {
            const updated = load();
            if (updated) {
                setD(updated);
            }
            const updatedProf = loadProfile();
            if (updatedProf) {
                setProfile(updatedProf);
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
    const classes = useMemo(() => d?.classes || [], [d]);
    const logs = useMemo(() => d?.logs || [], [d]);

    // Fast relational lookup maps (O(1) lookups)
    const classMap = useMemo(() => new Map(classes.map((cls: any) => [cls.id, cls])), [classes]);
    const courseMap = useMemo(() => new Map(courses.map((c: any) => [c.id, c])), [courses]);
    const slotMap = useMemo(() => new Map((d.slots || []).map((s: any) => [s.id, s])), [d.slots]);

    // Comprehensive unique classes / semesters set
    const semesters = useMemo(() => {
        const set = new Set<string>();

        courses.forEach((c: any) => {
            if (c.semester) set.add(c.semester);
        });

        classes.forEach((cls: any) => {
            if (cls.name) set.add(cls.name);
        });

        logs.forEach((l: any) => {
            if (l.semester) set.add(l.semester);
        });

        return Array.from(set);
    }, [courses, classes, logs]);

    /* =====================================================
        FILTERED & CHRONOLOGICAL SORTING
    ===================================================== */
    const filteredLogs = useMemo(() => {
        if (!logs) return [];

        return logs
            .filter((l: any) => {
                if (startDate && l.date < startDate) return false;
                if (endDate && l.date > endDate) return false;

                if (selectedCourseId !== 'ALL' && l.courseId !== selectedCourseId) {
                    return false;
                }

                if (selectedSemester !== 'ALL') {
                    const course: any = courseMap.get(l.courseId);
                    const classObj: any = course?.classId ? classMap.get(course.classId) : null;
                    const semMatch =
                        l.semester === selectedSemester ||
                        course?.semester === selectedSemester ||
                        classObj?.name === selectedSemester;

                    if (!semMatch) return false;
                }

                if (selectedStatus !== 'ALL' && l.status !== selectedStatus) {
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
        courseMap,
        classMap,
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
    function resolveCourseName(courseId: string) {
        return courseMap.get(courseId)?.name || 'General / Special Class';
    }

    function resolveCourseCode(courseId: string) {
        return courseMap.get(courseId)?.code || '';
    }

    function resolveClassInfo(log: any) {
        const course: any = courseMap.get(log.courseId);
        const classObj: any = course?.classId ? classMap.get(course.classId) : null;

        if (classObj) {
            return `${classObj.name}${classObj.stream ? ` (${classObj.stream})` : ''}`;
        }

        return log.semester || course?.semester || '';
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
                return topic.name || topic.title;
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

    function openForCorrection(logId: string) {
        router.push(`/log?editId=${encodeURIComponent(logId)}`);
    }

    function deleteLogEntry(logId: string, e?: React.MouseEvent) {
        if (e) {
            e.stopPropagation();
        }

        const targetLog = (d.logs || []).find((l: any) => l.id === logId);
        const logDate = targetLog?.date || 'this';
        const course = resolveCourseName(targetLog?.courseId || '');

        const confirmed = window.confirm(
            `Are you sure you want to delete the class entry for "${course}" on ${logDate}?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        const updatedLogs = (d.logs || []).filter((l: any) => l.id !== logId);
        const updatedData = { ...d, logs: updatedLogs };

        save(updatedData);
        setD(updatedData);
    }

    /* =====================================================
        LOCAL JSON BACKUP & RESTORE ACTIONS
    ===================================================== */
    async function handleExportJSON() {
        try {
            await exportProfPlanBackup();
        } catch (err: any) {
            alert(err.message || 'Failed to export backup file.');
        }
    }

    async function handleFileRestore(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const confirmed = window.confirm(
            `Restoring "${file.name}" will merge and sync your local database with this backup.\n\nDo you wish to proceed?`
        );
        if (!confirmed) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsRestoringFile(true);
        try {
            const res = await restoreProfPlanBackup(file);
            alert(res.message);
            if (res.success) {
                const refreshed = load();
                if (refreshed) setD(refreshed);
                const refreshedProfile = loadProfile();
                if (refreshedProfile) setProfile(refreshedProfile);
            }
        } catch (err: any) {
            alert(`Restore failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsRestoringFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    /* =====================================================
        GOOGLE DRIVE APPDATA SYNC & RESTORE (₹0 Cost Model)
    ===================================================== */
    async function handleGoogleDriveSync() {
        setIsCloudSyncing(true);
        try {
            const token = await requestGoogleAccessToken();
            const result = await syncToGoogleDrive(token);
            if (result.success) {
                setLastCloudSyncTime(result.time);
                alert(`✓ Backed up to your Google Drive AppData folder at ${result.time}. Zero server storage consumed.`);
            }
        } catch (err: any) {
            alert(`Google Drive sync error: ${err.message || 'Authentication or network issue'}`);
        } finally {
            setIsCloudSyncing(false);
        }
    }

    async function handleGoogleDriveRestore() {
        const confirmed = window.confirm(
            'This will download your latest register snapshot from your private Google Drive and sync it locally.\n\nContinue?'
        );
        if (!confirmed) return;

        setIsCloudRestoring(true);
        try {
            const token = await requestGoogleAccessToken();
            const res = await restoreFromGoogleDrive(token);
            alert(res.message);
            if (res.success) {
                const refreshed = load();
                if (refreshed) setD(refreshed);
                const refreshedProfile = loadProfile();
                if (refreshedProfile) setProfile(refreshedProfile);
            }
        } catch (err: any) {
            alert(`Google Drive restore error: ${err.message || 'Download failed'}`);
        } finally {
            setIsCloudRestoring(false);
        }
    }

    /* =====================================================
        DYNAMIC LAZY-LOADED EXPORTERS (Bundle Optimization)
    ===================================================== */
    async function handleExportExcel() {
        if (filteredLogs.length === 0) {
            alert('No logs recorded to export for the selected filters.');
            return;
        }
        const { exportLogsToExcel } = await import('@/lib/exportUtils');
        const fileName = `ProfPlan_Register_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
        exportLogsToExcel(filteredLogs, d, fileName);
    }

    async function handleExportFullComplianceReport() {
        const { exportComplianceReportToXLSX } = await import('@/lib/exportUtils');
        exportComplianceReportToXLSX(d, profile);
    }

    async function handleExportPDF() {
        if (filteredLogs.length === 0) {
            alert('No logs recorded to export for the selected filters.');
            return;
        }
        const { exportLogsToPDF } = await import('@/lib/exportUtils');
        exportLogsToPDF(
            filteredLogs,
            `Daily Progress Register (${startDate || 'All'} to ${endDate || 'All'})`
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
        <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">

            {/* HIDDEN FILE INPUT FOR LOCAL JSON RESTORE */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileRestore}
                accept=".json,application/json"
                className="hidden"
            />

            {/* NAVIGATIONAL BACK BUTTON */}
            <div className="flex items-center justify-between print:hidden">
                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm hover:shadow-md transition-all duration-200 transform active:scale-95"
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
            <section className="relative overflow-hidden rounded-3xl border border-blue-900/40 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 px-5 sm:px-8 py-6 sm:py-8 text-white shadow-xl print:hidden">
                <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-200">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            An Initiative by APNSIR FOUNDATION
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                            Reports &amp; Progress Register
                        </h1>

                        <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-blue-100/80 font-medium">
                            Inspection-ready chronological register with direct Excel, PDF, and high-DPI A4 print sheets.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 px-5 py-3 backdrop-blur-md text-left sm:text-center shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                            Filtered Entries
                        </p>

                        <p className="mt-0.5 text-2xl sm:text-3xl font-black text-white">
                            {filteredLogs.length}
                        </p>
                    </div>
                </div>
            </section>

            {/* GUIDED ONBOARDING BANNER */}
            <div className="print:hidden">
                <PageGuide
                    guideKey="reports_compliance"
                    title="Progress Reports & Compliance Register: Quick Guide"
                    summary="Review your chronological teaching register, filter by date, course or semester, and generate official documents."
                    steps={[
                        {
                            step: '1. Filter Records',
                            desc: 'Click "Advanced Filter & Sorting" to isolate specific date ranges, subjects, semesters, or status types.'
                        },
                        {
                            step: '2. Manage & Correct',
                            desc: 'Click "Manage Logs" to unlock edit and delete actions on any past entry.'
                        },
                        {
                            step: '3. A4 Physical Register',
                            desc: 'Click "A4 Print View" to open the high-DPI inspection sheet complete with HOD & Principal sign-off blocks.'
                        }
                    ]}
                />
            </div>

            {/* SUMMARY METRICS */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Records
                    </span>
                    <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {filteredLogs.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                        Classes Taken
                    </span>
                    <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-600">
                        {takenClasses}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                        Delivered Hours
                    </span>
                    <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-indigo-600">
                        {totalHours.toFixed(2)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                        Latest Record Date
                    </span>
                    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-amber-600 truncate">
                        {latestDate}
                    </p>
                </div>
            </section>

            {/* ZERO-COST DATA BACKUP & CLOUD SYNC SECTION */}
            <section className="rounded-3xl border border-indigo-900/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-6 text-white shadow-lg print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-3.5">
                        <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl shrink-0">
                            <DatabaseBackup className="w-6 h-6 text-blue-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-extrabold text-white">
                                    Academic Data &amp; Cloud Backup
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ₹0 Cost Model
                                </span>
                            </div>
                            <p className="text-xs text-blue-200/80 font-medium mt-1 leading-relaxed max-w-xl">
                                Keep your registers safe against mobile damage or browser resets. Save snapshots to your computer or sync directly to your personal Google Drive account.
                            </p>
                            {lastCloudSyncTime && (
                                <p className="text-[11px] font-semibold text-emerald-300 mt-1 flex items-center gap-1.5">
                                    <Cloud className="w-3.5 h-3.5" />
                                    Last synced to Google Drive at {lastCloudSyncTime}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* TWO GROUPS OF SYNC BUTTONS */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                        {/* 1. Google Drive Sync Buttons */}
                        <button
                            type="button"
                            disabled={isCloudSyncing}
                            onClick={handleGoogleDriveSync}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
                        >
                            <Cloud className="w-4 h-4 text-emerald-100" />
                            <span>{isCloudSyncing ? 'Connecting...' : 'Backup to Google Drive'}</span>
                        </button>

                        <button
                            type="button"
                            disabled={isCloudRestoring}
                            onClick={handleGoogleDriveRestore}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-800/80 hover:bg-teal-700 text-teal-100 font-extrabold text-xs rounded-xl border border-teal-400/30 shadow-md transition transform active:scale-95 disabled:opacity-50"
                            title="Restore your data from your Google Drive AppData folder"
                        >
                            <RefreshCw className={`w-4 h-4 text-teal-300 ${isCloudRestoring ? 'animate-spin' : ''}`} />
                            <span>{isCloudRestoring ? 'Downloading...' : 'Restore from Drive'}</span>
                        </button>

                        {/* 2. Local File Fallbacks */}
                        <div className="h-px sm:h-8 w-full sm:w-px bg-blue-800/50 my-1 sm:my-0" />

                        <button
                            type="button"
                            onClick={handleExportJSON}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-100 font-extrabold text-xs rounded-xl border border-blue-400/20 shadow-sm transition transform active:scale-95"
                            title="Export snapshot as a JSON file to your device"
                        >
                            <Download className="w-3.5 h-3.5 text-blue-300" />
                            <span>JSON File</span>
                        </button>

                        <button
                            type="button"
                            disabled={isRestoringFile}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-100 font-extrabold text-xs rounded-xl border border-blue-400/20 shadow-sm transition transform active:scale-95 disabled:opacity-50"
                            title="Restore snapshot from a JSON file"
                        >
                            <UploadCloud className="w-3.5 h-3.5 text-amber-300" />
                            <span>{isRestoringFile ? 'Restoring...' : 'Import JSON'}</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ACTION CONTROLS */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 sm:space-y-5 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                            Teaching Progress Register
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            Inspection-ready records arranged chronologically for academic compliance.
                        </p>
                    </div>

                    <Link
                        href="/reports/print"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95 shrink-0"
                    >
                        <Printer className="w-4 h-4 text-amber-400" />
                        A4 Print View (Sign-off Sheet)
                    </Link>
                </div>

                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                    {/* FILTER TOGGLE BUTTON */}
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`w-full inline-flex items-center justify-between px-4 sm:px-5 py-3 rounded-2xl text-xs font-black shadow-sm transition border ${
                            hasActiveFilters
                                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-blue-500" />
                            <span>Advanced Filter &amp; Sorting</span>
                            {hasActiveFilters && (
                                <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full text-[10px]">
                                    Active
                                </span>
                            )}
                        </div>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* BALANCED ACTION GRID */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition transform active:scale-95 text-center"
                        >
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            <span>Export Excel (.xlsx)</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportFullComplianceReport}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-2xl shadow-sm transition transform active:scale-95 text-center"
                            title="Exports multi-sheet workbook with Overview, Logs, Classes, and Holidays"
                        >
                            <Download className="w-4 h-4 shrink-0" />
                            <span>Full NAAC Workbook</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportPDF}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-2xl shadow-sm transition transform active:scale-95 text-center"
                        >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>Save PDF</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCorrectionMode(!correctionMode)}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-2xl text-white shadow-sm transition transform active:scale-95 text-center ${
                                correctionMode
                                    ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400'
                                    : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                        >
                            <Settings2 className="w-4 h-4 shrink-0" />
                            <span>{correctionMode ? '✓ Done' : 'Manage Logs'}</span>
                        </button>
                    </div>
                </div>

                {/* FILTER PANEL */}
                {showFilters && (
                    <div className="pt-3 border-t border-slate-100 space-y-4 animate-in fade-in">
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
                                        setSelectedCourseId('ALL');
                                        setSelectedSemester('ALL');
                                        setSelectedStatus('ALL');
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
                                    onChange={(e) => setStartDate(e.target.value)}
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
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Course / Subject
                                </label>
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Courses</option>
                                    {courses.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.code ? `(${c.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Class / Semester
                                </label>
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Classes / Semesters</option>
                                    {semesters.map((sem: string) => (
                                        <option key={sem} value={sem}>
                                            {sem}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Class Status
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="Taken">Taken</option>
                                    <option value="Compensated">Compensated</option>
                                    <option value="Postponed">Postponed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Leave">Leave</option>
                                    <option value="Mass Bunk">Mass Bunk</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 font-medium">
                            Showing filtered results ({filteredLogs.length} matching records)
                        </div>
                    </div>
                )}
            </section>

            {/* =====================================================
                REGISTER DISPLAY: DUAL VIEW
                - MOBILE (<768px): Structured App Cards
                - DESKTOP (>=768px): Full Audit Table
            ===================================================== */}

            {/* 1. MOBILE CARDS VIEW */}
            <div className="block md:hidden space-y-3.5 print:hidden">
                {filteredLogs.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 font-medium italic text-xs">
                        No matching teaching progress records found for the selected filters.
                    </div>
                ) : (
                    filteredLogs.map((l: any, index: number) => {
                        const slot: any = slotMap.get(l.slotId);
                        const isTaken = l.status === 'Taken' || l.status === 'Compensated';

                        return (
                            <div
                                key={l.id}
                                className={`rounded-3xl border p-4 shadow-sm transition space-y-3 ${
                                    correctionMode
                                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60'
                                        : 'bg-white border-slate-200'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-black text-[10px]">
                                            {index + 1}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                            {l.date}
                                        </div>
                                    </div>

                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                            isTaken
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {l.status || 'Taken'}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-blue-950">
                                        <span>{resolveCourseName(l.courseId)}</span>
                                        {resolveCourseCode(l.courseId) && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                                                {resolveCourseCode(l.courseId)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {slot?.period ? `Period ${slot.period}` : 'Extra Class'}
                                            {(l.actualStart || slot?.start) && (
                                                <span className="text-slate-400">
                                                    ({l.actualStart || slot?.start} – {l.actualEnd || slot?.end})
                                                </span>
                                            )}
                                        </span>

                                        {resolveClassInfo(l) && (
                                            <span className="flex items-center gap-1 text-indigo-700 font-bold">
                                                <Layers className="w-3 h-3" />
                                                {resolveClassInfo(l)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                            Topic Planned
                                        </span>
                                        <p className="text-slate-700 font-medium break-words mt-0.5">
                                            {getPlannedTopicName(l)}
                                        </p>
                                    </div>

                                    <div className="pt-1 border-t border-slate-200/60">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                                            Actually Covered
                                        </span>
                                        <p className="text-slate-900 font-bold break-words mt-0.5">
                                            {getActuallyCovered(l)}
                                        </p>
                                    </div>

                                    {l.remarks && (
                                        <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                                            Note: {l.remarks}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                                        <span>Hours: <strong className="text-slate-950 font-black">{Number(l.hours || 0).toFixed(2)}</strong></span>
                                        {l.attendance !== undefined && l.attendance !== null && (
                                            <span className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
                                                <UserCheck className="w-3 h-3" /> {l.attendance}
                                            </span>
                                        )}
                                    </div>

                                    {correctionMode && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openForCorrection(l.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 hover:bg-blue-100"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => deleteLogEntry(l.id, e)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 2. DESKTOP AUDIT TABLE VIEW */}
            <section className="hidden md:block overflow-hidden rounded-2xl border border-blue-900/20 bg-white shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b-2 border-blue-900 bg-blue-950 text-blue-50 text-[12px] font-black uppercase tracking-wider">
                                <th className="py-4 px-4 text-center w-14 border-r border-blue-900/60">Sl.</th>
                                <th className="py-4 px-4 w-32 border-r border-blue-900/60">Date</th>
                                <th className="py-4 px-4 w-40 border-r border-blue-900/60">Period / Time</th>
                                <th className="py-4 px-4 border-r border-blue-900/60">Class &amp; Subject</th>
                                <th className="py-4 px-4 border-r border-blue-900/60">Planned Topic</th>
                                <th className="py-4 px-4 border-r border-blue-900/60">Actually Covered</th>
                                <th className="py-4 px-4 text-center w-28 border-r border-blue-900/60">Status</th>
                                <th className="py-4 px-4 text-right w-24 border-r border-blue-900/60">Hours</th>
                                {correctionMode && (
                                    <th className="py-4 px-4 text-center w-36 bg-amber-600 text-white">Actions</th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={correctionMode ? 9 : 8}
                                        className="py-12 text-center text-slate-400 font-medium italic"
                                    >
                                        No matching teaching progress records found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((l: any, index: number) => {
                                    const slot: any = slotMap.get(l.slotId);

                                    return (
                                        <tr
                                            key={l.id}
                                            className={`transition ${
                                                correctionMode
                                                    ? 'bg-amber-50/40 hover:bg-amber-100/60 border-l-4 border-amber-500'
                                                    : index % 2 === 0
                                                    ? 'bg-white hover:bg-blue-50/40'
                                                    : 'bg-slate-50/70 hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <td className="py-3.5 px-4 text-center font-bold text-slate-500 border-r border-slate-100">
                                                {index + 1}
                                            </td>

                                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100">
                                                {l.date}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap border-r border-slate-100">
                                                <div className="font-extrabold text-slate-800">
                                                    {slot?.period ? `Period ${slot.period}` : l.classType || 'Extra Class'}
                                                </div>
                                                <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                    {l.actualStart || slot?.start || ''} – {l.actualEnd || slot?.end || ''}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 border-r border-slate-100">
                                                <div className="font-extrabold text-slate-900 leading-snug">
                                                    {resolveCourseName(l.courseId)}
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 mt-0.5">
                                                    {resolveClassInfo(l)}
                                                    {resolveCourseCode(l.courseId) && ` • [${resolveCourseCode(l.courseId)}]`}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-600 border-r border-slate-100 max-w-[180px]">
                                                {getPlannedTopicName(l)}
                                            </td>

                                            <td className="py-3.5 px-4 font-semibold text-slate-900 border-r border-slate-100 max-w-[220px]">
                                                <div>{getActuallyCovered(l)}</div>
                                                {l.remarks && (
                                                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                                                        Note: {l.remarks}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-center whitespace-nowrap border-r border-slate-100">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold ${
                                                        l.status === 'Taken'
                                                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                                            : l.status === 'Compensated'
                                                            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                                                            : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                                                    }`}
                                                >
                                                    {l.status || 'Taken'}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap border-r border-slate-100">
                                                {Number(l.hours || 0).toFixed(2)}
                                            </td>

                                            {correctionMode && (
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openForCorrection(l.id)}
                                                            title="Edit Details"
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition border border-blue-200"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => deleteLogEntry(l.id, e)}
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}