'use client';

import React, {
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { load, save, ProfPlanData } from '@/lib/store';
import type { Slot, Course } from '@/lib/types';
import {
    Clock,
    MapPin,
    BookOpen,
    Plus,
    Edit3,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    ChevronUp,
    ChevronDown,
    X,
    ArrowLeft,
    GraduationCap,
    Search,
    SlidersHorizontal,
    Layers,
    Trash2,
} from 'lucide-react';

/* =========================================================
   DAYS
   ========================================================= */

const days = [
    { id: 1, name: 'Monday', short: 'MON' },
    { id: 2, name: 'Tuesday', short: 'TUE' },
    { id: 3, name: 'Wednesday', short: 'WED' },
    { id: 4, name: 'Thursday', short: 'THU' },
    { id: 5, name: 'Friday', short: 'FRI' },
    { id: 6, name: 'Saturday', short: 'SAT' },
];

/* =========================================================
   TYPES
   ========================================================= */

type ClassRecord = {
    id: string;
    name: string;
    stream?: string;
    [key: string]: unknown;
};

type TimetableForm = {
    id: string;
    day: number;
    period: number;
    start: string;
    end: string;
    classId: string;
    courseId: string;
    semesterClass: string;
    room: string;
};

type Conflict = {
    type: 'class' | 'teacher';
    slot: Slot;
    title: string;
    message: string;
    className: string;
    subject: string;
};

type TimeWindow = {
    start: string;
    end: string;
};

/* =========================================================
   DEFAULT FORM
   ========================================================= */

const emptyForm: TimetableForm = {
    id: '',
    day: 1,
    period: 1,
    start: '09:00',
    end: '09:45',
    classId: '',
    courseId: '',
    semesterClass: '',
    room: '',
};

/* =========================================================
   CLASS CARD PALETTES
   ========================================================= */

const CARD_PALETTES = [
    {
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
    {
        bg: 'bg-gradient-to-br from-emerald-600 to-teal-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
    {
        bg: 'bg-gradient-to-br from-violet-600 to-purple-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
    {
        bg: 'bg-gradient-to-br from-amber-600 to-orange-700',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
    {
        bg: 'bg-gradient-to-br from-rose-600 to-pink-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
    {
        bg: 'bg-gradient-to-br from-cyan-700 to-blue-900',
        text: 'text-white',
        badge: 'bg-white/20 text-white',
    },
];

/* =========================================================
   TIME HELPERS
   ========================================================= */

function timeToMinutes(value: string): number {
    if (!value || !value.includes(':')) return 0;

    const [hourPart, minutePart] = value.split(':');

    const hour = Number(hourPart);
    const minute = Number(minutePart);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return 0;
    }

    return hour * 60 + minute;
}

function formatTime12Hour(value: string): string {
    if (!value) return '';

    const minutes = timeToMinutes(value);
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;

    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(start: string, end: string): string {
    return `${formatTime12Hour(start)} – ${formatTime12Hour(end)}`;
}

function calculateMinutes(start: string, end: string): number {
    return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

function formatDuration(start: string, end: string): string {
    const minutes = calculateMinutes(start, end);

    if (minutes === 0) return '0 min';

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours > 0 && remaining > 0) {
        return `${hours} hr ${remaining} min`;
    }

    if (hours > 0) {
        return `${hours} hr`;
    }

    return `${remaining} min`;
}

function timesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string
): boolean {
    const aStart = timeToMinutes(startA);
    const aEnd = timeToMinutes(endA);
    const bStart = timeToMinutes(startB);
    const bEnd = timeToMinutes(endB);

    if (aStart >= aEnd || bStart >= bEnd) {
        return false;
    }

    return (
        Math.max(aStart, bStart) <
        Math.min(aEnd, bEnd)
    );
}

/* =========================================================
   12-HOUR TIME INPUT
   ========================================================= */

function Time12Input({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const minutes = timeToMinutes(value || '09:00');

    const safeHour24 = Math.floor(minutes / 60);
    const safeMinute = minutes % 60;

    const period = safeHour24 >= 12 ? 'PM' : 'AM';

    const displayHour = safeHour24 % 12 || 12;

    function update(
        hour12: number,
        minute: number,
        ampm: 'AM' | 'PM'
    ) {
        let hour24 = hour12 % 12;

        if (ampm === 'PM') {
            hour24 += 12;
        }

        onChange(
            `${String(hour24).padStart(2, '0')}:${String(
                minute
            ).padStart(2, '0')}`
        );
    }

    return (
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-1.5">
            <select
                className="w-full px-2 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={displayHour}
                onChange={(e) =>
                    update(
                        Number(e.target.value),
                        safeMinute,
                        period
                    )
                }
            >
                {Array.from(
                    { length: 12 },
                    (_, index) => index + 1
                ).map((hour) => (
                    <option key={hour} value={hour}>
                        {hour}
                    </option>
                ))}
            </select>

            <div className="flex items-center justify-center font-bold text-slate-500">
                :
            </div>

            <select
                className="w-full px-2 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={safeMinute}
                onChange={(e) =>
                    update(
                        displayHour,
                        Number(e.target.value),
                        period
                    )
                }
            >
                {Array.from(
                    { length: 60 },
                    (_, minute) => minute
                ).map((minute) => (
                    <option key={minute} value={minute}>
                        {String(minute).padStart(2, '0')}
                    </option>
                ))}
            </select>

            <div className="flex items-center justify-center font-bold text-slate-500">
                &nbsp;
            </div>

            <select
                className="w-full px-2 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={period}
                onChange={(e) =>
                    update(
                        displayHour,
                        safeMinute,
                        e.target.value as 'AM' | 'PM'
                    )
                }
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
}

/* =========================================================
   MAIN CONTENT
   ========================================================= */

function TimetableContent() {
    const searchParams = useSearchParams();

    const [mounted, setMounted] = useState(false);

    const [data, setData] = useState<ProfPlanData>({
        classes: [],
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
    });

    const [selectedClassFilterId, setSelectedClassFilterId] =
        useState<string | null>(null);

    const [isClassesCardsOpen, setIsClassesCardsOpen] =
        useState(false);

    const [isFilterExpanded, setIsFilterExpanded] =
        useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    const [sortBy, setSortBy] =
        useState<'name' | 'stream'>('name');

    const [form, setForm] =
        useState<TimetableForm>(emptyForm);

    const [isFormOpen, setIsFormOpen] =
        useState(false);

    const [isQuickCourseModalOpen, setIsQuickCourseModalOpen] =
        useState(false);

    const [quickCourse, setQuickCourse] = useState({
        name: '',
        code: '',
        semester: '',
        department: 'General',
    });

    const [isNoClassWarningOpen, setIsNoClassWarningOpen] =
        useState(false);

    const [isAddClassModalOpen, setIsAddClassModalOpen] =
        useState(false);

    const [newClassName, setNewClassName] = useState('');

    const [newClassStream, setNewClassStream] =
        useState('Arts Stream');

    const [editing, setEditing] = useState(false);

    const [conflictError, setConflictError] =
        useState<string | null>(null);

    const [successMsg, setSuccessMsg] =
        useState<string | null>(null);

    const [isConflictModalOpen, setIsConflictModalOpen] =
        useState(false);

    const [conflictReason, setConflictReason] =
        useState('');

    const [pendingConflict, setPendingConflict] =
        useState<Conflict | null>(null);

    const formSectionRef =
        useRef<HTMLDivElement | null>(null);

    const today = new Date().getDay();

    const currentDayId =
        today >= 1 && today <= 6
            ? today
            : 1;

    const [mobileActiveDayId, setMobileActiveDayId] = useState<number>(currentDayId);
    const dayTabRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

    function handleSelectMobileDay(dayId: number) {
        setMobileActiveDayId(dayId);
        const node = dayTabRefs.current[dayId];
        if (node) {
            node.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }

    /* =====================================================
       LOAD / REFRESH
       ===================================================== */

    useEffect(() => {
        setMounted(true);

        const loaded = load();

        if (loaded) {
            setData(loaded);
        }

        const refresh = () => {
            const updated = load();

            if (updated) {
                setData(updated);
            }
        };

        window.addEventListener('profplan-change', refresh);
        window.addEventListener('storage', refresh);

        return () => {
            window.removeEventListener('profplan-change', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    /* =====================================================
       OPTIONAL URL CLASS SELECTION
       ===================================================== */

    useEffect(() => {
        if (!mounted) return;

        const classId = searchParams.get('classId');

        if (
            classId &&
            data.classes.some(
                (item) => String(item.id) === classId
            )
        ) {
            setSelectedClassFilterId(classId);
        }
    }, [mounted, searchParams, data.classes]);

    /* =====================================================
       CLASS HELPERS & DE-DUPLICATION
       ===================================================== */

    const classes = useMemo<ClassRecord[]>(() => {
        const rawClasses = (data.classes || []) as unknown as ClassRecord[];
        const seenNames = new Set<string>();
        const uniqueClasses: ClassRecord[] = [];

        rawClasses.forEach((cls) => {
            const cleanName = (cls.name || '').trim().toLowerCase();
            if (cleanName && !seenNames.has(cleanName)) {
                seenNames.add(cleanName);
                uniqueClasses.push(cls);
            }
        });

        return uniqueClasses;
    }, [data.classes]);

    function getClassById(classId?: string): ClassRecord | undefined {
        if (!classId) return undefined;
        return classes.find((item) => item.id === classId);
    }

    function getSlotClassName(slot: Slot): string {
        const cls = getClassById(slot.classId);
        return (
            cls?.name ||
            (slot as any).semesterClass ||
            'Unknown Class'
        );
    }

    function getSlotCourseName(slot: Slot): string {
        const course = data.courses.find(
            (item) => item.id === slot.courseId
        );
        return course?.name || 'Subject';
    }

    function slotBelongsToClass(
        slot: Slot,
        classId: string,
        className: string
    ): boolean {
        if (slot.classId) {
            return slot.classId === classId;
        }

        return (
            !!className &&
            (slot as any).semesterClass === className
        );
    }

    /* =====================================================
       FILTERED CLASSES
       ===================================================== */

    const filteredClasses = useMemo(() => {
        let list = [...classes];
        const query = searchQuery.trim().toLowerCase();

        if (query) {
            list = list.filter((item) => {
                const name = item.name.toLowerCase();
                const stream = String(item.stream || '').toLowerCase();
                return name.includes(query) || stream.includes(query);
            });
        }

        list.sort((a, b) => {
            if (sortBy === 'stream') {
                return String(a.stream || '').localeCompare(
                    String(b.stream || '')
                );
            }
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [classes, searchQuery, sortBy]);

    /* =====================================================
       ACTIVE CLASS SLOTS
       ===================================================== */

    const activeFilteredSlots = useMemo(() => {
        const slots = data.slots || [];

        if (!selectedClassFilterId) {
            return slots;
        }

        const activeClass = getClassById(selectedClassFilterId);

        if (!activeClass) {
            return slots;
        }

        return slots.filter((slot) =>
            slotBelongsToClass(
                slot,
                selectedClassFilterId,
                activeClass.name
            )
        );
    }, [data.slots, classes, selectedClassFilterId]);

    /* =====================================================
       AVAILABLE COURSES
       ===================================================== */

    const availableCoursesForForm = useMemo<Course[]>(() => {
        const courses = data.courses || [];

        if (!form.classId) {
            return courses;
        }

        const targetClass = getClassById(form.classId);

        if (!targetClass) {
            return courses;
        }

        const directlyLinked = courses.filter(
            (course) => course.classId === targetClass.id
        );

        if (directlyLinked.length > 0) {
            return directlyLinked;
        }

        return courses.filter(
            (course) =>
                !course.classId &&
                course.semester === targetClass.name
        );
    }, [data.courses, classes, form.classId]);

    /* =====================================================
       CHRONOLOGICAL TIME WINDOWS
       ===================================================== */

    const chronologicalTimeWindows = useMemo<TimeWindow[]>(() => {
        const source =
            activeFilteredSlots.length > 0
                ? activeFilteredSlots
                : data.slots || [];

        const unique = new Map<string, TimeWindow>();

        source.forEach((slot) => {
            if (
                !slot.start ||
                !slot.end ||
                timeToMinutes(slot.start) >= timeToMinutes(slot.end)
            ) {
                return;
            }

            const key = `${slot.start}-${slot.end}`;

            if (!unique.has(key)) {
                unique.set(key, {
                    start: slot.start,
                    end: slot.end,
                });
            }
        });

        if (unique.size === 0) {
            return [
                { start: '09:00', end: '09:45' },
                { start: '09:45', end: '10:30' },
                { start: '10:30', end: '11:15' },
                { start: '11:15', end: '12:00' },
                { start: '12:00', end: '12:45' },
            ];
        }

        return Array.from(unique.values()).sort(
            (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
        );
    }, [activeFilteredSlots, data.slots]);

    /* =====================================================
       FORM HANDLERS
       ===================================================== */

    function updateForm(
        field: keyof TimetableForm,
        value: string | number
    ) {
        if (
            field === 'classId' &&
            value === '__ADD_NEW_CLASS__'
        ) {
            setIsAddClassModalOpen(true);
            return;
        }

        if (
            field === 'courseId' &&
            value === '__ADD_NEW_COURSE__'
        ) {
            if (!form.classId) {
                setConflictError(
                    'Please select a Target Class / Semester first before adding a subject.'
                );
                return;
            }

            setIsQuickCourseModalOpen(true);
            return;
        }

        setForm((previous) => {
            const updated = {
                ...previous,
                [field]: value,
            };

            if (field === 'classId') {
                const targetClass = getClassById(String(value));

                updated.semesterClass = targetClass?.name || '';

                const courses = data.courses || [];

                const linked = courses.filter(
                    (course) => course.classId === String(value)
                );

                const legacy = courses.filter(
                    (course) =>
                        !course.classId &&
                        course.semester === targetClass?.name
                );

                const candidates = linked.length > 0 ? linked : legacy;

                const currentCourseStillValid = candidates.some(
                    (course) => course.id === previous.courseId
                );

                updated.courseId = currentCourseStillValid
                    ? previous.courseId
                    : candidates[0]?.id || '';
            }

            return updated;
        });

        setConflictError(null);
        setSuccessMsg(null);
        setPendingConflict(null);
        setConflictReason('');
        setIsConflictModalOpen(false);
    }

    function resetForm() {
        const selectedClass = selectedClassFilterId
            ? getClassById(selectedClassFilterId)
            : undefined;

        setForm({
            ...emptyForm,
            classId:
                selectedClassFilterId ||
                classes[0]?.id ||
                '',
            semesterClass: selectedClass?.name || '',
        });

        setEditing(false);
        setIsFormOpen(false);
        setConflictError(null);
        setSuccessMsg(null);
        setPendingConflict(null);
        setConflictReason('');
        setIsConflictModalOpen(false);
    }

    function scrollToForm() {
        setTimeout(() => {
            formSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 50);
    }

    function handleOpenNew(
        dayId?: number,
        defaultStart?: string,
        defaultEnd?: string
    ) {
        if (classes.length === 0) {
            setIsNoClassWarningOpen(true);
            return;
        }

        setEditing(false);
        setConflictError(null);
        setSuccessMsg(null);
        setPendingConflict(null);
        setConflictReason('');
        setIsConflictModalOpen(false);

        const targetClassId =
            selectedClassFilterId ||
            classes[0].id;

        const targetClass = getClassById(targetClassId);
        const selectedDay = dayId || 1;

        const dayString =
            selectedDay === 1 ? 'Monday' :
            selectedDay === 2 ? 'Tuesday' :
            selectedDay === 3 ? 'Wednesday' :
            selectedDay === 4 ? 'Thursday' :
            selectedDay === 5 ? 'Friday' :
            selectedDay === 6 ? 'Saturday' : 'Sunday';

        const classDaySlots = (data.slots || []).filter(
            (slot) =>
                slot.day === dayString &&
                slotBelongsToClass(
                    slot,
                    targetClassId,
                    targetClass?.name || ''
                )
        );

        const nextPeriod =
            classDaySlots.length > 0
                ? Math.max(
                    ...classDaySlots.map((slot) =>
                        Number((slot as any).period || 1)
                    )
                ) + 1
                : 1;

        const linkedCourses = data.courses.filter(
            (course) => course.classId === targetClassId
        );

        const legacyCourses = data.courses.filter(
            (course) =>
                !course.classId &&
                course.semester === targetClass?.name
        );

        const courses =
            linkedCourses.length > 0 ? linkedCourses : legacyCourses;

        setForm({
            ...emptyForm,
            day: selectedDay,
            period: nextPeriod,
            start: defaultStart || '09:00',
            end: defaultEnd || '09:45',
            classId: targetClassId,
            semesterClass: targetClass?.name || '',
            courseId:
                courses[0]?.id ||
                data.courses[0]?.id ||
                '',
        });

        setIsFormOpen(true);
        scrollToForm();
    }

    function handleSaveNewClass(event: React.FormEvent) {
        event.preventDefault();

        const name = newClassName.trim();
        const stream = newClassStream.trim();

        if (!name || !stream) return;

        const duplicate = classes.some(
            (item) => item.name.trim().toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
            setSuccessMsg(null);
            setConflictError(`A class / semester named "${name}" already exists.`);
            return;
        }

        const newClass: ClassRecord = {
            id: 'cls_' + Date.now().toString(),
            name,
            stream,
        };

        const updatedData: ProfPlanData = {
            ...data,
            classes: [...data.classes, newClass as never],
        };

        save(updatedData);
        setData(updatedData);

        setSelectedClassFilterId(newClass.id);

        setForm((previous) => ({
            ...previous,
            classId: newClass.id,
            semesterClass: newClass.name,
            courseId: '',
        }));

        setNewClassName('');
        setNewClassStream('Arts Stream');
        setIsAddClassModalOpen(false);
        setConflictError(null);
        setSuccessMsg(`Workspace for ${newClass.name} created successfully!`);
    }

    function handleSaveQuickCourse(event: React.FormEvent) {
        event.preventDefault();

        const subjectName = quickCourse.name.trim();

        if (!subjectName || !form.classId) return;

        const targetClass = getClassById(form.classId);
        const code = quickCourse.code.trim().toUpperCase();

        const duplicate = data.courses.some(
            (course) =>
                course.classId === form.classId &&
                (
                    course.name.trim().toLowerCase() === subjectName.toLowerCase() ||
                    (code && course.code?.trim().toLowerCase() === code.toLowerCase())
                )
        );

        if (duplicate) {
            setConflictError('A subject with the same name or paper code already exists for this class.');
            return;
        }

        const newCourseId = 'course_' + Date.now().toString();

        const newCourse: Course = {
            id: newCourseId,
            name: subjectName,
            code: code || 'SUB-1',
            semester: targetClass?.name || quickCourse.semester || '',
            department: targetClass?.stream || quickCourse.department || 'General',
            hours: 45,
            targetHours: 45,
            classId: targetClass?.id || form.classId,
        };

        const updatedData: ProfPlanData = {
            ...data,
            courses: [...data.courses, newCourse],
        };

        save(updatedData);
        setData(updatedData);

        setForm((previous) => ({
            ...previous,
            courseId: newCourseId,
        }));

        setIsQuickCourseModalOpen(false);
        setQuickCourse({
            name: '',
            code: '',
            semester: '',
            department: 'General',
        });

        setConflictError(null);
        setSuccessMsg(`Subject "${newCourse.name}" created and linked to ${targetClass?.name || 'the class'}!`);
    }

    function findConflict(): Conflict | null {
        const targetClass = getClassById(form.classId);
        const className = targetClass?.name || form.semesterClass || 'Unknown Class';

        const dayString =
            Number(form.day) === 1 ? 'Monday' :
            Number(form.day) === 2 ? 'Tuesday' :
            Number(form.day) === 3 ? 'Wednesday' :
            Number(form.day) === 4 ? 'Thursday' :
            Number(form.day) === 5 ? 'Friday' :
            Number(form.day) === 6 ? 'Saturday' : 'Sunday';

        const otherSlots = (data.slots || []).filter(
            (slot) => slot.id !== form.id && slot.day === dayString
        );

        const sameClassConflict = otherSlots.find(
            (slot) =>
                slotBelongsToClass(slot, form.classId, className) &&
                timesOverlap(form.start, form.end, slot.start, slot.end)
        );

        if (sameClassConflict) {
            return {
                type: 'class',
                slot: sameClassConflict,
                title: 'Class Timetable Clash',
                message: `This class already has another period scheduled during ${formatTimeRange(
                    form.start,
                    form.end
                )}.`,
                className: getSlotClassName(sameClassConflict),
                subject: getSlotCourseName(sameClassConflict),
            };
        }

        const teacherConflict = otherSlots.find(
            (slot) => timesOverlap(form.start, form.end, slot.start, slot.end)
        );

        if (teacherConflict) {
            return {
                type: 'teacher',
                slot: teacherConflict,
                title: 'Teacher Timetable Conflict',
                message: `You already have another class scheduled during ${formatTimeRange(
                    form.start,
                    form.end
                )}.`,
                className: getSlotClassName(teacherConflict),
                subject: getSlotCourseName(teacherConflict),
            };
        }

        return null;
    }

    function openConflictReview(conflict: Conflict) {
        setPendingConflict(conflict);
        setConflictReason('');
        setIsConflictModalOpen(true);
    }

    function saveTimetablePeriod(savedConflictReason?: string) {
        const selectedCourse = data.courses.find(
            (course) => course.id === form.courseId
        );

        const targetClass = getClassById(form.classId);

        if (!selectedCourse) {
            setConflictError('Please select a valid subject / paper.');
            return;
        }

        if (!targetClass) {
            setConflictError('Please select a valid class / semester.');
            return;
        }

        const existingSlot = data.slots.find((slot) => slot.id === form.id);

        const reason =
            savedConflictReason !== undefined
                ? savedConflictReason.trim()
                : (existingSlot as any)?.conflictReason || '';

        const dayValue: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday" =
            Number(form.day) === 1 ? "Monday" :
            Number(form.day) === 2 ? "Tuesday" :
            Number(form.day) === 3 ? "Wednesday" :
            Number(form.day) === 4 ? "Thursday" :
            Number(form.day) === 5 ? "Friday" :
            Number(form.day) === 6 ? "Saturday" : "Sunday";

        const newSlot: Slot = {
            id: editing && form.id ? form.id : 'slot_' + Date.now().toString(),
            day: dayValue,
            start: form.start,
            end: form.end,
            classId: form.classId,
            courseId: form.courseId,
            room: form.room.trim() || 'General',
        };

        (newSlot as any).semesterClass = targetClass.name;
        (newSlot as any).period = Math.max(1, Number(form.period) || 1);

        if (reason) {
            (newSlot as any).conflictReason = reason;
        }

        const updatedSlots = editing
            ? data.slots.map((slot) => (slot.id === form.id ? newSlot : slot))
            : [...data.slots, newSlot];

        const updatedData: ProfPlanData = {
            ...data,
            slots: updatedSlots,
        };

        save(updatedData);
        setData(updatedData);

        setSuccessMsg(
            editing
                ? 'Timetable updated successfully.'
                : 'Period successfully scheduled.'
        );

        setForm({
            ...emptyForm,
            classId: selectedClassFilterId || targetClass.id,
            semesterClass: selectedClassFilterId
                ? getClassById(selectedClassFilterId)?.name || ''
                : targetClass.name,
        });

        setEditing(false);
        setIsFormOpen(false);
        setConflictError(null);
        setPendingConflict(null);
        setConflictReason('');
        setIsConflictModalOpen(false);
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        setConflictError(null);
        setSuccessMsg(null);

        if (!form.classId || !form.courseId) {
            setConflictError('Please select a Class and Subject/Course.');
            return;
        }

        if (!Number.isInteger(Number(form.period)) || Number(form.period) < 1) {
            setConflictError('Period number must be 1 or greater.');
            return;
        }

        const startMin = timeToMinutes(form.start);
        const endMin = timeToMinutes(form.end);

        if (startMin >= endMin) {
            setConflictError('End time must be later than start time.');
            return;
        }

        const conflict = findConflict();

        if (conflict) {
            setConflictError(conflict.message);
            setPendingConflict(conflict);
            return;
        }

        saveTimetablePeriod();
    }

    function handleProceedAfterConflict() {
        if (!pendingConflict) return;
        const reason = conflictReason.trim();
        if (!reason) return;
        saveTimetablePeriod(reason);
    }

    function editSlot(slot: Slot) {
        const targetClass = getClassById(slot.classId);

        const numericDay =
            slot.day === 'Monday' ? 1 :
            slot.day === 'Tuesday' ? 2 :
            slot.day === 'Wednesday' ? 3 :
            slot.day === 'Thursday' ? 4 :
            slot.day === 'Friday' ? 5 :
            slot.day === 'Saturday' ? 6 : 7;

        setForm({
            id: slot.id,
            day: numericDay,
            period: Number((slot as any).period || 1),
            start: slot.start,
            end: slot.end,
            classId: targetClass?.id || slot.classId || '',
            courseId: slot.courseId,
            semesterClass: (slot as any).semesterClass || targetClass?.name || '',
            room: slot.room || '',
        });

        setEditing(true);
        setIsFormOpen(true);
        setConflictError(null);
        setSuccessMsg(null);
        setPendingConflict(null);
        setConflictReason('');
        setIsConflictModalOpen(false);
        scrollToForm();
    }

    function deleteSlot(slotId: string) {
        const slot = data.slots.find((item) => item.id === slotId);
        if (!slot) return;

        const subject = getSlotCourseName(slot);

        if (!window.confirm(`Remove "${subject}" from this timetable period?`)) {
            return;
        }

        const updatedData: ProfPlanData = {
            ...data,
            slots: data.slots.filter((item) => item.id !== slotId),
        };

        save(updatedData);
        setData(updatedData);
        setSuccessMsg('Timetable period removed successfully.');
    }

    function handleDeleteClass(classId: string, className: string) {
        const relatedSlots = data.slots.filter((slot) =>
            slotBelongsToClass(slot, classId, className)
        );

        if (
            !window.confirm(
                `Are you sure you want to delete class "${className}"? This will also remove ${relatedSlots.length} associated timetable period(s).`
            )
        ) {
            return;
        }

        const updatedClasses = data.classes.filter((item) => item.id !== classId);
        const updatedSlots = data.slots.filter(
            (slot) => !slotBelongsToClass(slot, classId, className)
        );

        const updatedData: ProfPlanData = {
            ...data,
            classes: updatedClasses,
            slots: updatedSlots,
        };

        save(updatedData);
        setData(updatedData);

        if (selectedClassFilterId === classId) {
            setSelectedClassFilterId(null);
        }

        setSuccessMsg(`Class "${className}" and its timetable entries were removed.`);
    }

    function getSlotsForTimeWindow(
        dayId: number,
        start: string,
        end: string
    ): Slot[] {
        const dayString =
            dayId === 1 ? 'Monday' :
            dayId === 2 ? 'Tuesday' :
            dayId === 3 ? 'Wednesday' :
            dayId === 4 ? 'Thursday' :
            dayId === 5 ? 'Friday' :
            dayId === 6 ? 'Saturday' : 'Sunday';

        return activeFilteredSlots
            .filter(
                (slot) =>
                    slot.day === dayString &&
                    slot.start === start &&
                    slot.end === end
            )
            .sort(
                (a, b) =>
                    Number((a as any).period || 1) -
                    Number((b as any).period || 1)
            );
    }

    function getCourse(courseId: string): Course | undefined {
        return data.courses.find((course) => course.id === courseId);
    }

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading Weekly Time Table...
                </div>
            </div>
        );
    }

    const hasClasses = classes.length > 0;
    const activeSelectedClassObj = selectedClassFilterId
        ? getClassById(selectedClassFilterId)
        : undefined;

    return (
        <div className="space-y-5 pb-16 max-w-7xl mx-auto px-4 sm:px-6 pt-2">

            {/* HERO BANNER WITH COMPACT BACK ACTION */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 sm:p-7 text-white shadow-xl">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Link
                                href="/today"
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-blue-200 hover:bg-white/20 hover:text-white transition backdrop-blur-sm"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Today Dashboard</span>
                            </Link>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-bold text-blue-300">Routine Management</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Weekly Time Table
                        </h1>

                        <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
                            Manage all weekly lectures and focus on specific classes instantly.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (isFormOpen) {
                                    resetForm();
                                } else {
                                    handleOpenNew();
                                }
                            }}
                            className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition transform active:scale-95 w-full sm:w-auto ${
                                isFormOpen
                                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'
                                    : 'bg-amber-300 hover:bg-amber-400 text-slate-950 ring-4 ring-amber-300/30'
                            }`}
                        >
                            {isFormOpen ? (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Close Form
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 text-slate-950" />
                                    ADD PERIODS TO TIMETABLE
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* FILTER DECK */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setIsClassesCardsOpen(!isClassesCardsOpen)}
                        className="flex items-center gap-2.5 text-left group focus:outline-none"
                    >
                        <div className="p-2 bg-blue-100 text-blue-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                            <Layers className="w-4 h-4" />
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition flex items-center gap-2">
                                Class Filtering &amp; Selection
                                {isClassesCardsOpen ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </h3>

                            <p className="text-[11px] text-slate-500">
                                {selectedClassFilterId
                                    ? `Active filter: ${activeSelectedClassObj?.name || ''}`
                                    : 'Master View (All Classes shown)'} — Click to toggle class cards
                            </p>
                        </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedClassFilterId(null)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                                selectedClassFilterId === null
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                        >
                            ⭐ All Classes
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {isFilterExpanded ? 'Hide Filter' : 'Advanced Filter & Sort'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (isFormOpen) {
                                    resetForm();
                                } else {
                                    handleOpenNew();
                                }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
                        >
                            <Plus className="w-3.5 h-3.5 text-white" />
                            Add Periods
                        </button>
                    </div>
                </div>

                {isFilterExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search classes by name or stream..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                Sort By:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as 'name' | 'stream')}
                                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="name">Class Name (A-Z)</option>
                                <option value="stream">Stream / Department</option>
                            </select>
                        </div>
                    </div>
                )}

                {isClassesCardsOpen && (
                    <div className="pt-2 animate-in fade-in duration-200">
                        {!hasClasses ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-between">
                                <span>No classes configured yet.</span>
                                <button
                                    type="button"
                                    onClick={() => setIsAddClassModalOpen(true)}
                                    className="underline text-blue-600"
                                >
                                    Setup Classes
                                </button>
                            </div>
                        ) : filteredClasses.length === 0 ? (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600">
                                No class matches your search.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {filteredClasses.map((cls, index) => {
                                    const isSelected = selectedClassFilterId === cls.id;
                                    const palette = CARD_PALETTES[index % CARD_PALETTES.length];

                                    return (
                                        <div
                                            key={cls.id}
                                            className={`group relative overflow-hidden rounded-2xl p-3.5 text-left transition transform hover:-translate-y-0.5 shadow-sm hover:shadow-md ${palette.bg} ${
                                                isSelected
                                                    ? 'ring-4 ring-blue-900/30 scale-[1.02]'
                                                    : 'opacity-90 hover:opacity-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${palette.badge}`}>
                                                    {cls.stream || 'General'}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleDeleteClass(cls.id, cls.name);
                                                    }}
                                                    className="p-1 rounded-lg bg-black/20 hover:bg-rose-600 text-white transition"
                                                    title="Delete Class"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedClassFilterId(cls.id)}
                                                className="w-full text-left focus:outline-none"
                                            >
                                                <div className={`text-sm font-black tracking-tight ${palette.text}`}>
                                                    {cls.name}
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* FORM */}
            {isFormOpen && (
                <section
                    ref={formSectionRef}
                    className="overflow-hidden rounded-3xl border-2 border-blue-600/30 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-150 scroll-mt-6"
                >
                    <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl font-black ${
                                editing ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                                {editing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>

                            <div>
                                <h2 className="text-sm font-black text-slate-900">
                                    {editing ? 'Modify Class Period' : 'Assign Period'}
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    Link subjects and timings to schedule
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={resetForm}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {conflictError && (
                        <button
                            type="button"
                            onClick={() => {
                                if (pendingConflict) {
                                    openConflictReview(pendingConflict);
                                }
                            }}
                            className={`mx-6 mt-4 w-[calc(100%-3rem)] text-left p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 hover:bg-rose-100 hover:border-rose-300 transition ${
                                pendingConflict ? 'cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="font-bold">{conflictError}</span>
                            {pendingConflict && (
                                <span className="ml-auto shrink-0 text-[10px] font-black uppercase text-rose-700 underline">
                                    Review Conflict
                                </span>
                            )}
                        </button>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Target Class / Semester *
                                </label>
                                <select
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    value={form.classId}
                                    onChange={(event) => updateForm('classId', event.target.value)}
                                    required
                                >
                                    <option value="">Select class...</option>
                                    {classes.map((cls) => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name}
                                            {cls.stream ? ` (${cls.stream})` : ''}
                                        </option>
                                    ))}
                                    <option value="__ADD_NEW_CLASS__" className="font-bold text-blue-600 bg-blue-50">
                                        + Add Class / Semester...
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Day of Week *
                                </label>
                                <select
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    value={form.day}
                                    onChange={(event) => updateForm('day', Number(event.target.value))}
                                >
                                    {days.map((day) => (
                                        <option key={day.id} value={day.id}>
                                            {day.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Period Sequence *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={form.period}
                                    onChange={(event) => updateForm('period', Number(event.target.value))}
                                    required
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Subject / Paper *
                                </label>
                                <select
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    value={form.courseId}
                                    onChange={(event) => updateForm('courseId', event.target.value)}
                                    required
                                >
                                    <option value="">Select subject paper...</option>
                                    {availableCoursesForForm.map((course) => (
                                        <option key={course.id} value={course.id}>
                                            {course.name}
                                            {course.code ? ` (${course.code})` : ''}
                                        </option>
                                    ))}
                                    <option value="__ADD_NEW_COURSE__" className="font-bold text-blue-600 bg-blue-50">
                                        + Add Subject / Paper...
                                    </option>
                                </select>

                                {form.classId && availableCoursesForForm.length === 0 && (
                                    <p className="mt-1.5 text-[10px] font-bold text-amber-700">
                                        No subject is linked to this class yet. Use “Add Subject / Paper...” to create one.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Start Time *
                                </label>
                                <Time12Input
                                    value={form.start}
                                    onChange={(value) => updateForm('start', value)}
                                />
                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-black text-blue-700">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTime12Hour(form.start)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    End Time *
                                </label>
                                <Time12Input
                                    value={form.end}
                                    onChange={(value) => updateForm('end', value)}
                                />
                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-black text-blue-700">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTime12Hour(form.end)}</span>
                                </div>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Room / Lecture Hall
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Room 12 / Seminar Hall"
                                    value={form.room}
                                    onChange={(event) => updateForm('room', event.target.value)}
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-700" />
                                    <span className="text-xs font-black text-blue-900">Scheduled Time</span>
                                    <span className="text-xs font-bold text-slate-700">
                                        {formatTimeRange(form.start, form.end)}
                                    </span>
                                </div>

                                <span className="text-xs font-black text-blue-800">
                                    Duration: {formatDuration(form.start, form.end)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md"
                            >
                                {editing ? 'Update Period' : 'Assign to Timetable'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* SUCCESS NOTIFICATION */}
            {successMsg && !isFormOpen && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">{successMsg}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSuccessMsg(null)}
                        className="text-emerald-700 font-bold hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* MASTER GRID */}
            <section className="overflow-hidden rounded-3xl border border-blue-900/20 bg-white shadow-md">
                <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-blue-200" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Showing Timetable for:{' '}
                            <strong className="text-amber-300">
                                {activeSelectedClassObj?.name || 'All Classes (Master View)'}
                            </strong>
                        </span>
                    </div>

                    <span className="text-[11px] font-bold text-blue-200 bg-blue-950 px-2.5 py-1 rounded-lg">
                        {activeFilteredSlots.length} Booked Periods
                    </span>
                </div>

                {/* MOBILE DAY SELECTOR TABS */}
                <div className="flex md:hidden overflow-x-auto bg-slate-900 p-2 gap-1.5 border-b border-blue-950 scrollbar-none">
                    {days.map((day) => {
                        const isSelected = day.id === mobileActiveDayId;
                        const isToday = day.id === currentDayId;

                        return (
                            <button
                                key={day.id}
                                ref={(el) => { dayTabRefs.current[day.id] = el; }}
                                type="button"
                                onClick={() => handleSelectMobileDay(day.id)}
                                className={`flex-1 min-w-[76px] py-2 px-3 rounded-xl text-center transition-all font-black text-xs shrink-0 ${
                                    isSelected
                                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-105'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                                }`}
                            >
                                <div className="text-[9px] uppercase tracking-wider">{day.short}</div>
                                <div className="text-xs mt-0.5">{day.name.slice(0, 3)}</div>
                                {isToday && <span className="block text-[8px] text-amber-300 font-bold">TODAY</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="overflow-x-auto">
                    {/* DESKTOP / TABLET MULTI-COLUMN GRID */}
                    <div className="hidden md:block w-full min-w-[1100px]">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="border-b-2 border-blue-950 bg-blue-950 text-blue-50">
                                    <th className="sticky left-0 z-30 w-44 border-r border-blue-900 bg-blue-950 px-4 py-4 text-left">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                                            Time Window
                                        </div>
                                        <div className="mt-0.5 text-xs font-black text-white">
                                            Clock Timing
                                        </div>
                                    </th>

                                    {days.map((day) => {
                                        const isToday = day.id === currentDayId;

                                        return (
                                            <th
                                                key={day.id}
                                                className={`border-r border-blue-900/80 px-3 py-4 text-center ${
                                                    isToday
                                                        ? 'bg-blue-900 text-white'
                                                        : 'bg-blue-950 text-blue-100'
                                                }`}
                                            >
                                                <div className="text-[11px] font-black tracking-widest uppercase text-blue-200">
                                                    {day.short}
                                                </div>
                                                <div className="mt-0.5 text-sm font-black text-white">
                                                    {day.name}
                                                </div>
                                                {isToday && (
                                                    <div className="mt-1 inline-block rounded-full bg-amber-300 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-950">
                                                        TODAY
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                                {chronologicalTimeWindows.map((window, index) => {
                                    const duration = formatDuration(window.start, window.end);

                                    return (
                                        <tr key={`${window.start}-${window.end}-${index}`}>
                                            <td
                                                onClick={() =>
                                                    handleOpenNew(
                                                        currentDayId || 1,
                                                        window.start,
                                                        window.end
                                                    )
                                                }
                                                className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 hover:bg-blue-50/60 px-4 py-4 align-top shadow-sm cursor-pointer transition group"
                                            >
                                                <div className="font-black text-sm text-slate-900 flex items-center gap-1.5 group-hover:text-blue-700">
                                                    <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                                    {formatTimeRange(window.start, window.end)}
                                                </div>

                                                <div className="mt-1 text-[11px] font-bold text-slate-500">
                                                    {duration}
                                                </div>

                                                <span className="mt-1.5 inline-block text-[9px] font-bold text-blue-600 group-hover:underline">
                                                    + Add Period
                                                </span>
                                            </td>

                                            {days.map((day) => {
                                                const matchingSlots = getSlotsForTimeWindow(
                                                    day.id,
                                                    window.start,
                                                    window.end
                                                );

                                                const isToday = day.id === currentDayId;

                                                if (matchingSlots.length === 0) {
                                                    return (
                                                        <td
                                                            key={day.id}
                                                            onClick={() =>
                                                                handleOpenNew(
                                                                    day.id,
                                                                    window.start,
                                                                    window.end
                                                                )
                                                            }
                                                            className={`border-r border-slate-200 p-2.5 align-top cursor-pointer group transition ${
                                                                isToday ? 'bg-blue-50/40' : 'bg-white'
                                                            } hover:bg-blue-50/60`}
                                                        >
                                                            <div className="flex min-h-[140px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-blue-300 bg-slate-50/40 group-hover:bg-blue-50/50 transition">
                                                                <div className="text-center">
                                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mx-auto transition" />
                                                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-700 uppercase tracking-wider mt-1 block">
                                                                        + Tap to schedule
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td
                                                        key={day.id}
                                                        className={`border-r border-slate-200 p-2.5 align-top ${
                                                            isToday ? 'bg-blue-50/50' : 'bg-white'
                                                        }`}
                                                    >
                                                        <div className="space-y-2">
                                                            {matchingSlots.map((slot) => {
                                                                const course = getCourse(slot.courseId);

                                                                return (
                                                                    <div
                                                                        key={slot.id}
                                                                        className="group min-h-[140px] rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 p-3 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                                                                    >
                                                                        <div>
                                                                            <div className="flex items-start justify-between gap-1">
                                                                                <span className="px-2 py-0.5 rounded-md bg-blue-950 text-white font-black text-[10px]">
                                                                                    P {(slot as any).period}
                                                                                </span>

                                                                                {course?.code && (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px]">
                                                                                        {course.code}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <h3 className="mt-1.5 text-xs font-black text-slate-900 leading-tight break-words">
                                                                                {course?.name || 'Subject'}
                                                                            </h3>

                                                                            <div className="mt-1.5 text-[11px] font-semibold text-slate-600">
                                                                                <div className="text-[10px] font-bold text-blue-800">
                                                                                    {(slot as any).semesterClass}
                                                                                </div>

                                                                                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1">
                                                                                    <Clock className="w-3 h-3 text-blue-500" />
                                                                                    {formatTimeRange(slot.start, slot.end)}
                                                                                </div>

                                                                                <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                                    {slot.room}
                                                                                </div>

                                                                                {(slot as any).conflictReason && (
                                                                                    <div
                                                                                        title={(slot as any).conflictReason}
                                                                                        className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[9px] font-bold text-amber-800"
                                                                                    >
                                                                                        Conflict override recorded
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-2.5 flex gap-1.5 border-t border-slate-100 pt-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => editSlot(slot)}
                                                                                className="flex-1 rounded-lg border border-blue-200 bg-blue-50/80 py-1 text-[11px] font-extrabold text-blue-800 hover:bg-blue-600 hover:text-white transition"
                                                                            >
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => deleteSlot(slot.id)}
                                                                                className="flex-1 rounded-lg border border-rose-200 bg-rose-50/80 py-1 text-[11px] font-extrabold text-rose-700 hover:bg-rose-600 hover:text-white transition"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE SINGLE-DAY FOCUSED VIEW */}
                    <div className="block md:hidden p-4 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Viewing Schedule For</span>
                                <span className="text-base font-black text-blue-950">
                                    {days.find(d => d.id === mobileActiveDayId)?.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleOpenNew(mobileActiveDayId, '09:00', '09:45')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-black text-xs shadow"
                            >
                                <Plus className="w-4 h-4" /> Add Period
                            </button>
                        </div>

                        {chronologicalTimeWindows.map((window, index) => {
                            const matchingSlots = getSlotsForTimeWindow(mobileActiveDayId, window.start, window.end);
                            const duration = formatDuration(window.start, window.end);

                            return (
                                <div key={`mob-${index}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                                            {formatTimeRange(window.start, window.end)}
                                            <span className="text-[10px] text-slate-400 font-bold">({duration})</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenNew(mobileActiveDayId, window.start, window.end)}
                                            className="text-[10px] font-extrabold text-blue-600 hover:underline"
                                        >
                                            + Schedule Here
                                        </button>
                                    </div>

                                    {matchingSlots.length === 0 ? (
                                        <div
                                            onClick={() => handleOpenNew(mobileActiveDayId, window.start, window.end)}
                                            className="py-4 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
                                        >
                                            <span className="text-xs font-bold text-slate-400">+ Tap to schedule class for this slot</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {matchingSlots.map((slot) => {
                                                const course = getCourse(slot.courseId);
                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 p-3.5 shadow-sm space-y-2"
                                                    >
                                                        <div className="flex items-start justify-between gap-1">
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-950 text-white font-black text-[10px]">
                                                                Period {(slot as any).period}
                                                            </span>
                                                            {course?.code && (
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px]">
                                                                    {course.code}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3 className="text-sm font-black text-slate-900">
                                                                {course?.name || 'Subject'}
                                                            </h3>
                                                            <p className="text-xs font-bold text-blue-800 mt-0.5">
                                                                {(slot as any).semesterClass}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 text-slate-400" /> {slot.room}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => editSlot(slot)}
                                                                className="flex-1 rounded-xl border border-blue-200 bg-blue-50 py-1.5 text-xs font-extrabold text-blue-800 hover:bg-blue-600 hover:text-white transition"
                                                            >
                                                                Edit Period
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteSlot(slot.id)}
                                                                className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-extrabold text-rose-700 hover:bg-rose-600 hover:text-white transition"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CONFLICT REVIEW MODAL */}
            {isConflictModalOpen && pendingConflict && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsConflictModalOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    {pendingConflict.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Please review the overlapping timetable entry.
                                </p>
                            </div>
                        </div>

                        <div className="py-4 space-y-3">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-black text-amber-900">
                                    {pendingConflict.message}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Existing Subject
                                    </span>
                                    <div className="text-sm font-black text-slate-900">
                                        {pendingConflict.subject}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Existing Class
                                    </span>
                                    <div className="text-sm font-bold text-blue-800">
                                        {pendingConflict.className}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Existing Time
                                    </span>
                                    <div className="text-sm font-bold text-slate-700">
                                        {formatTimeRange(
                                            pendingConflict.slot.start,
                                            pendingConflict.slot.end
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        New Period
                                    </span>
                                    <div className="text-sm font-bold text-slate-700">
                                        {formatTimeRange(form.start, form.end)}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Reason for Conflict *
                                </label>
                                <textarea
                                    autoFocus
                                    rows={3}
                                    value={conflictReason}
                                    onChange={(event) => setConflictReason(event.target.value)}
                                    placeholder="e.g. Combined class, special arrangement, examination duty, temporary adjustment..."
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                                />
                                <p className="mt-1.5 text-[10px] text-slate-500">
                                    A reason is required before this conflict can be overridden. It will be stored with the timetable entry.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConflictModalOpen(false);
                                    setConflictReason('');
                                }}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={!conflictReason.trim()}
                                onClick={handleProceedAfterConflict}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95 ${
                                    conflictReason.trim()
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Proceed &amp; Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NO CLASS WARNING */}
            {isNoClassWarningOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Missing Class Workspace
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    You need to set up a class first.
                                </p>
                            </div>
                        </div>

                        <div className="py-4">
                            <p className="text-sm text-slate-700 font-medium">
                                To assign periods to your timetable, you must first create at least one Class or Semester workspace.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsNoClassWarningOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsNoClassWarningOpen(false);
                                    setIsAddClassModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Add Class Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD CLASS MODAL */}
            {isAddClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsAddClassModalOpen(false);
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
                                onClick={() => setIsAddClassModalOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewClass} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Class / Semester Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Class 6, Semester 1"
                                    value={newClassName}
                                    onChange={(event) => setNewClassName(event.target.value)}
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
                                    value={newClassStream}
                                    onChange={(event) => setNewClassStream(event.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="General / Academic">General / Academic</option>
                                    <option value="Arts Stream">Arts Stream</option>
                                    <option value="Science Stream">Science Stream</option>
                                    <option value="Commerce Stream">Commerce Stream</option>
                                    <option value="Vocational">Vocational</option>
                                    <option value="Other / Custom">Other / Custom</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddClassModalOpen(false)}
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

            {/* QUICK SUBJECT MODAL */}
            {isQuickCourseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-7 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-900" />
                                <h3 className="text-base font-black text-slate-900">
                                    Quick Add Subject
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsQuickCourseModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveQuickCourse} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Subject Title *
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Mathematics"
                                    value={quickCourse.name}
                                    onChange={(event) =>
                                        setQuickCourse((previous) => ({
                                            ...previous,
                                            name: event.target.value,
                                        }))
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Paper Code *
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. MATH-101"
                                    value={quickCourse.code}
                                    onChange={(event) =>
                                        setQuickCourse((previous) => ({
                                            ...previous,
                                            code: event.target.value,
                                        }))
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickCourseModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md"
                                >
                                    Save Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

/* =========================================================
   PAGE WRAPPER
   ========================================================= */

export default function TimetablePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                    <div className="text-sm font-bold text-slate-500 animate-pulse">
                        Loading Weekly Time Table...
                    </div>
                </div>
            }
        >
            <TimetableContent />
        </Suspense>
    );
}