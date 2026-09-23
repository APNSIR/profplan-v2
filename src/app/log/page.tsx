'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
    GraduationCap
} from 'lucide-react';

/* =========================================================
   12-HOUR TIME HELPERS
   ---------------------------------------------------------
   Stored internally as HH:mm.
   Displayed/selected by the user as 12-hour time.
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
   12-HOUR TIME SELECTOR
   ---------------------------------------------------------
   The visible interface is always:
   Hour : Minute AM/PM

   The value passed back to the application remains HH:mm.
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
        <div className="flex items-center gap-1.5">
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
                className="min-w-0 flex-1 px-2.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Hour"
            >
                {Array.from({ length: 12 }, (_, index) => {
                    const hour = index + 1;

                    return (
                        <option
                            key={hour}
                            value={hour}
                        >
                            {hour}
                        </option>
                    );
                })}
            </select>

            <span className="text-sm font-black text-slate-500">
                :
            </span>

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
                className="min-w-0 flex-1 px-2.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Minute"
            >
                {Array.from({ length: 60 }, (_, minute) => (
                    <option
                        key={minute}
                        value={minute}
                    >
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
                className="w-[78px] px-2.5 py-2.5 text-sm font-black rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="AM or PM"
            >
                <option value="AM">
                    AM
                </option>

                <option value="PM">
                    PM
                </option>
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

    const [isCustomSubjectMode, setIsCustomSubjectMode] =
        useState(false);

    const [customSubjectName, setCustomSubjectName] =
        useState('');

    const [isAddClassModalOpen, setIsAddClassModalOpen] =
        useState(false);

    const [newClassName, setNewClassName] =
        useState('');

    const [newClassStream, setNewClassStream] =
        useState('Arts Stream');

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

    /* =====================================================
       LOAD STORE DATA
       ===================================================== */

    useEffect(() => {
        setMounted(true);

        const store: any = load();

        if (store) {
            setD(store);
        }

        /*
         * EDIT EXISTING CLASS RECORD
         */
        if (editId && store?.logs) {
            const existing: any = store.logs.find(
                (l: any) => l.id === editId
            );

            if (existing) {
                const courseExists = store.courses?.some(
                    (c: any) =>
                        c.id === existing.courseId
                );

                const isCustom =
                    existing.courseId === 'custom_activity' ||
                    !courseExists;

                if (isCustom) {
                    setIsCustomSubjectMode(true);

                    setCustomSubjectName(
                        existing.customSubjectName ||
                        existing.plannedTopicName ||
                        'Extra Activity'
                    );
                }

                setForm({
                    date:
                        existing.date ||
                        new Date().toLocaleDateString('en-CA'),

                    status:
                        existing.status ||
                        'Taken',

                    classSource:
                        existing.slotId
                            ? 'Scheduled Class'
                            : 'Extra / Unscheduled Class',

                    type:
                        existing.classType ||
                        existing.type ||
                        'Regular Lecture',

                    hours:
                        existing.hours ??
                        0.75,

                    room:
                        existing.room ||
                        '',

                    actualStart:
                        normalizeTime(
                            existing.actualStart,
                            '09:00'
                        ),

                    actualEnd:
                        normalizeTime(
                            existing.actualEnd,
                            '09:45'
                        ),

                    courseId:
                        isCustom
                            ? 'custom_activity'
                            : existing.courseId || '',

                    slotId:
                        existing.slotId ||
                        '',

                    topicId:
                        existing.topicId ||
                        '',

                    covered:
                        existing.covered ||
                        '',

                    remarks:
                        existing.remarks ||
                        '',

                    attendance:
                        existing.attendance !== undefined &&
                            existing.attendance !== null
                            ? String(existing.attendance)
                            : '',

                    semester:
                        existing.semester ||
                        '',
                });

                return;
            }
        }

        /*
         * OPEN REGISTER FROM A TIMETABLE SLOT
         */
        if (urlSlotId && store?.slots) {
            const slot: any = store.slots.find(
                (s: any) => s.id === urlSlotId
            );

            if (slot) {
                const course: any =
                    store.courses?.find(
                        (c: any) =>
                            c.id === slot.courseId
                    );

                const firstTopic: any =
                    store.topics?.find(
                        (t: any) =>
                            t.courseId === slot.courseId
                    );

                const actualStart =
                    normalizeTime(
                        slot.start,
                        '09:00'
                    );

                const actualEnd =
                    normalizeTime(
                        slot.end,
                        '09:45'
                    );

                const duration =
                    calculateDurationHours(
                        actualStart,
                        actualEnd
                    );

                setForm((prev: any) => ({
                    ...prev,

                    classSource:
                        'Scheduled Class',

                    slotId:
                        slot.id,

                    courseId:
                        slot.courseId,

                    room:
                        slot.room || '',

                    actualStart,

                    actualEnd,

                    topicId:
                        firstTopic?.id || '',

                    covered:
                        firstTopic?.name || '',

                    hours:
                        duration > 0
                            ? duration
                            : 0.75,

                    semester:
                        course?.semester ||
                        slot.semesterClass ||
                        '',
                }));
            }
        }
    }, [editId, urlSlotId]);

    /* =====================================================
       ACTIVE CLASSES
       ===================================================== */

    const activeClasses = useMemo(() => {
        return Array.isArray(d?.classes)
            ? d.classes
            : [];
    }, [d.classes]);

    /* =====================================================
       ACTIVE COURSES / SUBJECTS
       ===================================================== */

    const activeCourses = useMemo(() => {
        if (!Array.isArray(d?.courses)) {
            return [];
        }

        if (!Array.isArray(d?.classes)) {
            return [];
        }

        const activeClassIds = new Set(
            d.classes.map(
                (cls: any) => cls.id
            )
        );

        const activeClassNames = new Set(
            d.classes.map(
                (cls: any) =>
                    String(cls.name || '')
                        .trim()
                        .toLowerCase()
            )
        );

        return d.courses.filter(
            (course: any) => {
                if (course.classId) {
                    return activeClassIds.has(
                        course.classId
                    );
                }

                if (course.semester) {
                    return activeClassNames.has(
                        String(course.semester)
                            .trim()
                            .toLowerCase()
                    );
                }

                return false;
            }
        );
    }, [d.courses, d.classes]);

    /* =====================================================
       SELECTED COURSE
       ===================================================== */

    const selectedCourse = useMemo(() => {
        if (!form.courseId) {
            return null;
        }

        return (
            activeCourses.find(
                (c: any) =>
                    c.id === form.courseId
            ) || null
        );
    }, [activeCourses, form.courseId]);

    /* =====================================================
       SELECTED DATE
       ===================================================== */

    const selectedDate = useMemo(() => {
        if (!form.date) {
            return new Date();
        }

        return new Date(
            `${form.date}T00:00:00`
        );
    }, [form.date]);

    const dayNumber =
        selectedDate.getDay();

    const dayName =
        selectedDate.toLocaleDateString(
            'en-IN',
            {
                weekday: 'long'
            }
        );

    /* =====================================================
       ACTIVE TIMETABLE SLOTS
       ===================================================== */

    const scheduledSlots = useMemo(() => {
        if (
            !Array.isArray(d?.slots) ||
            !activeCourses.length
        ) {
            return [];
        }

        const activeCourseIds =
            new Set(
                activeCourses.map(
                    (course: any) =>
                        course.id
                )
            );

        return d.slots
            .filter(
                (slot: any) =>
                    Number(slot.day) ===
                    dayNumber &&
                    activeCourseIds.has(
                        slot.courseId
                    )
            )
            .sort(
                (a: any, b: any) =>
                    Number(a.period) -
                    Number(b.period)
            );
    }, [
        d.slots,
        dayNumber,
        activeCourses
    ]);

    /* =====================================================
       TOPICS FOR SELECTED ACTIVE COURSE
       ===================================================== */

    const topics = useMemo(() => {
        if (
            !Array.isArray(d?.topics) ||
            !form.courseId
        ) {
            return [];
        }

        return d.topics.filter(
            (t: any) =>
                t.courseId ===
                form.courseId
        );
    }, [
        d.topics,
        form.courseId
    ]);

    /* =====================================================
       CALCULATED HOURS
       ===================================================== */

    const calculatedHours =
        useMemo(() => {
            return calculateDurationHours(
                form.actualStart,
                form.actualEnd
            );
        }, [
            form.actualStart,
            form.actualEnd
        ]);

    /* =====================================================
       FORM UPDATE
       ===================================================== */

    function updateForm(
        field: string,
        value: any
    ) {
        setForm((prev: any) => {
            const updated = {
                ...prev,
                [field]: value
            };

            if (
                field === 'actualStart' ||
                field === 'actualEnd'
            ) {
                const nextStart =
                    field === 'actualStart'
                        ? value
                        : prev.actualStart;

                const nextEnd =
                    field === 'actualEnd'
                        ? value
                        : prev.actualEnd;

                const hours =
                    calculateDurationHours(
                        nextStart,
                        nextEnd
                    );

                updated.hours =
                    hours > 0
                        ? hours
                        : 0;
            }

            return updated;
        });
    }

    /* =====================================================
       SPECIAL / EXTRA CLASS PRESETS
       ===================================================== */

    function handleApplyPreset(
        classType: string,
        defaultRemarks: string
    ) {
        setIsCustomSubjectMode(true);

        setForm((prev: any) => ({
            ...prev,

            classSource:
                'Extra / Unscheduled Class',

            type:
                classType,

            slotId:
                '',

            courseId:
                'custom_activity',

            remarks:
                defaultRemarks
        }));
    }

    /* =====================================================
       SELECT ROUTINE PERIOD
       ===================================================== */

    function selectScheduledSlot(
        slotId: string
    ) {
        if (!d?.slots) {
            return;
        }

        const slot =
            d.slots.find(
                (s: any) =>
                    s.id === slotId
            );

        if (!slot) {
            return;
        }

        const course =
            activeCourses.find(
                (c: any) =>
                    c.id === slot.courseId
            );

        if (!course) {
            alert(
                'This routine period belongs to a deleted or inactive Class / Semester and cannot be registered.'
            );

            setForm((prev: any) => ({
                ...prev,
                slotId: '',
                courseId: '',
                topicId: '',
                covered: '',
                semester: ''
            }));

            return;
        }

        const firstTopic =
            d.topics?.find(
                (t: any) =>
                    t.courseId ===
                    slot.courseId
            );

        const actualStart =
            normalizeTime(
                slot.start,
                '09:00'
            );

        const actualEnd =
            normalizeTime(
                slot.end,
                '09:45'
            );

        const hours =
            calculateDurationHours(
                actualStart,
                actualEnd
            );

        setIsCustomSubjectMode(false);

        setForm((prev: any) => ({
            ...prev,

            slotId:
                slot.id,

            courseId:
                slot.courseId,

            room:
                slot.room || '',

            actualStart,

            actualEnd,

            topicId:
                firstTopic?.id || '',

            covered:
                firstTopic?.name || '',

            hours:
                hours > 0
                    ? hours
                    : 0.75,

            semester:
                        course?.semester ||
                        (slot as any).semesterClass ||
                        ''
        }));
    }

    /* =====================================================
       DATE CHANGE
       ===================================================== */

    function changeDate(
        newDate: string
    ) {
        setForm((prev: any) => ({
            ...prev,

            date:
                newDate,

            slotId:
                ''
        }));
    }

    /* =====================================================
       ADD NEW CLASS WORKSPACE
       ===================================================== */

    const handleSaveNewClass = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const className =
            newClassName.trim();

        const stream =
            newClassStream.trim();

        if (!className || !stream) {
            return;
        }

        const duplicate =
            d.classes?.some(
                (cls: any) =>
                    String(
                        cls.name || ''
                    )
                        .trim()
                        .toLowerCase() ===
                    className.toLowerCase()
            );

        if (duplicate) {
            alert(
                'A Class / Semester with this name already exists.'
            );
            return;
        }

        const newClassObj = {
            id:
                'cls_' +
                Date.now(),

            name:
                className,

            stream:
                stream
        };

        const updatedClasses = [
            ...(d.classes || []),
            newClassObj
        ];

        const updatedData = {
            ...d,
            classes:
                updatedClasses
        };

        save(updatedData);
        setD(updatedData);

        setForm((prev: any) => ({
            ...prev,
            semester:
                newClassObj.name
        }));

        setNewClassName('');

        setNewClassStream(
            'Arts Stream'
        );

        setIsAddClassModalOpen(false);
    };

    /* =====================================================
       SUBMIT TEACHING RECORD
       ===================================================== */

    function submit(
        e: React.FormEvent
    ) {
        e.preventDefault();

        if (!d) {
            return;
        }

        if (
            form.classSource ===
            'Scheduled Class' &&
            !form.slotId
        ) {
            alert(
                'Please select the scheduled routine period.'
            );
            return;
        }

        if (!isCustomSubjectMode) {
            if (!form.courseId) {
                alert(
                    'Please select a Course / Subject.'
                );
                return;
            }

            const courseIsActive =
                activeCourses.some(
                    (c: any) =>
                        c.id ===
                        form.courseId
                );

            if (!courseIsActive) {
                alert(
                    'The selected Subject belongs to a deleted or inactive Class / Semester. Please select an active Subject.'
                );

                setForm(
                    (prev: any) => ({
                        ...prev,
                        courseId: '',
                        topicId: '',
                        covered: '',
                        semester: '',
                        slotId: ''
                    })
                );

                return;
            }
        }

        if (
            isCustomSubjectMode &&
            !customSubjectName.trim()
        ) {
            alert(
                'Please enter a Custom Subject or Activity Name.'
            );
            return;
        }

        if (
            isCustomSubjectMode &&
            !form.semester
        ) {
            alert(
                'Please select the Target Class / Semester.'
            );
            return;
        }

        if (
            isCustomSubjectMode &&
            form.semester
        ) {
            const targetClassExists =
                activeClasses.some(
                    (cls: any) =>
                        cls.name ===
                        form.semester
                );

            if (!targetClassExists) {
                alert(
                    'The selected Target Class / Semester no longer exists. Please select an active Class / Semester.'
                );
                return;
            }
        }

        if (!form.room.trim()) {
            alert(
                'Please enter the Room / Lecture Hall.'
            );
            return;
        }

        if (
            calculatedHours <= 0
        ) {
            alert(
                'Actual End Time must be later than Actual Start Time.'
            );
            return;
        }

        const plannedTopicObj =
            d.topics?.find(
                (t: any) =>
                    t.id ===
                    form.topicId
            );

        const newLog = {
            ...form,

            id:
                editId ||
                'log_' +
                Date.now(),

            courseId:
                isCustomSubjectMode
                    ? 'custom_activity'
                    : form.courseId,

            customSubjectName:
                isCustomSubjectMode
                    ? customSubjectName.trim()
                    : null,

            plannedTopicName:
                isCustomSubjectMode
                    ? customSubjectName.trim()
                    : (
                        plannedTopicObj?.name ||
                        'Unplanned / General'
                    ),

            /*
             * Always calculate actual workload
             * from actual Start and End.
             *
             * No fixed period duration is assumed.
             */
            hours:
                calculatedHours,

            attendance:
                form.attendance !== ''
                    ? Number(
                        form.attendance
                    )
                    : null,

            covered:
                form.covered.trim() ||
                plannedTopicObj?.name ||
                customSubjectName.trim() ||
                'Activity delivered',

            remarks:
                form.remarks.trim(),

            /*
             * Keep canonical storage format.
             */
            actualStart:
                normalizeTime(
                    form.actualStart,
                    '09:00'
                ),

            actualEnd:
                normalizeTime(
                    form.actualEnd,
                    '09:45'
                )
        };

        let updatedLogs =
            [...(d.logs || [])];

        if (editId) {
            updatedLogs =
                updatedLogs.map(
                    (l: any) =>
                        l.id === editId
                            ? newLog
                            : l
                );
        } else {
            /*
             * One actual record per
             * routine slot/date.
             */
            if (form.slotId) {
                updatedLogs =
                    updatedLogs.filter(
                        (l: any) =>
                            !(
                                l.date ===
                                form.date &&
                                l.slotId ===
                                form.slotId
                            )
                    );
            }

            updatedLogs.push(
                newLog
            );
        }

        const updatedData = {
            ...d,
            logs:
                updatedLogs
        };

        save(updatedData);

        setSavedNotice(true);

        setTimeout(() => {
            router.push(
                '/reports'
            );
        }, 500);
    }

    /* =====================================================
       INITIAL HYDRATION
       ===================================================== */

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

            {/* NAVIGATION BAR WITH TODAY LINK */}

            <div className="flex items-center justify-between pt-4 flex-wrap gap-3">

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition"
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

                <div className="relative">

                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Class Delivery Register
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                        {editId
                            ? 'Modify Teaching Log'
                            : 'Adaptive Class Register'}
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-blue-100/80 max-w-2xl">
                        Record actual classroom engagement, syllabus topics delivered, and attendance count for audit compliance.
                    </p>
                </div>
            </section>

            {/* GUIDED ONBOARDING BANNER */}

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

            {/* FORM BODY */}

            <form
                onSubmit={submit}
                className="space-y-6"
            >

                {/* =================================================
                    1. DATE & SCHEDULE CARD
                ================================================= */}

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
                                onClick={() =>
                                    handleApplyPreset(
                                        'Extra Class',
                                        'Conducted extra lecture for syllabus pacing'
                                    )
                                }
                                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold transition"
                            >
                                + Extra Class
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleApplyPreset(
                                        'Remedial Class',
                                        'Remedial session for student doubt clearance'
                                    )
                                }
                                className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold transition"
                            >
                                + Remedial
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleApplyPreset(
                                        'Substitute Class',
                                        'Covered substitute period on departmental request'
                                    )
                                }
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition"
                            >
                                + Substitution
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Date of Class <span className="text-rose-500">*</span>
                            </label>

                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) =>
                                    changeDate(
                                        e.target.value
                                    )
                                }
                                required
                                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Day of Week
                            </label>

                            <div className="flex items-center justify-between px-3.5 py-2.5 text-sm font-black text-blue-950 rounded-xl border border-blue-100 bg-blue-50/70">

                                <span>
                                    {dayName}
                                </span>

                                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                                    Auto-calculated
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SCHEDULE MODE SELECTOR */}

                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2">
                            Engagement Category <span className="text-rose-500">*</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomSubjectMode(false);

                                    updateForm(
                                        'classSource',
                                        'Scheduled Class'
                                    );
                                }}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black border transition transform active:scale-95 ${form.classSource ===
                                        'Scheduled Class'
                                        ? 'border-blue-900 bg-gradient-to-r from-blue-950 to-blue-900 text-white shadow-md ring-2 ring-blue-500/40'
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

                                    setForm(
                                        (prev: any) => ({
                                            ...prev,

                                            classSource:
                                                'Extra / Unscheduled Class',

                                            slotId:
                                                '',

                                            courseId:
                                                'custom_activity'
                                        })
                                    );
                                }}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black border transition transform active:scale-95 shadow-md ${form.classSource ===
                                        'Extra / Unscheduled Class'
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

                    {form.classSource ===
                        'Scheduled Class' && (
                            <div className="pt-2">

                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    Select Routine Period ({dayName}) <span className="text-rose-500">*</span>
                                </label>

                                {scheduledSlots.length === 0 ? (
                                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">

                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />

                                        <span>
                                            No routine periods found for {dayName}. Switch to <strong>Click to Register Special/Extra/Remedial Class</strong> to record freely.
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        value={
                                            form.slotId
                                        }
                                        onChange={(e) =>
                                            selectScheduledSlot(
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    >
                                        <option value="">
                                            -- Choose Routine Period --
                                        </option>

                                        {scheduledSlots.map(
                                            (slot: any) => {

                                                const c =
                                                    activeCourses.find(
                                                        (course: any) =>
                                                            course.id ===
                                                            slot.courseId
                                                    );

                                                return (
                                                    <option
                                                        key={
                                                            slot.id
                                                        }
                                                        value={
                                                            slot.id
                                                        }
                                                    >
                                                        Period {slot.period} ({formatTime12Hour(slot.start)} – {formatTime12Hour(slot.end)}) — {c?.name || 'Unknown Course'} — {slot.room || 'General'}
                                                    </option>
                                                );
                                            }
                                        )}
                                    </select>
                                )}
                            </div>
                        )}
                </div>

                {/* =================================================
                    2. SUBJECT & TOPIC CARD
                ================================================= */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm space-y-5">

                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                        <div className="flex items-center gap-2">

                            <BookOpen className="w-4 h-4 text-blue-600" />

                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Subject &amp; Teaching Details
                            </h2>
                        </div>

                        {form.classSource ===
                            'Extra / Unscheduled Class' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsCustomSubjectMode(
                                            !isCustomSubjectMode
                                        )
                                    }
                                    className="text-[11px] font-extrabold text-purple-700 hover:underline bg-purple-50 px-3 py-1 rounded-xl border border-purple-200"
                                >
                                    {isCustomSubjectMode
                                        ? '← Switch to Registered Subjects'
                                        : '+ Enter Free-text Activity / Subject'}
                                </button>
                            )}
                    </div>

                    {isCustomSubjectMode ? (
                        <div className="space-y-4 p-4 rounded-2xl bg-purple-50/40 border border-purple-100">

                            <div>

                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    Custom Subject / Activity Name <span className="text-rose-500">*</span>
                                </label>

                                <input
                                    type="text"
                                    value={
                                        customSubjectName
                                    }
                                    onChange={(e) =>
                                        setCustomSubjectName(
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g. Yoga & Wellness / NSS Camp / Dept Meeting / Seminar"
                                    required={
                                        isCustomSubjectMode
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-sm"
                                />

                                <p className="text-[11px] text-slate-500 mt-1">
                                    Use this for any non-syllabus engagement or cross-departmental activity.
                                </p>
                            </div>

                            <div>

                                <div className="flex items-center justify-between mb-1.5">

                                    <label className="text-xs font-bold text-slate-800">
                                        Class / Semester / Batch <span className="text-rose-500">*</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsAddClassModalOpen(
                                                true
                                            )
                                        }
                                        className="text-[11px] font-extrabold text-blue-600 hover:underline inline-flex items-center gap-1 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200"
                                    >
                                        <Plus className="w-3 h-3" />
                                        + Add New Class Workspace
                                    </button>
                                </div>

                                <select
                                    value={
                                        form.semester
                                    }
                                    onChange={(e) =>
                                        updateForm(
                                            'semester',
                                            e.target.value
                                        )
                                    }
                                    required={
                                        isCustomSubjectMode
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                                >
                                    <option value="">
                                        -- Select Target Class / Semester --
                                    </option>

                                    {activeClasses.map(
                                        (cls: any) => (
                                            <option
                                                key={
                                                    cls.id
                                                }
                                                value={
                                                    cls.name
                                                }
                                            >
                                                {cls.name} ({cls.stream || 'General'})
                                            </option>
                                        )
                                    )}
                                </select>

                                <p className="text-[11px] text-slate-500 mt-1">
                                    Specify which class or academic batch this special/remedial session is held for.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <div>

                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    Course / Paper <span className="text-rose-500">*</span>
                                </label>

                                <select
                                    value={
                                        form.courseId
                                    }
                                    onChange={(e) => {

                                        const cId =
                                            e.target.value;

                                        const c =
                                            activeCourses.find(
                                                (x: any) =>
                                                    x.id ===
                                                    cId
                                            );

                                        setForm(
                                            (prev: any) => ({
                                                ...prev,

                                                courseId:
                                                    cId,

                                                topicId:
                                                    '',

                                                covered:
                                                    '',

                                                semester:
                                                    c?.semester ||
                                                    ''
                                            })
                                        );
                                    }}
                                    required={
                                        !isCustomSubjectMode
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="">
                                        -- Select Subject / Paper --
                                    </option>

                                    {activeCourses.map(
                                        (c: any) => (
                                            <option
                                                key={
                                                    c.id
                                                }
                                                value={
                                                    c.id
                                                }
                                            >
                                                {c.name} ({c.code})
                                            </option>
                                        )
                                    )}
                                </select>

                                {activeCourses.length ===
                                    0 && (
                                        <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                                            No active registered subjects are available. Add a Class / Semester and create its subjects in the Syllabus Planner.
                                        </p>
                                    )}
                            </div>

                            <div>

                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    Semester / Section
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.semester ||
                                        selectedCourse?.semester ||
                                        ''
                                    }
                                    onChange={(e) =>
                                        updateForm(
                                            'semester',
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g. 1st Semester · Arts"
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>
                    )}

                    {!isCustomSubjectMode && (
                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Planned Syllabus Topic
                            </label>

                            <select
                                value={
                                    form.topicId
                                }
                                onChange={(e) => {

                                    const tId =
                                        e.target.value;

                                    const selectedTopic =
                                        topics.find(
                                            (t: any) =>
                                                t.id ===
                                                tId
                                        );

                                    setForm(
                                        (prev: any) => ({
                                            ...prev,

                                            topicId:
                                                tId,

                                            covered:
                                                selectedTopic?.name ||
                                                prev.covered
                                        })
                                    );
                                }}
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">
                                    -- Custom / Unplanned Topic --
                                </option>

                                {topics.map(
                                    (t: any) => (
                                        <option
                                            key={
                                                t.id
                                            }
                                            value={
                                                t.id
                                            }
                                        >
                                            Unit {t.unitNumber || t.unit || 1} — {t.name} ({t.suggestedClasses || 2} suggested periods)
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    )}

                    <div>

                        <div className="flex items-center justify-between mb-1.5">

                            <label className="text-xs font-bold text-slate-800">
                                Topic / Activity Actually Covered <span className="text-rose-500">*</span>
                            </label>

                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                Editable for deviations
                            </span>
                        </div>

                        <input
                            type="text"
                            value={
                                form.covered
                            }
                            onChange={(e) =>
                                updateForm(
                                    'covered',
                                    e.target.value
                                )
                            }
                            placeholder="Detail what was taught or conducted today..."
                            required
                            className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
                        />
                    </div>
                </div>

                {/* =================================================
                    3. STATUS, TIME & ATTENDANCE CARD
                ================================================= */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm space-y-5">

                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">

                        <Layers className="w-4 h-4 text-blue-600" />

                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Class Delivery, Timing &amp; Attendance
                        </h2>
                    </div>

                    {/* STATUS SELECTOR BUTTONS */}

                    <div>

                        <label className="block text-xs font-bold text-slate-800 mb-2">
                            Class Delivery Status <span className="text-rose-500">*</span>
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">

                            {[
                                'Taken',
                                'Compensated',
                                'Postponed',
                                'Cancelled',
                                'Leave',
                                'Mass Bunk'
                            ].map(
                                (st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() =>
                                            updateForm(
                                                'status',
                                                st
                                            )
                                        }
                                        className={`py-2.5 px-2 rounded-xl text-xs font-black border transition transform active:scale-95 ${form.status ===
                                                st
                                                ? st ===
                                                    'Taken'
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                                                    : st ===
                                                        'Compensated'
                                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                                                        : 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Class Type
                            </label>

                            <select
                                value={
                                    form.type
                                }
                                onChange={(e) =>
                                    updateForm(
                                        'type',
                                        e.target.value
                                    )
                                }
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="Regular Lecture">
                                    Theory Lecture
                                </option>

                                <option value="Practical/Lab">
                                    Practical / Lab
                                </option>

                                <option value="Tutorial">
                                    Tutorial / Doubt Class
                                </option>

                                <option value="Remedial Class">
                                    Remedial Class
                                </option>

                                <option value="Revision">
                                    Revision Lecture
                                </option>

                                <option value="Activity / Other">
                                    Activity / Special Session
                                </option>
                            </select>
                        </div>

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Room / Hall <span className="text-rose-500">*</span>
                            </label>

                            <input
                                type="text"
                                value={
                                    form.room
                                }
                                onChange={(e) =>
                                    updateForm(
                                        'room',
                                        e.target.value
                                    )
                                }
                                placeholder="e.g. Room 12"
                                required
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>

                        {/* =================================================
                            TRUE 12-HOUR START TIME
                        ================================================= */}

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Start Clock Time <span className="text-rose-500">*</span>
                            </label>

                            <Time12Input
                                value={
                                    form.actualStart
                                }
                                onChange={(value) =>
                                    updateForm(
                                        'actualStart',
                                        value
                                    )
                                }
                                required
                            />

                            <div className="mt-1 text-[10px] font-semibold text-slate-400">
                                12-hour format
                            </div>
                        </div>

                        {/* =================================================
                            TRUE 12-HOUR END TIME
                        ================================================= */}

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                End Clock Time <span className="text-rose-500">*</span>
                            </label>

                            <Time12Input
                                value={
                                    form.actualEnd
                                }
                                onChange={(value) =>
                                    updateForm(
                                        'actualEnd',
                                        value
                                    )
                                }
                                required
                            />

                            <div className="mt-1 text-[10px] font-semibold text-slate-400">
                                12-hour format
                            </div>
                        </div>
                    </div>

                    {/* WORKLOAD + ATTENDANCE */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                Total Workload Credit (Hours)
                            </label>

                            <div className="flex items-center justify-between px-4 py-2.5 text-sm font-black text-blue-950 rounded-xl border border-blue-100 bg-blue-50/70">

                                <span>
                                    {calculatedHours >
                                        0
                                        ? `${calculatedHours.toFixed(2)} hrs`
                                        : '0.00 hrs'}
                                </span>

                                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                                    Auto-calculated
                                </span>
                            </div>

                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                Calculated from actual Start and End time.
                            </p>
                        </div>

                        <div>

                            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                Student Attendance (Count)
                            </label>

                            <input
                                type="number"
                                min="0"
                                max="200"
                                value={
                                    form.attendance
                                }
                                onChange={(e) =>
                                    updateForm(
                                        'attendance',
                                        e.target.value
                                    )
                                }
                                placeholder="e.g. 48"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>
                    </div>

                    <div>

                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                            <FileEdit className="w-3.5 h-3.5 text-slate-400" />
                            Deviations / Departmental Remarks (Optional)
                        </label>

                        <textarea
                            rows={2}
                            value={
                                form.remarks
                            }
                            onChange={(e) =>
                                updateForm(
                                    'remarks',
                                    e.target.value
                                )
                            }
                            placeholder="Record reasons for syllabus deviation, extra classes, or student doubts..."
                            className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                        />
                    </div>
                </div>

                {/* =================================================
                    SUBMIT ACTIONS
                ================================================= */}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">

                    <button
                        type="button"
                        onClick={() =>
                            router.back()
                        }
                        className="flex items-center gap-2 px-5 py-3 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-2xl transition w-full sm:w-auto justify-center border border-slate-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Cancel &amp; Return
                    </button>

                    <button
                        type="submit"
                        disabled={
                            savedNotice
                        }
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition transform active:scale-95 w-full sm:w-auto"
                    >
                        {savedNotice ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                Class Record Saved! Redirecting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />

                                {editId
                                    ? 'Update Class Record'
                                    : 'Save to Progress Register'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* =====================================================
                QUICK ADD CLASS MODAL
            ===================================================== */}

            {isAddClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsAddClassModalOpen(
                                false
                            );
                        }
                    }}
                >

                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <GraduationCap className="h-5 w-5" />
                                </div>

                                <h3 className="text-base font-black text-slate-900">
                                    Add Class / Semester
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsAddClassModalOpen(
                                        false
                                    )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSaveNewClass
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Class / Semester Name *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. Class 6, Semester 1"
                                    value={
                                        newClassName
                                    }
                                    onChange={(e) =>
                                        setNewClassName(
                                            e.target.value
                                        )
                                    }
                                    required
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Stream / Faculty
                                </label>

                                <select
                                    value={
                                        newClassStream
                                    }
                                    onChange={(e) =>
                                        setNewClassStream(
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="General / Academic">
                                        General / Academic
                                    </option>

                                    <option value="Arts Stream">
                                        Arts Stream
                                    </option>

                                    <option value="Science Stream">
                                        Science Stream
                                    </option>

                                    <option value="Commerce Stream">
                                        Commerce Stream
                                    </option>

                                    <option value="Vocational">
                                        Vocational
                                    </option>

                                    <option value="Other / Custom">
                                        Other / Custom
                                    </option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsAddClassModalOpen(
                                            false
                                        )
                                    }
                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase text-white transition hover:bg-blue-700"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Create Workspace
                                </button>
                            </div>
                        </form>
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
                <div className="p-12 text-center text-slate-500 font-bold">
                    Loading Adaptive Class Register...
                </div>
            }
        >
            <LogFormContent />
        </Suspense>
    );
}