'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { load, save, ProfPlanData } from '@/lib/store';
import PageGuide from '@/components/PageGuide';
import {
    Calendar,
    Clock,
    BookOpen,
    Layers,
    Users,
    FileEdit,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Sparkles,
    Check,
    Zap,
    Home,
    Plus,
    X,
    Info,
    HelpCircle
} from 'lucide-react';

/* =========================================================
   12-HOUR TIME HELPERS
   ========================================================= */

function normalizeTime(value: string | undefined, fallback = '09:00') {
    if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
        return fallback;
    }

    const [h, m] = value.split(':').map(Number);

    if (
        Number.isNaN(h) ||
        Number.isNaN(m) ||
        h < 0 ||
        h > 23 ||
        m < 0 ||
        m > 59
    ) {
        return fallback;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12Hour(value: string | undefined) {
    if (!value) {
        return '';
    }

    const normalized = normalizeTime(value);
    const [hour24, minute] = normalized.split(':').map(Number);

    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function timeToMinutes(value: string | undefined) {
    if (!value) {
        return 0;
    }

    const normalized = normalizeTime(value);
    const [hours, minutes] = normalized.split(':').map(Number);

    return hours * 60 + minutes;
}

function calculateDurationHours(
    start: string | undefined,
    end: string | undefined
) {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    const difference = endMinutes - startMinutes;

    return difference > 0
        ? Number((difference / 60).toFixed(2))
        : 0;
}

/* =========================================================
   12-HOUR TIME SELECTOR (BULLETPROOF TEXT VISIBILITY FIX)
   ========================================================= */

function Time12Input({
    value,
    onChange,
    required = false,
}: {
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    const normalized = normalizeTime(value);

    const [hour24, minuteValue] = normalized
        .split(':')
        .map(Number);

    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    const updateTime = (
        nextHour12: number,
        nextMinute: number,
        nextPeriod: 'AM' | 'PM'
    ) => {
        let hour = nextHour12 % 12;

        if (nextPeriod === 'PM') {
            hour += 12;
        }

        onChange(
            `${String(hour).padStart(2, '0')}:${String(
                nextMinute
            ).padStart(2, '0')}`
        );
    };

    return (
        <div className="flex items-center justify-between rounded-xl border-2 border-indigo-200/90 bg-white px-2.5 py-2 shadow-xs focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100 transition">
            <select
                value={hour12}
                required={required}
                onChange={(e) =>
                    updateTime(
                        Number(e.target.value),
                        minuteValue,
                        period
                    )
                }
                className="w-14 px-1 py-1 text-sm font-black text-slate-900 bg-white outline-none cursor-pointer text-center"
                aria-label="Hour"
            >
                {Array.from({ length: 12 }, (_, index) => {
                    const hour = index + 1;
                    return (
                        <option key={hour} value={hour} className="font-bold text-slate-900 bg-white">
                            {hour}
                        </option>
                    );
                })}
            </select>

            <span className="text-sm font-black text-slate-400 select-none px-0.5">:</span>

            <select
                value={minuteValue}
                required={required}
                onChange={(e) =>
                    updateTime(
                        hour12,
                        Number(e.target.value),
                        period
                    )
                }
                className="w-14 px-1 py-1 text-sm font-black text-slate-900 bg-white outline-none cursor-pointer text-center"
                aria-label="Minute"
            >
                {Array.from({ length: 60 }, (_, minute) => (
                    <option key={minute} value={minute} className="font-bold text-slate-900 bg-white">
                        {String(minute).padStart(2, '0')}
                    </option>
                ))}
            </select>

            <select
                value={period}
                required={required}
                onChange={(e) =>
                    updateTime(
                        hour12,
                        minuteValue,
                        e.target.value as 'AM' | 'PM'
                    )
                }
                className="w-16 px-1.5 py-1 text-sm font-black text-slate-900 bg-white outline-none cursor-pointer text-center"
                aria-label="AM or PM"
            >
                <option value="AM" className="font-bold text-slate-900 bg-white">AM</option>
                <option value="PM" className="font-bold text-slate-900 bg-white">PM</option>
            </select>
        </div>
    );
}

function LogFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const editId = searchParams.get('editId');
    const urlSlotId = searchParams.get('slotId');

    const [mounted, setMounted] = useState(false);

    // Toggleable Quick Guide State
    const [showGuide, setShowGuide] = useState(false);

    // Inline Validation Banner State
    const [validationError, setValidationError] = useState<string | null>(null);

    // References for scrolling & focusing empty fields on mobile
    const dateRef = useRef<HTMLInputElement>(null);
    const slotSelectRef = useRef<HTMLSelectElement>(null);
    const courseSelectRef = useRef<HTMLSelectElement>(null);
    const customSubjectRef = useRef<HTMLInputElement>(null);
    const customSemesterRef = useRef<HTMLSelectElement>(null);
    const coveredRef = useRef<HTMLInputElement>(null);
    const roomRef = useRef<HTMLInputElement>(null);

    const [d, setD] = useState<ProfPlanData>({
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
        classes: []
    });

    const [savedNotice, setSavedNotice] = useState(false);
    const [isCustomSubjectMode, setIsCustomSubjectMode] = useState(false);
    const [customSubjectName, setCustomSubjectName] = useState('');
    const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts Stream');

    const [form, setForm] = useState<any>({
        date: new Date().toLocaleDateString('en-CA'),
        status: 'Taken',
        classSource: 'Scheduled Class',
        type: 'Regular Lecture',
        hours: 0.75,
        room: '',
        actualStart: '09:00',
        actualEnd: '09:45',
        courseId: '',
        slotId: '',
        topicId: '',
        covered: '',
        remarks: '',
        attendance: '',
        semester: '',
    });

    useEffect(() => {
        setMounted(true);
        const store: any = load();
        if (store) {
            setD(store);
        }

        if (editId && store?.logs) {
            const existing: any = store.logs.find((l: any) => l.id === editId);
            if (existing) {
                const courseExists = store.courses?.some((c: any) => c.id === existing.courseId);
                const isCustom = existing.courseId === 'custom_activity' || !courseExists;

                if (isCustom) {
                    setIsCustomSubjectMode(true);
                    setCustomSubjectName(
                        existing.customSubjectName ||
                        existing.plannedTopicName ||
                        'Extra Activity'
                    );
                }

                setForm({
                    date: existing.date || new Date().toLocaleDateString('en-CA'),
                    status: existing.status || 'Taken',
                    classSource: existing.slotId ? 'Scheduled Class' : 'Extra / Unscheduled Class',
                    type: existing.classType || existing.type || 'Regular Lecture',
                    hours: existing.hours ?? 0.75,
                    room: existing.room || '',
                    actualStart: normalizeTime(existing.actualStart, '09:00'),
                    actualEnd: normalizeTime(existing.actualEnd, '09:45'),
                    courseId: isCustom ? 'custom_activity' : existing.courseId || '',
                    slotId: existing.slotId || '',
                    topicId: existing.topicId || '',
                    covered: existing.covered || '',
                    remarks: existing.remarks || '',
                    attendance: existing.attendance !== undefined && existing.attendance !== null ? String(existing.attendance) : '',
                    semester: existing.semester || '',
                });
                return;
            }
        }

        if (urlSlotId && store?.slots) {
            const slot: any = store.slots.find((s: any) => s.id === urlSlotId);
            if (slot) {
                const course: any = store.courses?.find((c: any) => c.id === slot.courseId);
                const firstTopic: any = store.topics?.find((t: any) => t.courseId === slot.courseId);
                const actualStart = normalizeTime(slot.start, '09:00');
                const actualEnd = normalizeTime(slot.end, '09:45');
                const duration = calculateDurationHours(actualStart, actualEnd);

                setForm((prev: any) => ({
                    ...prev,
                    classSource: 'Scheduled Class',
                    slotId: slot.id,
                    courseId: slot.courseId,
                    room: slot.room || '',
                    actualStart,
                    actualEnd,
                    topicId: firstTopic?.id || '',
                    covered: firstTopic?.name || '',
                    hours: duration > 0 ? duration : 0.75,
                    semester: course?.semester || slot.semesterClass || '',
                }));
            }
        }
    }, [editId, urlSlotId]);

    const activeClasses = useMemo(() => {
        return Array.isArray(d?.classes) ? d.classes : [];
    }, [d.classes]);

    const activeCourses = useMemo(() => {
        if (!Array.isArray(d?.courses)) return [];
        if (!Array.isArray(d?.classes) || d.classes.length === 0) return d.courses;

        const activeClassIds = new Set(d.classes.map((cls: any) => cls.id));
        const activeClassNames = new Set(d.classes.map((cls: any) => String(cls.name || '').trim().toLowerCase()));

        const filtered = d.courses.filter((course: any) => {
            if (course.classId && activeClassIds.has(course.classId)) return true;
            if (course.semester && activeClassNames.has(String(course.semester).trim().toLowerCase())) return true;
            if (!course.classId && !course.semester) return true;
            return false;
        });

        return filtered.length > 0 ? filtered : d.courses;
    }, [d.courses, d.classes]);

    const selectedCourse = useMemo(() => {
        if (!form.courseId) return null;
        return activeCourses.find((c: any) => c.id === form.courseId) || null;
    }, [activeCourses, form.courseId]);

    const selectedDate = useMemo(() => {
        if (!form.date) return new Date();
        return new Date(`${form.date}T00:00:00`);
    }, [form.date]);

    const dayNumber = selectedDate.getDay();
    const dayName = selectedDate.toLocaleDateString('en-IN', { weekday: 'long' });

    const scheduledSlots = useMemo(() => {
        if (!Array.isArray(d?.slots)) return [];

        const activeCourseIds = new Set(activeCourses.map((course: any) => course.id));

        return d.slots
            .filter((slot: any) => {
                const slotDayRaw = String(slot.day ?? '').trim().toLowerCase();
                const currentDayNum = dayNumber;
                const currentDayName = dayName.toLowerCase();

                const matchesDay =
                    slotDayRaw === currentDayName ||
                    slotDayRaw === String(currentDayNum) ||
                    (currentDayNum === 6 && slotDayRaw.startsWith('sat')) ||
                    (currentDayNum === 1 && slotDayRaw.startsWith('mon')) ||
                    (currentDayNum === 2 && slotDayRaw.startsWith('tue')) ||
                    (currentDayNum === 3 && slotDayRaw.startsWith('wed')) ||
                    (currentDayNum === 4 && slotDayRaw.startsWith('thu')) ||
                    (currentDayNum === 5 && slotDayRaw.startsWith('fri')) ||
                    (currentDayNum === 0 && slotDayRaw.startsWith('sun'));

                const matchesCourse =
                    activeCourseIds.size === 0 ||
                    activeCourseIds.has(slot.courseId);

                return matchesDay && matchesCourse;
            })
            .sort((a: any, b: any) => Number(a.period || 1) - Number(b.period || 1));
    }, [d.slots, dayNumber, dayName, activeCourses]);

    const topics = useMemo(() => {
        if (!Array.isArray(d?.topics) || !form.courseId) return [];
        return d.topics.filter((t: any) => t.courseId === form.courseId);
    }, [d.topics, form.courseId]);

    const calculatedHours = useMemo(() => {
        return calculateDurationHours(form.actualStart, form.actualEnd);
    }, [form.actualStart, form.actualEnd]);

    function updateForm(field: string, value: any) {
        setValidationError(null); // Clear error message when user starts typing/selecting
        setForm((prev: any) => {
            const updated = { ...prev, [field]: value };
            if (field === 'actualStart' || field === 'actualEnd') {
                const nextStart = field === 'actualStart' ? value : prev.actualStart;
                const nextEnd = field === 'actualEnd' ? value : prev.actualEnd;
                const hours = calculateDurationHours(nextStart, nextEnd);
                updated.hours = hours > 0 ? hours : 0;
            }
            return updated;
        });
    }

    function handleApplyPreset(classType: string, defaultRemarks: string) {
        setIsCustomSubjectMode(true);
        setValidationError(null);
        setForm((prev: any) => ({
            ...prev,
            classSource: 'Extra / Unscheduled Class',
            type: classType,
            slotId: '',
            courseId: 'custom_activity',
            remarks: defaultRemarks
        }));
    }

    function selectScheduledSlot(slotId: string) {
        if (!d?.slots) return;
        const slot = d.slots.find((s: any) => s.id === slotId);
        if (!slot) return;

        const course = activeCourses.find((c: any) => c.id === slot.courseId);
        const firstTopic = d.topics?.find((t: any) => t.courseId === slot.courseId);
        const actualStart = normalizeTime(slot.start, '09:00');
        const actualEnd = normalizeTime(slot.end, '09:45');
        const hours = calculateDurationHours(actualStart, actualEnd);

        setValidationError(null);
        setIsCustomSubjectMode(false);
        setForm((prev: any) => ({
            ...prev,
            slotId: slot.id,
            courseId: slot.courseId,
            room: slot.room || '',
            actualStart,
            actualEnd,
            topicId: firstTopic?.id || '',
            covered: firstTopic?.name || '',
            hours: hours > 0 ? hours : 0.75,
            semester: course?.semester || (slot as any).semesterClass || ''
        }));
    }

    function changeDate(newDate: string) {
        setValidationError(null);
        setForm((prev: any) => ({ ...prev, date: newDate, slotId: '' }));
    }

    const handleSaveNewClass = (e: React.FormEvent) => {
        e.preventDefault();
        const className = newClassName.trim();
        const stream = newClassStream.trim();
        if (!className || !stream) return;

        const newClassObj = {
            id: 'cls_' + Date.now().toString(),
            name: className,
            stream: stream
        };

        const updatedClasses = [...(d.classes || []), newClassObj];
        const updatedData = { ...d, classes: updatedClasses };

        save(updatedData);
        setD(updatedData);

        setForm((prev: any) => ({ ...prev, semester: newClassObj.name }));
        setNewClassName('');
        setNewClassStream('Arts Stream');
        setIsAddClassModalOpen(false);
    };

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!d) return;

        // Validation Checks with Mobile Focus & Scroll Guidance
        if (!form.date) {
            setValidationError('Please select the date of the class.');
            dateRef.current?.focus();
            dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (form.classSource === 'Scheduled Class' && !form.slotId) {
            setValidationError('Please select the scheduled routine period.');
            slotSelectRef.current?.focus();
            slotSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!isCustomSubjectMode && !form.courseId) {
            setValidationError('Please select a Course / Subject.');
            courseSelectRef.current?.focus();
            courseSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (isCustomSubjectMode && !customSubjectName.trim()) {
            setValidationError('Please enter a Custom Subject or Activity Name.');
            customSubjectRef.current?.focus();
            customSubjectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (isCustomSubjectMode && !form.semester) {
            setValidationError('Please select target Class / Semester / Batch.');
            customSemesterRef.current?.focus();
            customSemesterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!form.covered.trim()) {
            setValidationError('Please enter the Topic or Activity Actually Covered.');
            coveredRef.current?.focus();
            coveredRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!form.room.trim()) {
            setValidationError('Please enter the Room / Lecture Hall.');
            roomRef.current?.focus();
            roomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (calculatedHours <= 0) {
            setValidationError('Actual End Time must be later than Actual Start Time.');
            return;
        }

        setValidationError(null);
        const plannedTopicObj = d.topics?.find((t: any) => t.id === form.topicId);

        const newLog = {
            ...form,
            id: editId || 'log_' + Date.now(),
            courseId: isCustomSubjectMode ? 'custom_activity' : form.courseId,
            customSubjectName: isCustomSubjectMode ? customSubjectName.trim() : null,
            plannedTopicName: isCustomSubjectMode ? customSubjectName.trim() : (plannedTopicObj?.name || 'Unplanned / General'),
            hours: calculatedHours,
            attendance: form.attendance !== '' ? Number(form.attendance) : null,
            covered: form.covered.trim() || plannedTopicObj?.name || customSubjectName.trim() || 'Activity delivered',
            remarks: form.remarks.trim(),
            actualStart: normalizeTime(form.actualStart, '09:00'),
            actualEnd: normalizeTime(form.actualEnd, '09:45')
        };

        let updatedLogs = [...(d.logs || [])];
        if (editId) {
            updatedLogs = updatedLogs.map((l: any) => (l.id === editId ? newLog : l));
        } else {
            if (form.slotId) {
                updatedLogs = updatedLogs.filter((l: any) => !(l.date === form.date && l.slotId === form.slotId));
            }
            updatedLogs.push(newLog);
        }

        const updatedData = { ...d, logs: updatedLogs };
        save(updatedData);
        setSavedNotice(true);

        setTimeout(() => {
            router.push('/reports');
        }, 500);
    }

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading Adaptive Class Register...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 max-w-4xl mx-auto px-4 sm:px-6">

            {/* NAVIGATION BAR */}
            <div className="flex items-center justify-between pt-4 flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition cursor-pointer"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                    <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 tracking-tight">
                            Cancel &amp; Return
                        </span>
                    </div>
                </button>

                <Link
                    href="/today"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs shadow-md transition"
                >
                    <Home className="w-4 h-4" />
                    Go to Today Page
                </Link>
            </div>

            {/* UNIFIED HERO HEADER */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

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
                                {editId ? 'Modify Teaching Log' : 'Adaptive Class Register'}
                            </h1>

                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                                Record actual classroom engagement, syllabus topics delivered, and attendance count for audit compliance.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE VALIDATION WARNING BANNER FOR MOBILE */}
            {validationError && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 shadow-lg flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-950">
                            Required Field Missing
                        </h4>
                        <p className="text-xs font-bold text-rose-800 mt-0.5">
                            {validationError}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setValidationError(null)}
                        className="text-rose-600 hover:text-rose-900 p-1 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* TOGGLEABLE QUICK GUIDE SECTION */}
            <div className="print:hidden space-y-2">
                <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-extrabold text-blue-900 shadow-sm transition cursor-pointer"
                >
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>{showGuide ? 'Hide Quick Guide & Instructions' : '📖 Show Quick Guide & Instructions'}</span>
                </button>

                {showGuide && (
                    <div className="animate-in fade-in duration-200">
                        <PageGuide
                            guideKey="progress_log"
                            title="Adaptive Class Register: Quick Guide"
                            summary="Log completed teaching engagements, topic coverage, duration, and student attendance for official college records."
                            steps={[
                                {
                                    step: '1. Choose Mode & Period',
                                    desc: 'Select "Regular Routine Class" to link a timetable period, or "Click to Register Special/Extra/Remedial Class" for extra lectures.'
                                },
                                {
                                    step: '2. Record Topics & Duration',
                                    desc: 'Confirm the syllabus topic covered, verify lecture start/end clock times, and enter student attendance.'
                                },
                                {
                                    step: '3. Save to Academic Register',
                                    desc: 'Click "Save to Progress Register" to update compliance reports and syllabus delivery statistics.'
                                }
                            ]}
                        />
                    </div>
                )}
            </div>

            {/* FORM BODY */}
            <form onSubmit={submit} className="space-y-6" noValidate>

                {/* 1. DATE & SCHEDULE CARD */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Class Date &amp; Schedule Mode
                            </h2>
                        </div>

                        {/* QUICK PRESET CHIPS */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Presets:
                            </span>

                            <button
                                type="button"
                                onClick={() => handleApplyPreset('Extra Class', 'Conducted extra lecture for syllabus pacing')}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-extrabold transition shadow-xs cursor-pointer"
                            >
                                + Extra Class
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyPreset('Remedial Class', 'Remedial session for student doubt clearance')}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-extrabold transition shadow-xs cursor-pointer"
                            >
                                + Remedial
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyPreset('Substitute Class', 'Covered substitute period on departmental request')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold transition shadow-xs cursor-pointer"
                            >
                                + Substitution
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Date of Class <span className="text-rose-500">*</span>
                            </label>
                            <input
                                ref={dateRef}
                                type="date"
                                value={form.date}
                                onChange={(e) => changeDate(e.target.value)}
                                required
                                className="w-full px-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Day of Week
                            </label>
                            <div className="flex items-center justify-between px-4 py-3 text-sm font-black text-blue-950 rounded-xl border-2 border-blue-100 bg-blue-50/70">
                                <span>{dayName}</span>
                                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                                    Auto-calculated
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SCHEDULE MODE SELECTOR */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-2">
                            Engagement Category <span className="text-rose-500">*</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomSubjectMode(false);
                                    updateForm('classSource', 'Scheduled Class');
                                }}
                                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black border-2 transition transform active:scale-95 cursor-pointer ${
                                    form.classSource === 'Scheduled Class'
                                        ? 'border-blue-900 bg-gradient-to-r from-blue-950 to-blue-900 text-white shadow-md ring-4 ring-blue-500/20'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Clock className="w-4 h-4" />
                                Regular Routine Class
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomSubjectMode(true);
                                    setForm((prev: any) => ({
                                        ...prev,
                                        classSource: 'Extra / Unscheduled Class',
                                        slotId: '',
                                        courseId: 'custom_activity'
                                    }));
                                }}
                                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black border-2 transition transform active:scale-95 shadow-md cursor-pointer ${
                                    form.classSource === 'Extra / Unscheduled Class'
                                        ? 'border-purple-600 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-700 text-white ring-4 ring-purple-300 scale-[1.01]'
                                        : 'border-purple-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-purple-900 hover:from-violet-100 hover:to-fuchsia-100 ring-1 ring-purple-200'
                                }`}
                            >
                                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                Click to Register Special/Extra/Remedial Class
                            </button>
                        </div>
                    </div>

                    {/* SCHEDULED PERIOD SELECTOR */}
                    {form.classSource === 'Scheduled Class' && (
                        <div className="pt-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Select Routine Period ({dayName}) <span className="text-rose-500">*</span>
                            </label>

                            {scheduledSlots.length === 0 ? (
                                <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 text-xs text-amber-800 flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                                    <span>
                                        No routine periods found for {dayName}. Switch to <strong>Click to Register Special/Extra/Remedial Class</strong> to record freely, or ensure your weekly timetable is set up.
                                    </span>
                                </div>
                            ) : (
                                <select
                                    ref={slotSelectRef}
                                    value={form.slotId}
                                    onChange={(e) => selectScheduledSlot(e.target.value)}
                                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border-2 border-indigo-200/80 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition cursor-pointer"
                                >
                                    <option value="" className="text-slate-500 bg-white">
                                        -- Choose Routine Period --
                                    </option>

                                    {scheduledSlots.map((slot: any) => {
                                        const c = activeCourses.find(
                                            (course: any) => course.id === slot.courseId
                                        );

                                        return (
                                            <option key={slot.id} value={slot.id} className="text-slate-900 font-bold bg-white">
                                                Period {slot.period} ({formatTime12Hour(slot.start)} – {formatTime12Hour(slot.end)}) — {c?.name || 'Subject'} — {slot.room || 'General'}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. SUBJECT & TOPIC CARD */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Subject &amp; Teaching Details
                            </h2>
                        </div>

                        {form.classSource === 'Extra / Unscheduled Class' && (
                            <button
                                type="button"
                                onClick={() => setIsCustomSubjectMode(!isCustomSubjectMode)}
                                className="text-xs font-black text-purple-700 hover:underline bg-purple-50 px-3.5 py-1.5 rounded-xl border-2 border-purple-200 transition cursor-pointer"
                            >
                                {isCustomSubjectMode ? '← Switch to Registered Subjects' : '+ Enter Free-text Activity / Subject'}
                            </button>
                        )}
                    </div>

                    {isCustomSubjectMode ? (
                        <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-purple-50/50 via-indigo-50/30 to-purple-50/50 border-2 border-purple-200/60 shadow-sm">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                    Custom Subject / Activity Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    ref={customSubjectRef}
                                    type="text"
                                    value={customSubjectName}
                                    onChange={(e) => setCustomSubjectName(e.target.value)}
                                    placeholder="e.g. Yoga & Wellness / NSS Camp / Dept Meeting / Seminar"
                                    required={isCustomSubjectMode}
                                    className="w-full px-4 py-3 text-sm font-bold text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 shadow-sm transition"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Class / Semester / Batch <span className="text-rose-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddClassModalOpen(true)}
                                        className="text-xs font-extrabold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 transition cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        + Add New Class Workspace
                                    </button>
                                </div>

                                <select
                                    ref={customSemesterRef}
                                    value={form.semester}
                                    onChange={(e) => updateForm('semester', e.target.value)}
                                    required={isCustomSubjectMode}
                                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border-2 border-indigo-200/80 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition cursor-pointer"
                                >
                                    <option value="" className="text-slate-500 bg-white">
                                        -- Select Target Class / Semester --
                                    </option>
                                    {activeClasses.map((cls: any) => (
                                        <option key={cls.id} value={cls.name} className="text-slate-900 font-bold bg-white">
                                            {cls.name} ({cls.stream || 'General'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                    Course / Paper <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    ref={courseSelectRef}
                                    value={form.courseId}
                                    onChange={(e) => {
                                        const cId = e.target.value;
                                        const c = activeCourses.find((x: any) => x.id === cId);

                                        setForm((prev: any) => ({
                                            ...prev,
                                            courseId: cId,
                                            topicId: '',
                                            covered: '',
                                            semester: c?.semester || ''
                                        }));
                                    }}
                                    required={!isCustomSubjectMode}
                                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border-2 border-indigo-200/80 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition cursor-pointer"
                                >
                                    <option value="" className="text-slate-500 bg-white">
                                        -- Select Subject / Paper --
                                    </option>
                                    {activeCourses.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-slate-900 font-bold bg-white">
                                            {c.name} ({c.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                    Semester / Section
                                </label>
                                <input
                                    type="text"
                                    value={form.semester || selectedCourse?.semester || ''}
                                    onChange={(e) => updateForm('semester', e.target.value)}
                                    placeholder="e.g. 1st Semester · Arts"
                                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                                />
                            </div>
                        </div>
                    )}

                    {!isCustomSubjectMode && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Planned Syllabus Topic
                            </label>
                            <select
                                value={form.topicId}
                                onChange={(e) => {
                                    const tId = e.target.value;
                                    const selectedTopic = topics.find((t: any) => t.id === tId);

                                    setForm((prev: any) => ({
                                        ...prev,
                                        topicId: tId,
                                        covered: selectedTopic?.name || prev.covered
                                    }));
                                }}
                                className="w-full px-4 py-3 text-sm font-semibold rounded-xl border-2 border-indigo-200/80 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition cursor-pointer"
                            >
                                <option value="" className="text-slate-500 bg-white">
                                    -- Custom / Unplanned Topic --
                                </option>
                                {topics.map((t: any) => (
                                    <option key={t.id} value={t.id} className="text-slate-900 font-bold bg-white">
                                        Unit {t.unitNumber || t.unit || 1} — {t.name} ({t.suggestedClasses || 2} suggested periods)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                Topic / Activity Actually Covered <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                                Editable for deviations
                            </span>
                        </div>
                        <input
                            ref={coveredRef}
                            type="text"
                            value={form.covered}
                            onChange={(e) => updateForm('covered', e.target.value)}
                            placeholder="Detail what was taught or conducted today..."
                            required
                            className="w-full px-4 py-3 text-sm font-bold text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 shadow-sm transition"
                        />
                    </div>
                </div>

                {/* 3. STATUS, TIME & ATTENDANCE CARD */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Class Delivery, Timing &amp; Attendance
                        </h2>
                    </div>

                    {/* STATUS SELECTOR BUTTONS */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-2">
                            Class Delivery Status <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                            {[
                                'Taken',
                                'Compensated',
                                'Postponed',
                                'Cancelled',
                                'Leave',
                                'Mass Bunk'
                            ].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => updateForm('status', st)}
                                    className={`py-3 px-2 rounded-xl text-xs font-black border-2 transition transform active:scale-95 shadow-sm cursor-pointer ${
                                        form.status === st
                                            ? st === 'Taken'
                                                ? 'bg-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-300/40'
                                                : st === 'Compensated'
                                                ? 'bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-300/40'
                                                : 'bg-rose-600 text-white border-rose-700 ring-4 ring-rose-300/40'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Class Type
                            </label>
                            <select
                                value={form.type}
                                onChange={(e) => updateForm('type', e.target.value)}
                                className="w-full px-3.5 py-3 text-sm font-black text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition cursor-pointer"
                            >
                                <option value="Regular Lecture" className="text-slate-900 font-bold bg-white">Theory Lecture</option>
                                <option value="Practical/Lab" className="text-slate-900 font-bold bg-white">Practical / Lab</option>
                                <option value="Tutorial" className="text-slate-900 font-bold bg-white">Tutorial / Doubt Class</option>
                                <option value="Remedial Class" className="text-slate-900 font-bold bg-white">Remedial Class</option>
                                <option value="Revision" className="text-slate-900 font-bold bg-white">Revision Lecture</option>
                                <option value="Activity / Other" className="text-slate-900 font-bold bg-white">Activity / Special Session</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Room / Hall <span className="text-rose-500">*</span>
                            </label>
                            <input
                                ref={roomRef}
                                type="text"
                                value={form.room}
                                onChange={(e) => updateForm('room', e.target.value)}
                                placeholder="e.g. Room 12"
                                required
                                className="w-full px-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                            />
                        </div>

                        {/* START TIME */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Start Clock Time <span className="text-rose-500">*</span>
                            </label>
                            <Time12Input
                                value={form.actualStart}
                                onChange={(value) => updateForm('actualStart', value)}
                                required
                            />
                        </div>

                        {/* END TIME */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                End Clock Time <span className="text-rose-500">*</span>
                            </label>
                            <Time12Input
                                value={form.actualEnd}
                                onChange={(value) => updateForm('actualEnd', value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Total Workload Credit (Hours)
                            </label>
                            <div className="flex items-center justify-between px-4 py-3 text-sm font-black text-blue-950 rounded-xl border-2 border-blue-100 bg-blue-50/70 shadow-xs">
                                <span>
                                    {calculatedHours > 0 ? `${calculatedHours.toFixed(2)} hrs` : '0.00 hrs'}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                                    Auto-calculated
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                Student Attendance (Count)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="200"
                                value={form.attendance}
                                onChange={(e) => updateForm('attendance', e.target.value)}
                                placeholder="e.g. 48"
                                className="w-full px-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5 flex items-center gap-1.5">
                            <FileEdit className="w-3.5 h-3.5 text-slate-400" />
                            Deviations / Departmental Remarks (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={form.remarks}
                            onChange={(e) => updateForm('remarks', e.target.value)}
                            placeholder="Record reasons for syllabus deviation, extra classes, or student doubts..."
                            className="w-full px-4 py-3 text-sm font-medium text-slate-900 rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition shadow-xs"
                        />
                    </div>
                </div>

                {/* SUBMIT ACTIONS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-6 py-3.5 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-2xl transition w-full sm:w-auto justify-center border-2 border-slate-200 shadow-sm cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Cancel &amp; Return
                    </button>

                    <button
                        type="submit"
                        disabled={savedNotice}
                        className="flex items-center justify-center gap-2 px-9 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-200 transition transform active:scale-95 w-full sm:w-auto cursor-pointer"
                    >
                        {savedNotice ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                Class Record Saved! Redirecting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                {editId ? 'Update Class Record' : 'Save to Progress Register'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* QUICK ADD CLASS MODAL WITH APNSIR BRAND HEADER */}
            {isAddClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsAddClassModalOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-[30px] border border-white/40 bg-white shadow-2xl flex flex-col">
                        
                        {/* BRAND HEADER WITH BLUE GRADIENT & LOGO */}
                        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 text-white">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                            <div className="relative flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur-sm shadow-inner">
                                        <Image
                                            src="/apnsir-logo.png"
                                            alt="APNSIR Foundation"
                                            width={32}
                                            height={32}
                                            className="max-h-full max-w-full object-contain rounded-full"
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
                                            ProfPlan &bull; Academic Workspace Setup
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsAddClassModalOpen(false)}
                                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* MODAL BODY */}
                        <div className="overflow-y-auto px-6 py-5 space-y-4">
                            
                            {/* HIGHLIGHTED ADVISORY CARD */}
                            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50/60 to-indigo-50 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                        <Info className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-indigo-950">
                                            Configure Your Classes &amp; Semesters
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800 font-medium">
                                            Add all your active academic groups. Once configured, you can easily attach subjects, plan your syllabus, and map your timetable.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveNewClass} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                        Class / Semester Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. BA 1st Semester, +2 1st Year Arts, Class XI"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        required
                                        autoFocus
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                        Stream / Faculty
                                    </label>
                                    <select
                                        value={newClassStream}
                                        onChange={(e) => setNewClassStream(e.target.value)}
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition cursor-pointer"
                                    >
                                        <option value="General / Academic" className="text-slate-900 font-bold bg-white">General / Academic</option>
                                        <option value="Arts Stream" className="text-slate-900 font-bold bg-white">Arts Stream</option>
                                        <option value="Science Stream" className="text-slate-900 font-bold bg-white">Science Stream</option>
                                        <option value="Commerce Stream" className="text-slate-900 font-bold bg-white">Commerce Stream</option>
                                        <option value="Vocational" className="text-slate-900 font-bold bg-white">Vocational</option>
                                        <option value="Other / Custom" className="text-slate-900 font-bold bg-white">Other / Custom</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    <button
                                           type="button"
                                        onClick={() => setIsAddClassModalOpen(false)}
                                        className="px-5 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:opacity-95 cursor-pointer"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Create Workspace
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LogPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                    <div className="text-sm font-bold text-slate-500 animate-pulse">
                        Loading Adaptive Class Register...
                    </div>
                </div>
            }
        >
            <LogFormContent />
        </Suspense>
    );
}