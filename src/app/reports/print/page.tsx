'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { load, loadProfile, ProfPlanData, UserProfile } from '@/lib/store';
import { Printer, ArrowLeft } from 'lucide-react';

export default function ReportsPrintPage() {
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
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        setMounted(true);
        const store = load();
        if (store) setD(store);
        const userProf = loadProfile();
        if (userProf) setProfile(userProf);
    }, []);

    const courses = useMemo(() => d?.courses || [], [d]);
    const classes = useMemo(() => d?.classes || [], [d]);
    const logs = useMemo(() => d?.logs || [], [d]);

    const classMap = useMemo(() => new Map(classes.map((cls: any) => [cls.id, cls])), [classes]);
    const courseMap = useMemo(() => new Map(courses.map((c: any) => [c.id, c])), [courses]);
    const slotMap = useMemo(() => new Map((d.slots || []).map((s: any) => [s.id, s])), [d.slots]);

    const sortedLogs = useMemo(() => {
        if (!logs) return [];
        return [...logs].sort((a: any, b: any) => {
            const dateA = String(a.date || '');
            const dateB = String(b.date || '');
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            const startA = String(a.actualStart || '');
            const startB = String(b.actualStart || '');
            return startA.localeCompare(startB);
        });
    }, [logs]);

    const totalDeliveredHours = useMemo(() => {
        return sortedLogs
            .filter((l: any) => l.status === 'Taken' || l.status === 'Compensated')
            .reduce((sum: number, log: any) => sum + Number(log.hours || 0), 0);
    }, [sortedLogs]);

    const totalClassesTaken = useMemo(() => {
        return sortedLogs.filter(
            (l: any) => l.status === 'Taken' || l.status === 'Compensated'
        ).length;
    }, [sortedLogs]);

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
        return log.semester || course?.semester || '—';
    }

    function getPlannedTopicName(log: any) {
        if (log.plannedTopicName) return log.plannedTopicName;
        if (log.topicId) {
            const topic = d.topics?.find((t: any) => t.id === log.topicId);
            if (topic) return topic.name || topic.title;
        }
        return '—';
    }

    function getActuallyCovered(log: any) {
        return log.covered || getPlannedTopicName(log) || '—';
    }

    if (!mounted) {
        return (
            <div className="flex min-h-screen items-center justify-center font-serif text-sm">
                Preparing printable register...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-2 sm:p-6 print:bg-white print:p-0 text-slate-900">
            {/* SCREEN NAVIGATION BAR */}
            <div className="max-w-[297mm] mx-auto mb-4 flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-300 shadow-sm print:hidden">
                <Link
                    href="/reports"
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Interactive Reports
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden sm:inline">
                        Optimized for A4 Landscape
                    </span>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                        <Printer className="w-4 h-4" />
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            {/* A4 PRINT CONTAINER */}
            <div className="max-w-[297mm] mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-2 print:m-0">
                {/* INSTITUTIONAL HEADER */}
                <header className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        APNSIR FOUNDATION · Academic Quality Assurance &amp; Departmental Compliance
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 mt-0.5">
                        {profile?.college || "Teacher's Daily Lesson Plan & Progress Register"}
                    </h1>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                        Official Inspection &amp; Performance Audit Sheet
                    </p>

                    <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-slate-800 mt-3 pt-2 border-t border-slate-300 text-left">
                        <div>
                            <span className="text-slate-500 font-normal">Educator: </span>
                            <strong>{profile?.name || 'Academic Faculty'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500 font-normal">Department: </span>
                            <strong>{profile?.department || 'Sociology / General'}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500 font-normal">Designation: </span>
                            <strong>{profile?.designation || 'Lecturer / Asst. Professor'}</strong>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-500 font-normal">Classes / Delivered: </span>
                            <strong>{totalClassesTaken} ({totalDeliveredHours.toFixed(2)} hrs)</strong>
                        </div>
                    </div>
                </header>

                {/* AUDIT REGISTER TABLE */}
                <table className="w-full border-collapse text-left text-[11px] border border-slate-900">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold uppercase text-[10px]">
                            <th className="py-1.5 px-2 border-r border-slate-900 text-center w-8">Sl.</th>
                            <th className="py-1.5 px-2 border-r border-slate-900 w-20">Date</th>
                            <th className="py-1.5 px-2 border-r border-slate-900 w-24">Period / Time</th>
                            <th className="py-1.5 px-2 border-r border-slate-900 w-36">Class &amp; Paper</th>
                            <th className="py-1.5 px-2 border-r border-slate-900">Planned Topic</th>
                            <th className="py-1.5 px-2 border-r border-slate-900">Actually Covered / Transaction</th>
                            <th className="py-1.5 px-2 border-r border-slate-900 text-center w-16">Status</th>
                            <th className="py-1.5 px-2 border-r border-slate-900 text-right w-12">Hours</th>
                            <th className="py-1.5 px-2 text-center w-12">Attend.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLogs.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                                    No recorded progress entries found in this register.
                                </td>
                            </tr>
                        ) : (
                            sortedLogs.map((l: any, index: number) => {
                                const slot: any = slotMap.get(l.slotId);
                                return (
                                    <tr key={l.id} className="border-b border-slate-400 break-inside-avoid">
                                        <td className="py-1 px-1.5 text-center font-bold border-r border-slate-400">
                                            {index + 1}
                                        </td>
                                        <td className="py-1 px-1.5 font-bold border-r border-slate-400 whitespace-nowrap">
                                            {l.date}
                                        </td>
                                        <td className="py-1 px-1.5 border-r border-slate-400 whitespace-nowrap leading-tight">
                                            <div>{slot?.period ? `Period ${slot.period}` : l.classType || 'Extra'}</div>
                                            <div className="text-[9px] text-slate-500">
                                                {l.actualStart || slot?.start || ''} - {l.actualEnd || slot?.end || ''}
                                            </div>
                                        </td>
                                        <td className="py-1 px-1.5 border-r border-slate-400 leading-tight">
                                            <div className="font-bold">{resolveCourseName(l.courseId)}</div>
                                            <div className="text-[10px] text-slate-600">
                                                {resolveClassInfo(l)}
                                                {resolveCourseCode(l.courseId) && ` • ${resolveCourseCode(l.courseId)}`}
                                            </div>
                                        </td>
                                        <td className="py-1 px-1.5 border-r border-slate-400 leading-tight">
                                            {getPlannedTopicName(l)}
                                        </td>
                                        <td className="py-1 px-1.5 border-r border-slate-400 leading-tight font-medium">
                                            <div>{getActuallyCovered(l)}</div>
                                            {l.remarks && (
                                                <div className="text-[9px] text-slate-500 italic">
                                                    Note: {l.remarks}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1 px-1.5 text-center border-r border-slate-400 font-bold whitespace-nowrap">
                                            {l.status || 'Taken'}
                                        </td>
                                        <td className="py-1 px-1.5 text-right font-bold border-r border-slate-400 whitespace-nowrap">
                                            {Number(l.hours || 0).toFixed(2)}
                                        </td>
                                        <td className="py-1 px-1.5 text-center border-slate-400 whitespace-nowrap font-medium">
                                            {l.attendance ?? '—'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* SIGNATURE & VERIFICATION BLOCK */}
                <div className="mt-14 pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-900 break-inside-avoid">
                    <div>
                        <div className="h-10"></div>
                        <div className="border-t border-slate-800 pt-1.5">
                            Signature of Teacher / Educator
                        </div>
                    </div>
                    <div>
                        <div className="h-10"></div>
                        <div className="border-t border-slate-800 pt-1.5">
                            Verified by Head of Department (HOD)
                        </div>
                    </div>
                    <div>
                        <div className="h-10"></div>
                        <div className="border-t border-slate-800 pt-1.5">
                            Countersigned by Principal / Dean
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <footer className="mt-6 text-center text-[9px] text-slate-500">
                    Generated via ProfPlan · OdishaTeachers.com · Compliant with Institutional Record Verification Standards
                </footer>
            </div>
        </div>
    );
}