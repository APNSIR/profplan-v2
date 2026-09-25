'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { load, save, ProfPlanData } from '@/lib/store';
import DataHubModal from '@/components/DataHubModal';
import {
    Calendar,
    Clock,
    MapPin,
    BookOpen,
    PlusCircle,
    CheckCircle2,
    Percent,
    Sparkles,
    Check,
    RotateCcw,
    X,
    ArrowRight,
    GraduationCap,
    CalendarDays,
    Plus,
    AlertTriangle,
    SunMedium,
    ShieldAlert,
    Layers,
    Trash2,
    BarChart3,
    ShieldCheck,
    Download
} from 'lucide-react';

export default function TodayPage() {
    const [mounted, setMounted] = useState(false);

    const [d, setD] = useState<ProfPlanData>({
        classes: [],
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: []
    });

    const [activeSlot, setActiveSlot] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // ---------------------------------------------------------
    // 1. DATA HUB MODAL (BACKUP & REGISTER EXPORT)
    // ---------------------------------------------------------
    const [isDataHubOpen, setIsDataHubOpen] = useState(false);

    // ---------------------------------------------------------
    // ADD CLASS / SEMESTER MODAL
    // ---------------------------------------------------------
    const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts');
    const [isCustomStream, setIsCustomStream] = useState(false);
    const [newlyAddedClasses, setNewlyAddedClasses] = useState<any[]>([]);
    const [classSaveMessage, setClassSaveMessage] = useState<string | null>(null);
    const classNameInputRef = useRef<HTMLInputElement>(null);

    // ---------------------------------------------------------
    // SUSPENSION MODAL
    // ---------------------------------------------------------
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState(
        'Classes Suspended due to Examination'
    );

    // ---------------------------------------------------------
    // QUICK LOG STATE
    // ---------------------------------------------------------
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [topicCovered, setTopicCovered] = useState('');
    const [attendance, setAttendance] = useState('');
    const [status, setStatus] = useState('Taken');
    const [remarks, setRemarks] = useState('');

    // Dynamic date state
    const [currentDate, setCurrentDate] = useState(() => new Date());

    // ---------------------------------------------------------
    // LOAD LOCAL DATA
    // ---------------------------------------------------------
    useEffect(() => {
        setMounted(true);

        try {
            const initialData = load();
            if (initialData) {
                setD(initialData);
            }
        } catch (err) {
            console.error('Failed to load ProfPlan local store data:', err);
            setErrorMessage('Could not load local session data. Please check your storage settings.');
        }

        const refresh = () => {
            try {
                const updated = load();
                if (updated) {
                    setD(updated);
                }
            } catch (err) {
                console.error('Failed to refresh store data:', err);
            }
        };

        window.addEventListener('profplan-change', refresh);
        window.addEventListener('storage', refresh);

        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);

        return () => {
            window.removeEventListener('profplan-change', refresh);
            window.removeEventListener('storage', refresh);
            clearInterval(timer);
        };
    }, []);

    // ---------------------------------------------------------
    // TODAY'S DATE & DAY NORMALIZATION
    // ---------------------------------------------------------
    const todayDateStr = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [currentDate]);

    const dayNumber = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const dayName = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayNumber];
    }, [dayNumber]);

    // ---------------------------------------------------------
    // HOLIDAY
    // ---------------------------------------------------------
    const todayHoliday = useMemo(() => {
        if (!d?.holidays || !Array.isArray(d.holidays)) {
            return null;
        }

        return (
            d.holidays.find((h: any) => h.date === todayDateStr) || null
        );
    }, [d.holidays, todayDateStr]);

    // ---------------------------------------------------------
    // SUSPENSION
    // ---------------------------------------------------------
    const existingSuspensionLog = useMemo(() => {
        if (!d?.logs || !Array.isArray(d.logs)) {
            return null;
        }

        return (
            d.logs.find(
                (l: any) =>
                    l.date === todayDateStr &&
                    l.classType === 'Non-Instructional / Suspension'
            ) || null
        );
    }, [d.logs, todayDateStr]);

    // ---------------------------------------------------------
    // FIRST TIME / INCOMPLETE SETUP
    // ---------------------------------------------------------
    const isFirstTimeUser = useMemo(() => {
        return (
            (!d.classes || d.classes.length === 0) ||
            (!d.courses || d.courses.length === 0) ||
            (!d.slots || d.slots.length === 0)
        );
    }, [d.classes, d.courses, d.slots]);

    // ---------------------------------------------------------
    // OPEN ADD CLASS / SEMESTER MODAL
    // ---------------------------------------------------------
    const openAddClassModal = () => {
        setNewClassName('');
        setNewClassStream('Arts');
        setIsCustomStream(false);
        setNewlyAddedClasses([]);
        setClassSaveMessage(null);
        setErrorMessage(null);
        setIsAddClassModalOpen(true);

        setTimeout(() => {
            classNameInputRef.current?.focus();
        }, 100);
    };

    // ---------------------------------------------------------
    // CLOSE ADD CLASS / SEMESTER MODAL
    // ---------------------------------------------------------
    const closeAddClassModal = () => {
        setIsAddClassModalOpen(false);
        setNewClassName('');
        setNewClassStream('Arts');
        setIsCustomStream(false);
        setNewlyAddedClasses([]);
        setClassSaveMessage(null);
    };

    // ---------------------------------------------------------
    // SAVE NEW CLASS / SEMESTER
    // ---------------------------------------------------------
    const handleSaveNewClass = (e: React.FormEvent) => {
        e.preventDefault();

        const className = newClassName.trim();
        const streamName = newClassStream.trim();

        if (!className || !streamName) {
            setClassSaveMessage('Please enter the Class / Semester and select or enter a Stream / Faculty / Branch.');
            return;
        }

        const duplicateExists = (d.classes || []).some(
            (c: any) =>
                String(c.name || '').trim().toLowerCase() === className.toLowerCase() &&
                String(c.stream || '').trim().toLowerCase() === streamName.toLowerCase()
        );

        if (duplicateExists) {
            setClassSaveMessage('This Class / Semester with the same Stream / Faculty / Branch is already registered.');
            setTimeout(() => {
                classNameInputRef.current?.focus();
            }, 50);
            return;
        }

        try {
            const newClassObj = {
                id: 'cls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                name: className,
                stream: streamName
            };

            const updatedClasses = [...(d.classes || []), newClassObj];
            const updatedData = { ...d, classes: updatedClasses };

            save(updatedData);
            setD(updatedData);

            setNewlyAddedClasses(prev => [...prev, newClassObj]);
            setNewClassName('');
            setNewClassStream('Arts');
            setIsCustomStream(false);
            setErrorMessage(null);

            setClassSaveMessage(`"${className}" has been added successfully. You can now add the next class / semester.`);

            setTimeout(() => {
                classNameInputRef.current?.focus();
            }, 100);
        } catch (err) {
            console.error('Error saving new class:', err);
            setErrorMessage('Failed to save class to storage. Please try again.');
        }
    };

    // ---------------------------------------------------------
    // DELETE CLASS
    // ---------------------------------------------------------
    const handleDeleteClass = (clsId: string) => {
        if (!window.confirm('Delete this class/semester?')) {
            return;
        }

        try {
            const updatedClasses = (d.classes || []).filter((c: any) => c.id !== clsId);
            const updatedData = { ...d, classes: updatedClasses };

            save(updatedData);
            setD(updatedData);

            setNewlyAddedClasses(prev => prev.filter(c => c.id !== clsId));
            setErrorMessage(null);
            setClassSaveMessage(null);
        } catch (err) {
            console.error('Error deleting class:', err);
            setErrorMessage('Failed to update storage during deletion.');
        }
    };

    // ---------------------------------------------------------
    // TIME HELPER
    // ---------------------------------------------------------
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.trim().split(':').map(Number);
        return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
    };

    // ---------------------------------------------------------
    // 2. TODAY'S TIMETABLE PERIODS
    // ---------------------------------------------------------
    const todaySlots = useMemo(() => {
        if (!d?.slots || !Array.isArray(d.slots)) {
            return [];
        }

        return d.slots
            .filter((s: any) => {
                if (s.day === undefined || s.day === null) return false;

                const rawDayStr = String(s.day).trim().toLowerCase();
                const currentDayLower = dayName.toLowerCase();

                if (rawDayStr === currentDayLower) return true;
                if (rawDayStr.length >= 3 && currentDayLower.startsWith(rawDayStr.slice(0, 3))) return true;

                const numericDay = Number(s.day);
                if (!Number.isNaN(numericDay)) {
                    if (numericDay === dayNumber) return true;
                    const isoDay = dayNumber === 0 ? 7 : dayNumber;
                    if (numericDay === isoDay) return true;
                }

                return false;
            })
            .sort((a: any, b: any) => {
                const startDiff = timeToMinutes(a.start) - timeToMinutes(b.start);
                if (startDiff !== 0) return startDiff;

                const endDiff = timeToMinutes(a.end) - timeToMinutes(b.end);
                if (endDiff !== 0) return endDiff;

                return (Number(a.period) || 0) - (Number(b.period) || 0);
            });
    }, [d.slots, dayName, dayNumber]);

    // ---------------------------------------------------------
    // EXTRA / UNSCHEDULED CLASSES
    // ---------------------------------------------------------
    const todayExtraClasses = useMemo(() => {
        if (!d?.logs || !Array.isArray(d.logs)) {
            return [];
        }

        return d.logs
            .filter(
                (l: any) =>
                    l.date === todayDateStr &&
                    l.classSource === 'Extra / Unscheduled Class'
            )
            .sort(
                (a: any, b: any) =>
                    timeToMinutes(a.actualStart || '00:00') -
                    timeToMinutes(b.actualStart || '00:00')
            );
    }, [d.logs, todayDateStr]);

    // ---------------------------------------------------------
    // COMPLETED SCHEDULED PERIOD IDs
    // ---------------------------------------------------------
    const doneSlotIds = useMemo(() => {
        if (!d?.logs || !Array.isArray(d.logs)) {
            return [];
        }

        return d.logs
            .filter((l: any) => l.date === todayDateStr && l.slotId)
            .map((l: any) => l.slotId);
    }, [d.logs, todayDateStr]);

    // ---------------------------------------------------------
    // 3. ALL COMPLETED CLASSES TODAY
    // ---------------------------------------------------------
    const allCompletedLogsToday = useMemo(() => {
        if (!d?.logs || !Array.isArray(d.logs)) return [];
        return d.logs.filter(
            (l: any) =>
                l.date === todayDateStr &&
                (l.status === 'Taken' || l.status === 'Compensated')
        );
    }, [d.logs, todayDateStr]);

    const totalClassesCompletedCount = allCompletedLogsToday.length;

    // ---------------------------------------------------------
    // TODAY'S DELIVERED HOURS
    // ---------------------------------------------------------
    const todayDeliveredHours = useMemo(() => {
        const sum = allCompletedLogsToday.reduce(
            (acc: number, curr: any) => acc + (Number(curr.hours) || 0),
            0
        );
        return sum.toFixed(2);
    }, [allCompletedLogsToday]);

    // ---------------------------------------------------------
    // DAILY COMPLETION RATE
    // ---------------------------------------------------------
    const completionRate = useMemo(() => {
        if (todaySlots.length > 0) {
            return Math.min(100, Math.round((doneSlotIds.length / todaySlots.length) * 100));
        }
        return totalClassesCompletedCount > 0 ? 100 : 0;
    }, [todaySlots.length, doneSlotIds.length, totalClassesCompletedCount]);

    const getCourse = (id: string) =>
        (d.courses || []).find((c: any) => c.id === id);

    const getCourseTopics = (courseId: string) =>
        (d.topics || []).filter((t: any) => t.courseId === courseId);

    // ---------------------------------------------------------
    // RECORD NON-INSTRUCTIONAL DAY
    // ---------------------------------------------------------
    const handleRecordNonInstructionalDay = (reasonText: string) => {
        try {
            const fallbackCourse = (d.courses || [])[0];
            const dummyCourseId = fallbackCourse ? fallbackCourse.id : 'general_course_placeholder';

            const logEntry: any = {
                id: 'log_suspension_' + Date.now(),
                date: todayDateStr,
                courseId: dummyCourseId,
                slotId: '',
                topicId: '',
                plannedTopicName: reasonText,
                covered: reasonText,
                status: 'Leave',
                classSource: 'Institutional Notice',
                classType: 'Non-Instructional / Suspension',
                hours: 0,
                attendance: undefined,
                room: 'All Campus',
                semester: 'All Semesters',
                remarks: 'Recorded via Today Dashboard'
            };

            const updatedLogs = [
                ...(d.logs || [])
            ].filter(
                (l: any) =>
                    !(
                        l.date === todayDateStr &&
                        l.classType === 'Non-Instructional / Suspension'
                    )
            );

            updatedLogs.push(logEntry);

            const updatedData = { ...d, logs: updatedLogs };
            save(updatedData);
            setD(updatedData);
            setIsSuspendModalOpen(false);
            setErrorMessage(null);
        } catch (err) {
            console.error('Failed to record suspension/holiday status:', err);
            setErrorMessage('Failed to save suspension record. Storage quota or format error.');
        }
    };

    // ---------------------------------------------------------
    // REMOVE SUSPENSION
    // ---------------------------------------------------------
    const handleRemoveSuspensionLog = () => {
        if (!existingSuspensionLog) return;

        if (!window.confirm('Remove this holiday/suspension status from today’s register?')) {
            return;
        }

        try {
            const updatedLogs = (d.logs || []).filter(
                (l: any) => l.id !== existingSuspensionLog.id
            );

            const updatedData = { ...d, logs: updatedLogs };
            save(updatedData);
            setD(updatedData);
            setErrorMessage(null);
        } catch (err) {
            console.error('Failed to remove suspension status:', err);
            setErrorMessage('Failed to update storage during removal.');
        }
    };

    // ---------------------------------------------------------
    // OPEN QUICK LOG
    // ---------------------------------------------------------
    const handleOpenQuickLog = (slot: any) => {
        const courseTopics = getCourseTopics(slot.courseId);
        const defaultTopic = courseTopics[0];

        setActiveSlot(slot);
        setSelectedTopicId(defaultTopic?.id || '');
        setTopicCovered(defaultTopic?.name || defaultTopic?.title || '');
        setAttendance('');
        setStatus('Taken');
        setRemarks('');
        setErrorMessage(null);
    };

    // ---------------------------------------------------------
    // TOPIC DROPDOWN
    // ---------------------------------------------------------
    const handleTopicDropdownChange = (topicId: string) => {
        setSelectedTopicId(topicId);
        const chosen = (d.topics || []).find((t: any) => t.id === topicId);
        if (chosen) {
            setTopicCovered(chosen.name || chosen.title || '');
        }
    };

    // ---------------------------------------------------------
    // SAVE QUICK LOG
    // ---------------------------------------------------------
    const handleSaveQuickLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSlot) return;

        try {
            const diff =
                timeToMinutes(activeSlot.end) - timeToMinutes(activeSlot.start);

            const calculatedHours =
                diff > 0 ? Number((diff / 60).toFixed(2)) : 0.75;

            const plannedTopicObj = (d.topics || []).find(
                (t: any) => t.id === selectedTopicId
            );

            const typedTopic = topicCovered.trim();
            const resolvedPlannedName =
                plannedTopicObj?.name ||
                plannedTopicObj?.title ||
                (typedTopic ? typedTopic : 'General / Unplanned');

            const resolvedCovered = typedTopic || resolvedPlannedName;

            const newLog: any = {
                id: 'log_' + Date.now(),
                date: todayDateStr,
                slotId: activeSlot.id,
                courseId: activeSlot.courseId,
                topicId: selectedTopicId || '',
                plannedTopicName: resolvedPlannedName,
                status: status as any,
                classSource: 'Scheduled Class',
                type: 'Regular Lecture',
                actualStart: activeSlot.start,
                actualEnd: activeSlot.end,
                covered: resolvedCovered,
                hours: calculatedHours,
                attendance: attendance ? Number(attendance) : undefined,
                remarks: remarks.trim()
            };

            const updatedLogs = [
                ...(d.logs || [])
            ].filter(
                (l: any) =>
                    !(l.date === todayDateStr && l.slotId === activeSlot.id)
            );

            updatedLogs.push(newLog);

            const updatedData = { ...d, logs: updatedLogs };
            save(updatedData);
            setD(updatedData);
            setActiveSlot(null);
            setErrorMessage(null);
        } catch (err) {
            console.error('Failed to save quick log:', err);
            setErrorMessage('Failed to save progress log. Please check your inputs or storage quota.');
        }
    };

    // ---------------------------------------------------------
    // UNDO LOG
    // ---------------------------------------------------------
    const handleUndoLog = (slotId: string) => {
        const confirmed = window.confirm(
            'Re-open this teaching period? The existing progress log will be removed.'
        );
        if (!confirmed) return;

        try {
            const updatedLogs = (d.logs || []).filter(
                (l: any) => !(l.date === todayDateStr && l.slotId === slotId)
            );

            const updatedData = { ...d, logs: updatedLogs };
            save(updatedData);
            setD(updatedData);
            setErrorMessage(null);
        } catch (err) {
            console.error('Failed to undo log entry:', err);
            setErrorMessage('Failed to update storage during undo action.');
        }
    };

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading ProfPlan Dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">

            {/* ERROR NOTIFICATION */}
            {errorMessage && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center justify-between shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span className="font-bold">{errorMessage}</span>
                    </div>
                    <button
                        onClick={() => setErrorMessage(null)}
                        className="text-rose-700 font-extrabold hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* HERO BANNER */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white p-1 shadow-lg ring-2 ring-white/30 hidden sm:block">
                            <Image
                                src="/apnsir-logo.png"
                                alt="APNSIR FOUNDATION"
                                width={56}
                                height={56}
                                className="h-full w-full object-contain rounded-full"
                                priority
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                An Initiative by APNSIR FOUNDATION
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
                                Today&apos;s Class Schedule
                            </h1>

                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                                {currentDate.toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                                <span className="text-blue-300 mx-1">·</span>
                                Daily Teaching Routine &amp; Progress Register
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsDataHubOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-extrabold text-xs shadow-md transition transform active:scale-95"
                        >
                            <ShieldCheck className="w-4 h-4 text-emerald-300" />
                            Backup &amp; Export Hub
                        </button>
                    </div>
                </div>
            </section>

            {/* FIRST-TIME SETUP CALLOUT */}
            {isFirstTimeUser && (
                <div className="rounded-3xl border-2 border-blue-600/40 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white p-6 md:p-7 shadow-md animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow">
                            🚀
                        </span>
                        <h2 className="text-base md:text-lg font-black text-blue-950">
                            Welcome to ProfPlan! Let&apos;s set up your teaching workspace
                        </h2>
                    </div>

                    <p className="text-xs text-slate-600 mb-4 max-w-2xl font-medium">
                        Start by adding the classes/semesters you teach. Then add your subjects and set your weekly timetable.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <button
                            type="button"
                            onClick={openAddClassModal}
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-blue-200 hover:border-blue-600 hover:shadow-md transition group text-left w-full"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-blue-100 text-blue-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">
                                        Step 1: Add Classes / Semesters
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        e.g. BA 1st Semester, +2 1st Year, Class XI
                                    </p>
                                </div>
                            </div>
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                        </button>

                        <Link
                            href="/syllabus"
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-indigo-200 hover:border-indigo-600 hover:shadow-md transition group"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">
                                        Step 2: Add Subjects &amp; Units
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Add subjects and organise their syllabus units
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
                        </Link>

                        <Link
                            href="/timetable"
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-purple-200 hover:border-purple-600 hover:shadow-md transition group"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-purple-100 text-purple-800 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">
                                        Step 3: Set Weekly Timetable
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Assign subjects to periods &amp; rooms
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
                        </Link>
                    </div>

                    {d.classes && d.classes.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">
                                Configured Classes:
                            </span>

                            {d.classes.map((cls: any) => (
                                <span
                                    key={cls.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 text-blue-900 font-extrabold text-xs"
                                >
                                    {cls.name} ({cls.stream})
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteClass(cls.id)}
                                        className="text-blue-500 hover:text-rose-600"
                                        title="Delete class/semester"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: ADD CLASSES / SEMESTERS */}
            {isAddClassModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Add Classes / Semesters
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Register all the academic groups you teach
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeAddClassModal}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 py-5 space-y-4">
                            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-blue-950">
                                            Add all your classes in one session
                                        </p>
                                        <p className="text-[11px] text-blue-800/80 font-medium mt-0.5 leading-relaxed">
                                            You can add 5–7 or more classes/semesters without closing this window. After each save, simply enter the next one.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-700">
                                        Added in this session
                                    </span>
                                </div>
                                <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-blue-600 text-white text-xs font-black">
                                    {newlyAddedClasses.length}
                                </span>
                            </div>

                            {classSaveMessage && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="font-bold leading-relaxed">{classSaveMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveNewClass} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                        Class / Semester <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        ref={classNameInputRef}
                                        type="text"
                                        placeholder="e.g. BA 1st Semester, +2 1st Year Arts, Class XI"
                                        value={newClassName}
                                        onChange={(e) => {
                                            setNewClassName(e.target.value);
                                            setClassSaveMessage(null);
                                        }}
                                        required
                                        className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                        Stream / Faculty / Branch <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={isCustomStream ? 'Other' : newClassStream}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setClassSaveMessage(null);
                                            if (value === 'Other') {
                                                setIsCustomStream(true);
                                                setNewClassStream('');
                                            } else {
                                                setIsCustomStream(false);
                                                setNewClassStream(value);
                                            }
                                        }}
                                        className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                    >
                                        <option value="">Select Stream / Faculty / Branch</option>
                                        <option value="Arts">Arts</option>
                                        <option value="Science">Science</option>
                                        <option value="Commerce">Commerce</option>
                                        <option value="Vocational">Vocational</option>
                                        <option value="B.Tech">B.Tech</option>
                                        <option value="Medicine">Medicine</option>
                                        <option value="Other">+ Add Stream / Faculty / Branch</option>
                                    </select>

                                    {isCustomStream && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                value={newClassStream}
                                                onChange={(e) => setNewClassStream(e.target.value)}
                                                placeholder="Enter Stream / Faculty / Branch"
                                                required
                                                autoFocus
                                                className="w-full px-3.5 py-3 text-sm rounded-xl border border-blue-300 bg-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomStream(false);
                                                    setNewClassStream('Arts');
                                                    setClassSaveMessage(null);
                                                }}
                                                className="mt-1.5 text-[11px] font-bold text-blue-700 hover:underline"
                                            >
                                                ← Choose from standard options
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition transform active:scale-[0.99]"
                                >
                                    <Plus className="w-4 h-4" />
                                    Save &amp; Add More Classes / Semesters
                                </button>
                            </form>

                            {newlyAddedClasses.length > 0 && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-emerald-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span className="text-xs font-black text-emerald-900">
                                                Added in This Session
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                            {newlyAddedClasses.length} {newlyAddedClasses.length === 1 ? 'Entry' : 'Entries'}
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-1.5">
                                        {newlyAddedClasses.map((c: any, index: number) => (
                                            <div
                                                key={c.id}
                                                className="flex items-center justify-between gap-3 bg-white border border-emerald-100 rounded-xl px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black">
                                                        {index + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-900 truncate">{c.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-500 truncate">{c.stream}</p>
                                                    </div>
                                                </div>
                                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {d.classes && d.classes.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                            All Registered Classes / Semesters
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {d.classes.length} total
                                        </span>
                                    </div>
                                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                        {d.classes.map((c: any) => (
                                            <div
                                                key={c.id}
                                                className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-black truncate">{c.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-normal truncate">{c.stream}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClass(c.id)}
                                                    className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition"
                                                    title="Delete class/semester"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
                            <div className="text-[11px] text-slate-500 font-medium">
                                {newlyAddedClasses.length > 0
                                    ? `${newlyAddedClasses.length} class${newlyAddedClasses.length === 1 ? '' : 'es'} added. Continue or finish setup.`
                                    : 'Add as many classes / semesters as you need.'}
                            </div>
                            <button
                                type="button"
                                onClick={closeAddClassModal}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold shadow-sm transition whitespace-nowrap"
                            >
                                Done / Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRIMARY ACTION TOOLBAR */}
            <section className="space-y-3">
                {isFirstTimeUser && (
                    <div className="px-1">
                        <h2 className="text-base font-black text-slate-900">Start Here</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Set up your teaching workspace in the correct order.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <button
                        type="button"
                        onClick={openAddClassModal}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100 block">
                                    Academic Setup
                                </span>
                                <h2 className="text-sm font-black text-white">
                                    Add Classes / Semesters
                                </h2>
                            </div>
                        </div>
                        <Plus className="w-4 h-4 text-blue-200 group-hover:scale-110 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!d.classes || d.classes.length === 0) {
                                openAddClassModal();
                            } else {
                                window.location.href = '/timetable';
                            }
                        }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <CalendarDays className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                                    Routine Setup
                                </span>
                                <h2 className="text-sm font-black text-white">
                                    Set Weekly Timetable
                                </h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition" />
                    </button>

                    <Link
                        href="/log"
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <PlusCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-100 block">
                                    Register Entry
                                </span>
                                <h2 className="text-sm font-black text-white">
                                    Record Today&apos;s Class
                                </h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-1 transition" />
                    </Link>

                    <Link
                        href="/holidays"
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <SunMedium className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-100 block">
                                    Calendar Hub
                                </span>
                                <h2 className="text-sm font-black text-white">
                                    Manage Holiday List
                                </h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-200 group-hover:translate-x-1 transition" />
                    </Link>

                    <Link
                        href="/reports"
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-100 block">
                                    Review &amp; Analysis
                                </span>
                                <h2 className="text-sm font-black text-white">
                                    View Reports
                                </h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </section>

            {/* HOLIDAY ALERT */}
            {todayHoliday && (
                <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md">
                            <SunMedium className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                                    {(todayHoliday as any).type || 'Institutional Holiday'}
                                </span>
                                <h2 className="text-lg font-black text-amber-950">
                                    {todayHoliday.name}
                                </h2>
                            </div>
                            <p className="text-xs font-semibold text-amber-800/90 mt-0.5">
                                {todayHoliday.description ||
                                    'Institutional non-instructional day. Standard routine classes are paused.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {existingSuspensionLog ? (
                            <button
                                type="button"
                                onClick={handleRemoveSuspensionLog}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                                <Check className="w-4 h-4" />
                                Holiday Recorded — Undo
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    handleRecordNonInstructionalDay(`Holiday: ${todayHoliday.name}`)
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition transform active:scale-95"
                            >
                                <CalendarDays className="w-4 h-4" />
                                Record Holiday in Register
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* SUSPENSION / NOTICE */}
            {existingSuspensionLog && !todayHoliday && (
                <div className="rounded-3xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-orange-50 to-rose-50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-md">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                                Notice / Suspension Active
                            </span>
                            <h2 className="text-lg font-black text-rose-950 mt-0.5">
                                {(existingSuspensionLog as any).plannedTopicName}
                            </h2>
                            <p className="text-xs font-semibold text-rose-800/90 mt-0.5">
                                Today&apos;s teaching periods are marked as suspended in the progress register.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleRemoveSuspensionLog}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Revert Suspension Status
                    </button>
                </div>
            )}

            {/* METRICS */}
            <section className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Today&apos;s Routine
                            </span>
                            <p className="mt-1 text-3xl font-black text-slate-900">
                                {todaySlots.length}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Periods scheduled today
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-2xl">
                            <BookOpen className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Classes Completed
                            </span>
                            <p className="mt-1 text-3xl font-black text-emerald-600">
                                {totalClassesCompletedCount}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {todayDeliveredHours} teaching hours
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Daily Completion
                            </span>
                            <p className="mt-1 text-3xl font-black text-indigo-600">
                                {completionRate}%
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">Teaching progress</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Percent className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
            </section>

            {/* TODAY'S SCHEDULE */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Today&apos;s Class Schedule
                        </h2>
                        <p className="text-xs font-medium text-slate-500">
                            Today&apos;s periods in chronological order
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setIsDataHubOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            Export Register
                        </button>

                        <Link
                            href="/timetable"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition shadow-sm"
                        >
                            <CalendarDays className="w-3.5 h-3.5 text-blue-700" />
                            Full Timetable
                        </Link>

                        <Link
                            href="/timetable"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-blue-950 hover:bg-blue-900 rounded-xl transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            + Add Period for Today
                        </Link>
                    </div>
                </div>

                {todaySlots.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 md:p-12 text-center shadow-sm space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                            ☕
                        </div>

                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                                {todayHoliday
                                    ? `${todayHoliday.name} — No Routine Classes`
                                    : 'No Routine Classes Scheduled for Today'}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                {todayHoliday
                                    ? 'Enjoy your holiday! If you are conducting special classes, student doubt sessions, or extra activities, use the register options above.'
                                    : 'You have no timetable periods assigned for this day of the week. Add a recurring period below or register an extra class.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                            {todayHoliday && !existingSuspensionLog && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRecordNonInstructionalDay(`Holiday: ${todayHoliday.name}`)
                                    }
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                                >
                                    <CalendarDays className="w-4 h-4" />
                                    Record Holiday in Register
                                </button>
                            )}

                            <Link
                                href="/timetable"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition transform active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Set Up Timetable Routine
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaySlots.map((s: any) => {
                            const c = getCourse(s.courseId);
                            const isDone = doneSlotIds.includes(s.id);

                            return (
                                <div
                                    key={s.id}
                                    className={`rounded-3xl border p-5 shadow-sm transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                                        isDone
                                            ? 'border-emerald-200 bg-emerald-50/30'
                                            : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-md font-black text-xs ${
                                                    isDone
                                                        ? 'bg-emerald-700 text-white'
                                                        : 'bg-blue-950 text-white'
                                                }`}
                                            >
                                                Period {s.period}
                                            </span>

                                            <h3 className="text-base font-extrabold text-slate-900">
                                                {c?.name || 'Unknown Subject'}
                                            </h3>

                                            {c?.code && (
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                                    {c.code}
                                                </span>
                                            )}

                                            {(s.semesterClass || c?.semester) && (
                                                <span className="text-xs font-semibold text-slate-500">
                                                    · {s.semesterClass || c?.semester}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                {s.start} – {s.end}
                                            </span>

                                            {s.room && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {s.room}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {isDone ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs ring-1 ring-emerald-300">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Logged
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleUndoLog(s.id)}
                                                    title="Re-open this teaching period"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenQuickLog(s)}
                                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95"
                                            >
                                                <Check className="w-4 h-4" />
                                                Mark Period Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* EXTRA / UNSCHEDULED CLASSES */}
            {todayExtraClasses.length > 0 && (
                <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <h3 className="text-sm font-black text-slate-900">
                            Extra / Unscheduled Classes Today
                        </h3>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {todayExtraClasses.length}
                        </span>
                    </div>

                    {todayExtraClasses.map((extra: any) => {
                        const c = getCourse(extra.courseId);

                        return (
                            <div
                                key={extra.id}
                                className="rounded-3xl border-2 border-amber-200 bg-amber-50/40 p-5 shadow-sm"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-md bg-amber-600 text-white font-black text-xs">
                                                Extra / Unscheduled
                                            </span>

                                            <h3 className="text-base font-extrabold text-slate-900">
                                                {c?.name || extra.courseName || 'Extra / Unscheduled Class'}
                                            </h3>

                                            {c?.code && (
                                                <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 font-bold text-xs border border-amber-200">
                                                    {c.code}
                                                </span>
                                            )}

                                            {(extra.semesterClass || c?.semester) && (
                                                <span className="text-xs font-semibold text-slate-500">
                                                    · {extra.semesterClass || c?.semester}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {(extra.actualStart || extra.actualEnd) && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                    {extra.actualStart || '--:--'} – {extra.actualEnd || '--:--'}
                                                </span>
                                            )}

                                            {extra.room && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {extra.room}
                                                </span>
                                            )}
                                        </div>

                                        {extra.covered && (
                                            <p className="text-xs font-semibold text-slate-600">
                                                <span className="font-black text-slate-700">Covered:</span> {extra.covered}
                                            </p>
                                        )}

                                        {extra.remarks && (
                                            <p className="text-xs text-slate-500">
                                                <span className="font-bold">Remarks:</span> {extra.remarks}
                                            </p>
                                        )}
                                    </div>

                                    <div className="self-start md:self-center">
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs ring-1 ring-amber-300">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {extra.status || 'Recorded'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL: SUSPEND TODAY'S TEACHING */}
            {isSuspendModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Suspend Today&apos;s Teaching
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Record examinations, institutional programmes, weather-related closures, or other non-instructional days.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSuspendModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Select Reason for Suspension / Closure
                                </label>
                                <select
                                    value={suspensionReason}
                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                                >
                                    <option value="Classes Suspended due to Examination">
                                        Classes Suspended due to Examination
                                    </option>
                                    <option value="Classes Suspended due to College Programme / Function">
                                        Classes Suspended due to College Programme / Function
                                    </option>
                                    <option value="Classes Suspended due to Inclement Weather / Notice">
                                        Classes Suspended due to Inclement Weather / Notice
                                    </option>
                                    <option value="Institutional Non-Instructional Day">
                                        Institutional Non-Instructional Day
                                    </option>
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                                This will mark today&apos;s date as suspended in your progress register and reports without requiring individual period completions.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsSuspendModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRecordNonInstructionalDay(suspensionReason)}
                                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95"
                            >
                                Confirm &amp; Log to Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: QUICK LOG */}
            {activeSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Quick Log: Period {activeSlot.period}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {getCourse(activeSlot.courseId)?.name} ({activeSlot.start} – {activeSlot.end})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveSlot(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveQuickLog} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Planned Syllabus Topic
                                </label>
                                <select
                                    value={selectedTopicId}
                                    onChange={(e) => handleTopicDropdownChange(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50/60 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="">-- Custom / Unplanned Topic --</option>
                                    {getCourseTopics(activeSlot.courseId).map((t: any) => (
                                        <option key={t.id} value={t.id}>
                                            Unit {t.unitNumber || t.unit || 1} — {t.name || t.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-800">
                                        Topic Actually Covered
                                    </label>
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                        Editable for deviations
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={topicCovered}
                                    onChange={(e) => setTopicCovered(e.target.value)}
                                    placeholder="Detail what was taught today"
                                    required
                                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Period Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60 font-semibold"
                                    >
                                        <option value="Taken">Taken</option>
                                        <option value="Compensated">Compensated</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Attendance Count
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        value={attendance}
                                        onChange={(e) => setAttendance(e.target.value)}
                                        placeholder="e.g. 48"
                                        className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Remarks / Deviations (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="e.g. Extended discussion on student doubts"
                                    className="w-full px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setActiveSlot(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95"
                                >
                                    Save to Progress Register
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ACADEMIC DATA & BACKUP HUB */}
            <DataHubModal
                isOpen={isDataHubOpen}
                onClose={() => {
                    setIsDataHubOpen(false);
                    const latest = load();
                    if (latest) setD(latest);
                }}
            />
        </div>
    );
}