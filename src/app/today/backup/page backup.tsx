'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { load, save, type ProfPlanData, type Log } from '@/lib/store';
import DataHubModal from '@/components/DataHubModal';
import OnboardingModal from '@/components/OnboardingModal';

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
    CalendarDays,
    Plus,
    SunMedium,
    ShieldAlert,
    Layers,
    Trash2,
    BarChart3,
    ShieldCheck,
    BookMarked,
    Info,
    Pencil,
    AlertTriangle,
    GraduationCap,
} from 'lucide-react';

type TodayLog = Log & {
    slotId?: string;
    plannedTopicName?: string;
    covered?: string;
    classSource?: string;
    classType?: string;
    type?: string;
    actualStart?: string;
    actualEnd?: string;
    attendance?: number;
    room?: string;
    semester?: string;
    legacyStatus?: string;
};

type TodaySlot = ProfPlanData['slots'][number] & {
    period?: number;
    semesterClass?: string;
};

type TodayHoliday = ProfPlanData['holidays'][number] & {
    type?: string;
};

export default function TodayPage() {
    const [mounted, setMounted] = useState(false);

    const [d, setD] = useState<ProfPlanData>({
        classes: [],
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
    });

    const [activeSlot, setActiveSlot] = useState<TodaySlot | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [isDataHubOpen, setIsDataHubOpen] = useState(false);
    const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Add Class Form State
    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts Stream');
    const [customStreamInput, setCustomStreamInput] = useState('');
    const classNameInputRef = useRef<HTMLInputElement>(null);

    // Inline edit state for existing classes list
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassNameVal, setEditClassNameVal] = useState('');
    const [editClassStreamVal, setEditClassStreamVal] = useState('');
    const editClassInputRef = useRef<HTMLInputElement>(null);

    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState(
        'Classes Suspended due to Examination'
    );

    // Quick Log State
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [topicCovered, setTopicCovered] = useState('');
    const [attendance, setAttendance] = useState('');
    const [status, setStatus] = useState<
        'Taken' | 'Compensated' | 'Cancelled'
    >('Taken');
    const [remarks, setRemarks] = useState('');

    const [currentDate, setCurrentDate] = useState(() => new Date());

    const todayLogs = useMemo(
        () => (d.logs || []) as TodayLog[],
        [d.logs]
    );

    const timeToMinutes = (timeStr?: string): number => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr
            .trim()
            .split(':')
            .map(Number);
        return (
            (Number.isFinite(hours) ? hours : 0) * 60 +
            (Number.isFinite(minutes) ? minutes : 0)
        );
    };

    useEffect(() => {
        setMounted(true);

        try {
            const initialData = load();
            if (initialData) {
                setD(initialData);
            }
        } catch (err) {
            console.error('Failed to load local store data:', err);
            setErrorMessage(
                'Could not load local session data. Please check your storage settings.'
            );
        }

        const refresh = () => {
            try {
                const updated = load();
                if (updated) {
                    setD(updated);
                }
            } catch (err) {
                console.error('Failed to refresh data:', err);
            }
        };

        window.addEventListener('profplan-change', refresh);
        window.addEventListener('storage', refresh);

        const timer = window.setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);

        return () => {
            window.removeEventListener('profplan-change', refresh);
            window.removeEventListener('storage', refresh);
            window.clearInterval(timer);
        };
    }, []);

    const todayDateStr = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [currentDate]);

    const dayNumber = currentDate.getDay();

    const dayName = useMemo(
        () =>
            [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
            ][dayNumber],
        [dayNumber]
    );

    const todayHoliday = useMemo<TodayHoliday | null>(() => {
        if (!Array.isArray(d.holidays)) {
            return null;
        }
        return (
            (d.holidays.find(
                (h) => h.date === todayDateStr
            ) as TodayHoliday) || null
        );
    }, [d.holidays, todayDateStr]);

    const existingSuspensionLog = useMemo<TodayLog | null>(() => {
        return (
            todayLogs.find(
                (l) =>
                    l.date === todayDateStr &&
                    (l.classType === 'Non-Instructional / Suspension' ||
                        l.classSource === 'Institutional Notice')
            ) || null
        );
    }, [todayLogs, todayDateStr]);

    const needsSetup = useMemo(() => {
        return !d.classes || d.classes.length === 0;
    }, [d.classes]);

    const handleProtectedAction = (action: () => void) => {
        if (needsSetup) {
            setShowOnboarding(true);
        } else {
            action();
        }
    };

    const openAddClassModal = () => {
        if (needsSetup) {
            setShowOnboarding(true);
            return;
        }

        setNewClassName('');
        setNewClassStream('Arts Stream');
        setCustomStreamInput('');
        setEditingClassId(null);
        setErrorMessage(null);
        setIsAddClassModalOpen(true);

        window.setTimeout(() => {
            classNameInputRef.current?.focus();
        }, 100);
    };

    const closeAddClassModal = () => {
        setIsAddClassModalOpen(false);
        setNewClassName('');
        setNewClassStream('Arts Stream');
        setCustomStreamInput('');
        setEditingClassId(null);
    };

    const handleSaveNewClass = (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const className = newClassName.trim();
        const resolvedStream =
            newClassStream === 'Other / Custom'
                ? customStreamInput.trim()
                : newClassStream;

        if (!className || !resolvedStream) return;

        const duplicateExists = (d.classes || []).some(
            (c: any) =>
                String(c.name || '').trim().toLowerCase() === className.toLowerCase() &&
                String(c.stream || '').trim().toLowerCase() === resolvedStream.toLowerCase()
        );

        if (duplicateExists) {
            setErrorMessage('This Class / Semester with the same Stream / Faculty is already registered.');
            return;
        }

        try {
            const newClassObj = {
                id:
                    'cls_' +
                    Date.now() +
                    '_' +
                    Math.random().toString(36).slice(2, 7),
                name: className,
                stream: resolvedStream,
            };

            const updatedClasses = [...(d.classes || []), newClassObj];
            const updatedData: ProfPlanData = {
                ...d,
                classes: updatedClasses,
            };

            save(updatedData);
            setD(updatedData);
            setNewClassName('');
            setNewClassStream('Arts Stream');
            setCustomStreamInput('');
            setErrorMessage(null);

            window.setTimeout(() => {
                classNameInputRef.current?.focus();
            }, 50);
        } catch (err) {
            console.error('Failed to save class:', err);
            setErrorMessage('Failed to save class to storage.');
        }
    };

    const handleStartEditClass = (cls: any) => {
        setEditingClassId(cls.id);
        setEditClassNameVal(cls.name || '');
        setEditClassStreamVal(cls.stream || 'Arts Stream');
        window.setTimeout(() => {
            editClassInputRef.current?.focus();
        }, 50);
    };

    const handleSaveEditClass = (clsId: string) => {
        const trimmedName = editClassNameVal.trim();
        const trimmedStream = editClassStreamVal.trim();

        if (!trimmedName || !trimmedStream) {
            alert('Class name and stream cannot be empty.');
            return;
        }

        try {
            const updatedClasses = (d.classes || []).map((c: any) => {
                if (c.id === clsId) {
                    return { ...c, name: trimmedName, stream: trimmedStream };
                }
                return c;
            });

            const updatedData: ProfPlanData = {
                ...d,
                classes: updatedClasses,
            };

            save(updatedData);
            setD(updatedData);
            setEditingClassId(null);
            setErrorMessage(null);
        } catch (err) {
            console.error('Error updating class:', err);
            setErrorMessage('Failed to update class details.');
        }
    };

    const handleDeleteClass = (clsId: string) => {
        if (!window.confirm('Delete this class/semester workspace?')) return;

        try {
            const updatedClasses = (d.classes || []).filter(
                (c) => c.id !== clsId
            );
            const updatedData: ProfPlanData = {
                ...d,
                classes: updatedClasses,
            };

            save(updatedData);
            setD(updatedData);
            setEditingClassId(null);
        } catch (err) {
            console.error('Failed to delete class:', err);
            setErrorMessage('Failed to update storage during deletion.');
        }
    };

    const todaySlots = useMemo<TodaySlot[]>(() => {
        if (!Array.isArray(d.slots)) {
            return [];
        }

        return (d.slots as TodaySlot[])
            .filter((s) => {
                if (
                    s.day === undefined ||
                    s.day === null
                ) {
                    return false;
                }

                const rawDayStr = String(
                    s.day
                )
                    .trim()
                    .toLowerCase();

                const currentDayLower =
                    dayName.toLowerCase();

                if (
                    rawDayStr ===
                    currentDayLower
                ) {
                    return true;
                }

                if (
                    rawDayStr.length >= 3 &&
                    currentDayLower.startsWith(
                        rawDayStr.slice(0, 3)
                    )
                ) {
                    return true;
                }

                return false;
            })
            .sort(
                (a, b) =>
                    timeToMinutes(a.start) -
                    timeToMinutes(b.start)
            );
    }, [d.slots, dayName]);

    const todayExtraClasses = useMemo(
        () =>
            todayLogs
                .filter(
                    (l) =>
                        l.date === todayDateStr &&
                        l.classSource ===
                            'Extra / Unscheduled Class'
                )
                .sort(
                    (a, b) =>
                        timeToMinutes(a.actualStart) -
                        timeToMinutes(b.actualStart)
                ),
        [todayLogs, todayDateStr]
    );

    const doneSlotIds = useMemo(() => {
        return todayLogs
            .filter(
                (l) =>
                    l.date === todayDateStr &&
                    !!l.slotId &&
                    (l.status === 'completed' ||
                        l.status === 'partial' ||
                        l.legacyStatus === 'Taken' ||
                        l.legacyStatus === 'Compensated' ||
                        (l.status as any) === 'Taken' ||
                        (l.status as any) === 'Compensated')
            )
            .map((l) => l.slotId as string);
    }, [todayLogs, todayDateStr]);

    const allCompletedLogsToday = useMemo(
        () =>
            todayLogs.filter(
                (l) =>
                    l.date === todayDateStr &&
                    (l.status === 'completed' ||
                        l.status === 'partial' ||
                        l.legacyStatus === 'Taken' ||
                        l.legacyStatus === 'Compensated' ||
                        (l.status as any) === 'Taken' ||
                        (l.status as any) === 'Compensated')
            ),
        [todayLogs, todayDateStr]
    );

    const totalClassesCompletedCount = allCompletedLogsToday.length;

    const todayDeliveredHours = allCompletedLogsToday
        .reduce(
            (acc, curr) => acc + (Number(curr.hours) || 0),
            0
        )
        .toFixed(2);

    const completionRate =
        todaySlots.length > 0
            ? Math.min(
                  100,
                  Math.round(
                      (doneSlotIds.length / todaySlots.length) * 100
                  )
              )
            : totalClassesCompletedCount > 0
            ? 100
            : 0;

    const getCourse = (id: string) =>
        (d.courses || []).find((c) => c.id === id);

    const getCourseTopics = (courseId: string) =>
        (d.topics || []).filter((t) => t.courseId === courseId);

    const handleRecordNonInstructionalDay = (reasonText: string) => {
        try {
            const fallbackCourse = (d.courses || [])[0];
            const dummyCourseId =
                fallbackCourse?.id || 'general_course_placeholder';

            const logEntry: TodayLog = {
                id: 'log_suspension_' + Date.now(),
                date: todayDateStr,
                courseId: dummyCourseId,
                status: 'cancelled',
                hours: 0,
                remarks: reasonText,
                classType: 'Non-Instructional / Suspension',
            };

            const updatedLogs = todayLogs.filter(
                (l) =>
                    !(
                        l.date === todayDateStr &&
                        (l.remarks === suspensionReason ||
                            l.remarks?.startsWith('Holiday:'))
                    )
            );

            updatedLogs.push(logEntry);

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs,
            };

            save(updatedData);
            setD(updatedData);
            setIsSuspendModalOpen(false);
            setErrorMessage(null);
        } catch (err) {
            console.error('Failed to save suspension:', err);
            setErrorMessage('Failed to save suspension record.');
        }
    };

    const handleRemoveSuspensionLog = () => {
        if (!existingSuspensionLog) return;
        if (
            !window.confirm(
                'Remove this holiday/suspension status from today’s register?'
            )
        ) {
            return;
        }

        try {
            const updatedLogs = todayLogs.filter(
                (l) => l.id !== existingSuspensionLog.id
            );
            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs,
            };

            save(updatedData);
            setD(updatedData);
        } catch (err) {
            console.error('Failed to remove suspension:', err);
            setErrorMessage('Failed to update storage during removal.');
        }
    };

    const handleOpenQuickLog = (slot: TodaySlot) => {
        const courseTopics = getCourseTopics(slot.courseId);
        const defaultTopic = courseTopics[0];

        setActiveSlot(slot);
        setSelectedTopicId(defaultTopic?.id || '');
        setTopicCovered(
            defaultTopic?.name || defaultTopic?.title || ''
        );
        setAttendance('');
        setStatus('Taken');
        setRemarks('');
        setErrorMessage(null);
    };

    const handleTopicDropdownChange = (topicId: string) => {
        setSelectedTopicId(topicId);
        const chosen = (d.topics || []).find((t) => t.id === topicId);
        if (chosen) {
            setTopicCovered(chosen.name || chosen.title || '');
        }
    };

    const handleSaveQuickLog = (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();
        if (!activeSlot) return;

        try {
            const diff =
                timeToMinutes(activeSlot.end) -
                timeToMinutes(activeSlot.start);

            const calculatedHours =
                diff > 0 ? Number((diff / 60).toFixed(2)) : 0.75;

            const plannedTopicObj = (d.topics || []).find(
                (t) => t.id === selectedTopicId
            );

            const typedTopic = topicCovered.trim();
            const resolvedPlannedName =
                plannedTopicObj?.name ||
                plannedTopicObj?.title ||
                (typedTopic ? typedTopic : 'General / Unplanned');

            const resolvedCovered = typedTopic || resolvedPlannedName;

            const canonicalStatus: TodayLog['status'] =
                status === 'Taken'
                    ? 'completed'
                    : status === 'Compensated'
                    ? 'partial'
                    : 'cancelled';

            const newLog: TodayLog = {
                id: 'log_' + Date.now(),
                date: todayDateStr,
                slotId: activeSlot.id,
                courseId: activeSlot.courseId,
                topicId: selectedTopicId || '',
                plannedTopicName: resolvedPlannedName,
                status: canonicalStatus,
                classSource: 'Scheduled Class',
                type: 'Regular Lecture',
                actualStart: activeSlot.start,
                actualEnd: activeSlot.end,
                covered: resolvedCovered,
                hours: calculatedHours,
                attendance: attendance ? Number(attendance) : undefined,
                remarks: remarks.trim(),
                legacyStatus: status,
            };

            const updatedLogs = todayLogs.filter(
                (l) =>
                    !(
                        l.date === todayDateStr &&
                        l.slotId === activeSlot.id
                    )
            );

            updatedLogs.push(newLog);

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs,
            };

            save(updatedData);
            setD(updatedData);
            setActiveSlot(null);
        } catch (err) {
            console.error('Failed to save quick log:', err);
            setErrorMessage('Failed to save progress log.');
        }
    };

    const handleUndoLog = (slotId: string) => {
        if (
            !window.confirm(
                'Re-open this teaching period? The existing progress log will be removed.'
            )
        ) {
            return;
        }

        try {
            const updatedLogs = todayLogs.filter(
                (l) =>
                    !(
                        l.date === todayDateStr &&
                        l.slotId === slotId
                    )
            );

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs,
            };

            save(updatedData);
            setD(updatedData);
        } catch (err) {
            console.error('Failed to undo log:', err);
            setErrorMessage('Failed to update storage during undo action.');
        }
    };

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading Today Dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">

            {showOnboarding && (
                <OnboardingModal
                    onComplete={() => {
                        setShowOnboarding(false);
                        const refreshed = load();
                        if (refreshed) {
                            setD(refreshed);
                        }
                    }}
                />
            )}

            {errorMessage && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center justify-between shadow-sm">
                    <span className="font-bold">{errorMessage}</span>
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
                                alt="Logo"
                                width={56}
                                height={56}
                                className="h-full w-full object-contain rounded-full"
                                priority
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" /> An Initiative by APNSIR FOUNDATION
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white mt-0.5">Today&apos;s Class Schedule</h1>

                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                                {currentDate.toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                                <span className="text-blue-300 mx-1">·</span> Daily Teaching Routine &amp; Progress Register
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsDataHubOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs shadow-md transition"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" /> Backup &amp; Export Hub
                    </button>
                </div>
            </section>

            {/* ACTION BUTTONS */}
            <section className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <button
                        type="button"
                        onClick={openAddClassModal}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><Layers className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100 block">Academic Setup</span>
                                <h2 className="text-sm font-black text-white">Add Classes / Semesters</h2>
                            </div>
                        </div>
                        <Plus className="w-4 h-4 text-blue-200 group-hover:scale-110 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleProtectedAction(() => { window.location.href = '/timetable'; })}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><CalendarDays className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">Routine Setup</span>
                                <h2 className="text-sm font-black text-white">Set Weekly Timetable</h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleProtectedAction(() => { window.location.href = '/syllabus'; })}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><BookMarked className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-100 block">Curriculum</span>
                                <h2 className="text-sm font-black text-white">Syllabus Planner</h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleProtectedAction(() => { window.location.href = '/log'; })}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><PlusCircle className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-100 block">Register Entry</span>
                                <h2 className="text-sm font-black text-white">Record Today&apos;s Class</h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-1 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleProtectedAction(() => { window.location.href = '/holidays'; })}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><SunMedium className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-100 block">Calendar Hub</span>
                                <h2 className="text-sm font-black text-white">Manage Holiday List</h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-200 group-hover:translate-x-1 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleProtectedAction(() => { window.location.href = '/reports'; })}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl"><BarChart3 className="w-5 h-5 text-white" /></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-100 block">Review &amp; Analysis</span>
                                <h2 className="text-sm font-black text-white">View Reports</h2>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition" />
                    </button>
                </div>
            </section>

            {/* METRICS */}
            <section className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today&apos;s Routine</span>
                            <p className="mt-1 text-3xl font-black text-slate-900">{todaySlots.length}</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-2xl"><BookOpen className="w-6 h-6" /></div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Classes Completed</span>
                            <p className="mt-1 text-3xl font-black text-emerald-600">{totalClassesCompletedCount}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 className="w-6 h-6" /></div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily Completion</span>
                            <p className="mt-1 text-3xl font-black text-indigo-600">{completionRate}%</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Percent className="w-6 h-6" /></div>
                    </div>
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
                                    {todayHoliday.type || 'Institutional Holiday'}
                                </span>
                                <h2 className="text-lg font-black text-amber-950">
                                    {todayHoliday.name}
                                </h2>
                            </div>
                            <p className="text-xs font-semibold text-amber-800/90 mt-0.5">
                                {todayHoliday.description || 'Institutional non-instructional day. Standard routine classes are paused.'}
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
                                <Check className="w-4 h-4" /> Holiday Recorded — Undo
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleRecordNonInstructionalDay(`Holiday: ${todayHoliday.name}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                                <CalendarDays className="w-4 h-4" /> Record Holiday in Register
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
                                {existingSuspensionLog.remarks || 'Classes Suspended'}
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
                        <RotateCcw className="w-4 h-4" /> Revert Suspension Status
                    </button>
                </div>
            )}

            {/* TODAY'S SCHEDULE */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Today&apos;s Class Schedule</h2>
                        <p className="text-xs font-medium text-slate-500">Today&apos;s periods in chronological order</p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                        <Link
                            href="/timetable"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-blue-950 hover:bg-blue-900 rounded-xl transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> + Add Period for Today
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
                                {todayHoliday ? `${todayHoliday.name} — No Routine Classes` : 'No Routine Classes Scheduled for Today'}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                You have no timetable periods assigned for this day of the week.
                            </p>
                        </div>
                        <Link
                            href="/timetable"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                            <Plus className="w-4 h-4" /> Set Up Timetable Routine
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaySlots.map((s) => {
                            const c = getCourse(s.courseId);
                            const logEntry = todayLogs.find(
                                (l) => l.date === todayDateStr && l.slotId === s.id
                            );
                            const isDone = !!logEntry || doneSlotIds.includes(s.id);

                            return (
                                <div
                                    key={s.id}
                                    className={`rounded-3xl border p-5 shadow-sm transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                                        isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="space-y-2.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-md font-black text-xs ${isDone ? 'bg-emerald-700 text-white' : 'bg-blue-950 text-white'}`}>
                                                Period {s.period || '—'}
                                            </span>
                                            <h3 className="text-base font-extrabold text-slate-900">{c?.name || 'Unknown Subject'}</h3>
                                            {c?.code && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">{c.code}</span>}
                                            {(s.semesterClass || c?.semester) && <span className="text-xs font-semibold text-slate-500">· {s.semesterClass || c?.semester}</span>}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                <Clock className="w-3.5 h-3.5 text-blue-600" /> {s.start} – {s.end}
                                            </span>
                                            {s.room && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {s.room}
                                                </span>
                                            )}
                                        </div>

                                        {logEntry && (
                                            <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <span className="font-black text-emerald-950">
                                                        ✓ Covered: {logEntry.covered || logEntry.plannedTopicName || 'Completed'}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                                                        Status: {logEntry.legacyStatus || logEntry.status || 'Taken'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium pt-0.5">
                                                    {logEntry.attendance !== undefined && logEntry.attendance !== null && (
                                                        <span>👥 Attendance: <strong>{logEntry.attendance} students</strong></span>
                                                    )}
                                                    {Number(logEntry.hours || 0) > 0 && (
                                                        <span>⏱️ Workload: <strong>{Number(logEntry.hours || 0)} hrs</strong></span>
                                                    )}
                                                </div>

                                                {logEntry.remarks && (
                                                    <p className="text-[11px] text-slate-500 italic pt-0.5">
                                                        Remarks: {logEntry.remarks}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {isDone ? (
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/log?editId=${logEntry?.id || ''}`}
                                                    className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition border border-blue-200 shadow-xs"
                                                >
                                                    Edit Log
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUndoLog(s.id)}
                                                    title="Re-open period"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/log?slotId=${s.id}`}
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                                                >
                                                    Open Register
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenQuickLog(s)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                                                >
                                                    <Check className="w-4 h-4" /> Quick Complete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* EXTRA / UNSCHEDULED CLASSES DISPLAY SECTION */}
            {todayExtraClasses.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h2 className="text-lg font-black text-slate-950">
                            Extra / Unscheduled Classes Today
                        </h2>
                        <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                            {todayExtraClasses.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {todayExtraClasses.map((extra: TodayLog) => {
                            const course = extra.courseId !== 'custom_activity' ? getCourse(extra.courseId) : null;
                            const subjectName = course?.name || (extra as any).customSubjectName || extra.plannedTopicName || 'Extra Teaching Session';

                            return (
                                <div
                                    key={extra.id}
                                    className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                                >
                                    <div className="space-y-2.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-md bg-amber-600 text-white font-black text-xs">
                                                Extra / Unscheduled
                                            </span>
                                            <h3 className="text-base font-extrabold text-slate-900">
                                                {subjectName}
                                            </h3>
                                            {course?.code && (
                                                <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 font-bold text-xs border border-amber-200">
                                                    {course.code}
                                                </span>
                                            )}
                                            {extra.semester && (
                                                <span className="text-xs font-semibold text-slate-500">
                                                    · {extra.semester}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {extra.actualStart && extra.actualEnd && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                    {extra.actualStart} – {extra.actualEnd}
                                                </span>
                                            )}
                                            {extra.room && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {extra.room}
                                                </span>
                                            )}
                                            {Number(extra.hours || 0) > 0 && (
                                                <span className="font-bold text-slate-600">
                                                    ⏱️ {Number(extra.hours)} hrs
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <Link
                                            href={`/log?editId=${extra.id}`}
                                            className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs transition border border-amber-300 shadow-xs"
                                        >
                                            Edit Log
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* MODAL: ADD / EDIT CLASSES & SEMESTERS (RICH ONBOARDING DESIGN MATCH WITH APNSIR BRANDING & BLUE EDIT BUTTONS) */}
            {isAddClassModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md animate-fade-in">
                    <div className="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/40 bg-white shadow-2xl">
                        
                        {/* BRANDED MODAL HEADER */}
                        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 text-white">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                            <div className="relative flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur-sm shadow-inner">
                                        <Image
                                            src="/apnsir-logo.png"
                                            alt="APNSIR Foundation"
                                            width={36}
                                            height={36}
                                            className="max-h-full max-w-full object-contain"
                                            priority
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                                                OdishaTeachers.com
                                            </span>
                                            <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                                                APNSIR
                                            </span>
                                        </div>
                                        <p className="truncate text-sm font-extrabold text-white">
                                            ProfPlan &bull; Academic Workspace Manager
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeAddClassModal}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* MODAL BODY CONTENT */}
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7 space-y-6">
                            
                            {/* TITLE & INTRO CARD */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                                        Class Management
                                    </p>
                                    <h2 className="mt-1 text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900">
                                        Configure Your Classes &amp; Semesters
                                    </h2>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                        Add all your active academic groups. Once configured, you can easily attach subjects, plan your syllabus, and map your timetable.
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                            </div>

                            {/* ADD NEW CLASS FORM */}
                            <form onSubmit={handleSaveNewClass} className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 sm:p-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                                    <Plus className="w-3.5 h-3.5 text-indigo-600" /> Add New Academic Group
                                </h3>

                                <div>
                                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Class / Semester Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        ref={classNameInputRef}
                                        type="text"
                                        placeholder="e.g. BA 1st Semester, +2 1st Year Arts, Class XI"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        required
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Stream / Faculty / Branch <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={newClassStream}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewClassStream(value);
                                            if (value !== 'Other / Custom') {
                                                setCustomStreamInput('');
                                            }
                                        }}
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                                    >
                                        <option value="Arts Stream">Arts Stream</option>
                                        <option value="Science Stream">Science Stream</option>
                                        <option value="Commerce Stream">Commerce Stream</option>
                                        <option value="Vocational">Vocational</option>
                                        <option value="General / Academic">General / Academic</option>
                                        <option value="Other / Custom">Other / Custom</option>
                                    </select>

                                    {newClassStream === 'Other / Custom' && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                value={customStreamInput}
                                                onChange={(e) => setCustomStreamInput(e.target.value)}
                                                placeholder="Enter Custom Stream"
                                                required
                                                autoFocus
                                                className="w-full rounded-xl border-2 border-indigo-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-[0.99]"
                                >
                                    <Plus className="w-4 h-4" />
                                    Save &amp; Register Class
                                </button>
                            </form>

                            {/* ALREADY REGISTERED CLASSES LIST (WITH BLUE EDIT BUTTONS & DELETE) */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Already Registered Academic Groups ({d.classes?.length || 0})
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        Editable
                                    </span>
                                </div>

                                {(!d.classes || d.classes.length === 0) ? (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                                        No classes registered yet. Use the form above to add your first class.
                                    </div>
                                ) : (
                                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                                        {d.classes.map((cls: any, index: number) => {
                                            const isEditing = editingClassId === cls.id;

                                            return (
                                                <div
                                                    key={cls.id}
                                                    className={`rounded-2xl border p-3.5 transition flex items-center justify-between gap-3 ${
                                                        isEditing
                                                            ? 'bg-indigo-50/90 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                            : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200'
                                                    }`}
                                                >
                                                    {isEditing ? (
                                                        /* EDIT MODE */
                                                        <div className="space-y-2 w-full">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <input
                                                                    ref={editClassInputRef}
                                                                    type="text"
                                                                    value={editClassNameVal}
                                                                    onChange={(e) => setEditClassNameVal(e.target.value)}
                                                                    placeholder="Class Name"
                                                                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={editClassStreamVal}
                                                                    onChange={(e) => setEditClassStreamVal(e.target.value)}
                                                                    placeholder="Stream / Branch"
                                                                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-2 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingClassId(null)}
                                                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-lg transition"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEditClass(cls.id)}
                                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-lg shadow transition"
                                                                >
                                                                    Save Changes
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* VIEW MODE */
                                                        <>
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 text-xs font-black">
                                                                    {index + 1}
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                                                        {cls.name}
                                                                    </p>
                                                                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                                                                        {cls.stream || 'General'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {/* BLUE EDIT BUTTON matching Onboarding Modal design */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartEditClass(cls)}
                                                                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] tracking-wide uppercase shadow-sm transition"
                                                                    title="Edit Class Name"
                                                                >
                                                                    Edit
                                                                </button>

                                                                {/* DELETE BUTTON */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteClass(cls.id)}
                                                                    className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                                                    title="Delete Class"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* MODAL FOOTER */}
                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                {d.classes?.length || 0} class{(d.classes?.length || 0) === 1 ? '' : 'es'} configured.
                            </span>
                            <button
                                type="button"
                                onClick={closeAddClassModal}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition"
                            >
                                Done / Close
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
                                        onChange={(e) => setStatus(e.target.value as any)}
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

            <DataHubModal isOpen={isDataHubOpen} onClose={() => setIsDataHubOpen(false)} />
        </div>
    );
}