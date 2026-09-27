'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
} from 'lucide-react';

/* =========================================================
   ACADEMIC HIERARCHY
   ---------------------------------------------------------
   Deliberately uses word boundaries so:

   Class I   != Class IX
   Class XI  != Class I
   Class XII != Class II
   ========================================================= */

function getHierarchyRank(className: string = ''): number {
    const lower = String(className || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    if (
        /\bclass\s+(i|ii|iii|iv|v)\b/.test(lower) ||
        /\bprimary\b/.test(lower)
    ) {
        return 1;
    }

    if (
        /\bclass\s+(vi|vii|viii)\b/.test(lower) ||
        /\bupper\s+primary\b/.test(lower) ||
        /\bme\s+level\b/.test(lower)
    ) {
        return 2;
    }

    if (
        /\bclass\s+(ix|x)\b/.test(lower) ||
        /\bsecondary\b/.test(lower) ||
        /\bhigh\s+school\b/.test(lower)
    ) {
        return 3;
    }

    if (
        /\+2\b/.test(lower) ||
        /\bhigher\s+secondary\b/.test(lower) ||
        /\bclass\s+(xi|xii)\b/.test(lower) ||
        /\bxi\b/.test(lower) ||
        /\bxii\b/.test(lower) ||
        /\bjunior\s+college\b/.test(lower)
    ) {
        return 4;
    }

    if (
        /\bug\b/.test(lower) ||
        /\bsemester\b/.test(lower) ||
        /\bba\b/.test(lower) ||
        /\bbsc\b/.test(lower) ||
        /\bbcom\b/.test(lower) ||
        /\bundergraduate\b/.test(lower)
    ) {
        return 5;
    }

    if (
        /\bpg\b/.test(lower) ||
        /\bmaster\b/.test(lower) ||
        /\bpostgraduate\b/.test(lower)
    ) {
        return 6;
    }

    return 7;
}

function sortClassesByHierarchy(classesList: ProfPlanData['classes']) {
    if (!Array.isArray(classesList)) return [];

    return [...classesList].sort((a, b) => {
        const nameA = String(a?.name || '');
        const nameB = String(b?.name || '');

        const rankA = getHierarchyRank(nameA);
        const rankB = getHierarchyRank(nameB);

        if (rankA !== rankB) {
            return rankA - rankB;
        }

        return nameA.localeCompare(nameB, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });
}

/* =========================================================
   TODAY-PAGE EXTENDED TYPES
   ---------------------------------------------------------
   We intentionally keep these local.
   No changes to types.ts are required.
   ========================================================= */

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
    customSubjectName?: string;
};

type TodaySlot = ProfPlanData['slots'][number] & {
    period?: number;
    semesterClass?: string;
};

type TodayHoliday = ProfPlanData['holidays'][number] & {
    type?: string;
};

/* =========================================================
   STATUS HELPERS
   ========================================================= */

type DisplayStatus =
    | 'Taken'
    | 'Compensated'
    | 'Cancelled'
    | 'Unknown';

function getNormalizedStatus(log: TodayLog): DisplayStatus {
    const status = String(log.status || '').trim().toLowerCase();
    const legacy = String(log.legacyStatus || '').trim().toLowerCase();

    if (
        status === 'cancelled' ||
        status === 'canceled' ||
        legacy === 'cancelled' ||
        legacy === 'canceled'
    ) {
        return 'Cancelled';
    }

    if (
        status === 'partial' ||
        status === 'compensated' ||
        legacy === 'compensated'
    ) {
        return 'Compensated';
    }

    if (
        status === 'completed' ||
        status === 'taken' ||
        legacy === 'taken'
    ) {
        return 'Taken';
    }

    return 'Unknown';
}

function isTeachingCompleted(log: TodayLog): boolean {
    const normalized = getNormalizedStatus(log);

    return (
        normalized === 'Taken' ||
        normalized === 'Compensated'
    );
}

function isCancelledLog(log: TodayLog): boolean {
    return getNormalizedStatus(log) === 'Cancelled';
}

function getStatusLabel(log: TodayLog): string {
    const normalized = getNormalizedStatus(log);

    if (normalized === 'Unknown') {
        return log.status || log.legacyStatus || 'Recorded';
    }

    return normalized;
}

/* =========================================================
   TIME HELPER
   ========================================================= */

function timeToMinutes(timeStr?: string): number {
    if (!timeStr) return Number.MAX_SAFE_INTEGER;

    const value = String(timeStr).trim();

    const match = value.match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return Number.MAX_SAFE_INTEGER;
    }

    return hours * 60 + minutes;
}

/* =========================================================
   SAFE ID HELPER
   ========================================================= */

function createLocalId(prefix: string): string {
    return (
        prefix +
        '_' +
        Date.now() +
        '_' +
        Math.random().toString(36).slice(2, 9)
    );
}

/* =========================================================
   COMPONENT
   ========================================================= */

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

    /* =====================================================
       ADD CLASS FORM
       ===================================================== */

    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts Stream');
    const [customStreamInput, setCustomStreamInput] = useState('');
    const [classSaveMessage, setClassSaveMessage] = useState<string | null>(
        null
    );

    const classNameInputRef = useRef<HTMLInputElement>(null);

    /* =====================================================
       INLINE EDIT
       ===================================================== */

    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassNameVal, setEditClassNameVal] = useState('');
    const [editClassStreamVal, setEditClassStreamVal] = useState('');

    const editClassInputRef = useRef<HTMLInputElement>(null);

    /* =====================================================
       QUICK LOG
       ===================================================== */

    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [topicCovered, setTopicCovered] = useState('');
    const [attendance, setAttendance] = useState('');

    const [status, setStatus] = useState<
        'Taken' | 'Compensated' | 'Cancelled'
    >('Taken');

    const [remarks, setRemarks] = useState('');

    const [currentDate, setCurrentDate] = useState(() => new Date());

    /* =====================================================
       DERIVED LOGS
       ===================================================== */

    const todayLogs = useMemo(
        () => (Array.isArray(d.logs) ? d.logs : []) as TodayLog[],
        [d.logs]
    );

    /* =====================================================
       LOAD / REFRESH
       ===================================================== */

    useEffect(() => {
        setMounted(true);

        const refresh = () => {
            try {
                const updated = load();

                if (updated) {
                    const normalized: ProfPlanData = {
                        ...updated,
                        classes: sortClassesByHierarchy(
                            updated.classes || []
                        ),
                    };

                    setD(normalized);
                }
            } catch (err) {
                console.error('Failed to refresh ProfPlan data:', err);
                setErrorMessage(
                    'Could not refresh local session data.'
                );
            }
        };

        try {
            refresh();
        } catch (err) {
            console.error('Failed to load local store data:', err);
            setErrorMessage(
                'Could not load local session data. Please check your storage settings.'
            );
        }

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

    /* =====================================================
       ESCAPE KEY FOR MODALS
       ===================================================== */

    useEffect(() => {
        if (!isAddClassModalOpen && !activeSlot) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            if (activeSlot) {
                setActiveSlot(null);
                return;
            }

            if (isAddClassModalOpen) {
                setIsAddClassModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isAddClassModalOpen, activeSlot]);

    /* =====================================================
       DATE / DAY
       ===================================================== */

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

    /* =====================================================
       HOLIDAY
       ===================================================== */

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

    /* =====================================================
       INSTITUTIONAL NON-INSTRUCTIONAL RECORD
       -----------------------------------------------------
       We identify these records by classType/classSource,
       NOT by remarks text.
       ===================================================== */

    const existingSuspensionLog = useMemo<TodayLog | null>(() => {
        return (
            todayLogs.find(
                (log) =>
                    log.date === todayDateStr &&
                    (
                        log.classType ===
                            'Non-Instructional / Suspension' ||
                        log.classSource === 'Institutional Notice'
                    )
            ) || null
        );
    }, [todayLogs, todayDateStr]);

    /* =====================================================
       SETUP
       ===================================================== */

    const needsSetup = useMemo(() => {
        return !Array.isArray(d.classes) || d.classes.length === 0;
    }, [d.classes]);

    const handleProtectedAction = (action: () => void) => {
        if (needsSetup) {
            setShowOnboarding(true);
        } else {
            action();
        }
    };

    /* =====================================================
       ADD CLASS MODAL
       -----------------------------------------------------
       Important: this button can bootstrap the workspace.
       Therefore it opens even when there are zero classes.
       ===================================================== */

    const openAddClassModal = () => {
        setNewClassName('');
        setNewClassStream('Arts Stream');
        setCustomStreamInput('');
        setClassSaveMessage(null);
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
        setClassSaveMessage(null);
        setEditingClassId(null);
    };

    /* =====================================================
       ADD CLASS
       ===================================================== */

    const handleSaveNewClass = (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const className = newClassName.trim();

        const resolvedStream =
            newClassStream === 'Other / Custom'
                ? customStreamInput.trim()
                : newClassStream.trim();

        if (!className) {
            setErrorMessage('Please enter a Class / Semester name.');
            return;
        }

        if (!resolvedStream) {
            setErrorMessage('Please enter or select a Stream / Faculty.');
            return;
        }

        const duplicateExists = (d.classes || []).some(
            (c) =>
                String(c.name || '')
                    .trim()
                    .toLowerCase() === className.toLowerCase() &&
                String(c.stream || '')
                    .trim()
                    .toLowerCase() === resolvedStream.toLowerCase()
        );

        if (duplicateExists) {
            setErrorMessage(
                'This Class / Semester with the same Stream / Faculty is already registered.'
            );
            return;
        }

        try {
            const newClassObj: ProfPlanData['classes'][number] = {
                id: createLocalId('cls'),
                name: className,
                stream: resolvedStream,
            };

            const updatedClasses = sortClassesByHierarchy([
                ...(d.classes || []),
                newClassObj,
            ]);

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

            setClassSaveMessage(
                `✓ Success! "${className}" (${resolvedStream}) has been added and arranged in academic hierarchy.`
            );

            window.setTimeout(() => {
                classNameInputRef.current?.focus();
            }, 50);
        } catch (err) {
            console.error('Failed to save class:', err);
            setErrorMessage('Failed to save class to storage.');
        }
    };

    /* =====================================================
       EDIT CLASS
       ===================================================== */

    const handleStartEditClass = (
        cls: ProfPlanData['classes'][number]
    ) => {
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
            setErrorMessage(
                'Class name and stream cannot be empty.'
            );
            return;
        }

        const duplicateExists = (d.classes || []).some(
            (c) =>
                c.id !== clsId &&
                String(c.name || '')
                    .trim()
                    .toLowerCase() === trimmedName.toLowerCase() &&
                String(c.stream || '')
                    .trim()
                    .toLowerCase() === trimmedStream.toLowerCase()
        );

        if (duplicateExists) {
            setErrorMessage(
                'Another academic group already has the same Class / Semester and Stream.'
            );
            return;
        }

        try {
            const updatedClasses = (d.classes || []).map((c) => {
                if (c.id === clsId) {
                    return {
                        ...c,
                        name: trimmedName,
                        stream: trimmedStream,
                    };
                }

                return c;
            });

            const sortedClasses = sortClassesByHierarchy(
                updatedClasses
            );

            const updatedData: ProfPlanData = {
                ...d,
                classes: sortedClasses,
            };

            save(updatedData);
            setD(updatedData);

            setEditingClassId(null);
            setErrorMessage(null);
            setClassSaveMessage(
                `✓ Successfully updated "${trimmedName}".`
            );
        } catch (err) {
            console.error('Error updating class:', err);
            setErrorMessage(
                'Failed to update class details.'
            );
        }
    };

    /* =====================================================
       DELETE CLASS
       -----------------------------------------------------
       IMPORTANT:
       Deleting a ClassItem alone leaves orphaned records.

       We therefore remove dependent:
       - courses
       - units
       - topics
       - timetable slots
       - logs

       This remains entirely inside TodayPage.
       ===================================================== */

    const handleDeleteClass = (clsId: string) => {
        const classToDelete = (d.classes || []).find(
            (c) => c.id === clsId
        );

        if (!classToDelete) return;

        const confirmed = window.confirm(
            `Delete "${classToDelete.name}"${
                classToDelete.stream
                    ? ` (${classToDelete.stream})`
                    : ''
            }?\n\nThis will also remove its linked subjects, syllabus topics, timetable periods and progress logs.`
        );

        if (!confirmed) return;

        try {
            const relatedCourseIds = new Set(
                (d.courses || [])
                    .filter(
                        (course) =>
                            course.classId === clsId
                    )
                    .map((course) => course.id)
            );

            const relatedUnitIds = new Set(
                (d.units || [])
                    .filter((unit) =>
                        relatedCourseIds.has(unit.courseId)
                    )
                    .map((unit) => unit.id)
            );

            const updatedCourses = (d.courses || []).filter(
                (course) =>
                    course.classId !== clsId
            );

            const updatedUnits = (d.units || []).filter(
                (unit) =>
                    !relatedCourseIds.has(unit.courseId)
            );

            const updatedTopics = (d.topics || []).filter(
                (topic) =>
                    !relatedCourseIds.has(topic.courseId || '') &&
                    !relatedUnitIds.has(topic.unitId)
            );

            const updatedSlots = (d.slots || []).filter(
                (slot) =>
                    slot.classId !== clsId &&
                    !relatedCourseIds.has(slot.courseId)
            );

            const updatedLogs = (d.logs || []).filter(
                (log) =>
                    log.classId !== clsId &&
                    !relatedCourseIds.has(log.courseId)
            );

            const updatedClasses = sortClassesByHierarchy(
                (d.classes || []).filter(
                    (c) => c.id !== clsId
                )
            );

            const updatedData: ProfPlanData = {
                ...d,
                classes: updatedClasses,
                courses: updatedCourses,
                units: updatedUnits,
                topics: updatedTopics,
                slots: updatedSlots,
                logs: updatedLogs,
            };

            save(updatedData);
            setD(updatedData);

            setEditingClassId(null);
            setClassSaveMessage(
                `"${classToDelete.name}" and its linked academic records were removed.`
            );
            setErrorMessage(null);
        } catch (err) {
            console.error(
                'Failed to delete class and dependencies:',
                err
            );

            setErrorMessage(
                'Failed to update storage during deletion.'
            );
        }
    };

    /* =====================================================
       TODAY'S TIMETABLE
       ===================================================== */

    const todaySlots = useMemo<TodaySlot[]>(() => {
        if (!Array.isArray(d.slots)) {
            return [];
        }

        const currentDayLower = dayName.toLowerCase();

        return (d.slots as TodaySlot[])
            .filter((slot) => {
                if (!slot.day) return false;

                const rawDay = String(slot.day)
                    .trim()
                    .toLowerCase();

                if (rawDay === currentDayLower) {
                    return true;
                }

                /*
                 * Legacy / flexible data support.
                 * Only accept standard 3-character weekday prefixes.
                 */
                const knownPrefixes = new Set([
                    'sun',
                    'mon',
                    'tue',
                    'wed',
                    'thu',
                    'fri',
                    'sat',
                ]);

                const prefix = rawDay.slice(0, 3);

                return (
                    rawDay.length >= 3 &&
                    knownPrefixes.has(prefix) &&
                    currentDayLower.startsWith(prefix)
                );
            })
            .sort(
                (a, b) =>
                    timeToMinutes(a.start) -
                    timeToMinutes(b.start)
            );
    }, [d.slots, dayName]);

    /* =====================================================
       EXTRA CLASSES
       ===================================================== */

    const todayExtraClasses = useMemo(
        () =>
            todayLogs
                .filter(
                    (log) =>
                        log.date === todayDateStr &&
                        log.classSource ===
                            'Extra / Unscheduled Class'
                )
                .sort(
                    (a, b) =>
                        timeToMinutes(a.actualStart) -
                        timeToMinutes(b.actualStart)
                ),
        [todayLogs, todayDateStr]
    );

    /* =====================================================
       TODAY COMPLETION
       ===================================================== */

    const completedTodayLogs = useMemo(
        () =>
            todayLogs.filter(
                (log) =>
                    log.date === todayDateStr &&
                    isTeachingCompleted(log)
            ),
        [todayLogs, todayDateStr]
    );

    const completedScheduledSlotIds = useMemo(
        () =>
            new Set(
                todayLogs
                    .filter(
                        (log) =>
                            log.date === todayDateStr &&
                            !!log.slotId &&
                            isTeachingCompleted(log)
                    )
                    .map((log) => log.slotId as string)
            ),
        [todayLogs, todayDateStr]
    );

    const totalClassesCompletedCount =
        completedTodayLogs.length;

    const todayDeliveredHours = completedTodayLogs
        .reduce(
            (total, log) =>
                total + (Number(log.hours) || 0),
            0
        )
        .toFixed(2);

    const completionRate =
        todaySlots.length > 0
            ? Math.min(
                  100,
                  Math.round(
                      (completedScheduledSlotIds.size /
                          todaySlots.length) *
                          100
                  )
              )
            : totalClassesCompletedCount > 0
            ? 100
            : 0;

    /* =====================================================
       COURSE / TOPIC HELPERS
       ===================================================== */

    const getCourse = (id: string) =>
        (d.courses || []).find(
            (course) => course.id === id
        );

    const getCourseTopics = (courseId: string) =>
        (d.topics || []).filter(
            (topic) => topic.courseId === courseId
        );

    /* =====================================================
       RECORD HOLIDAY / SUSPENSION
       -----------------------------------------------------
       We do NOT attach the record to a real course.

       The placeholder remains compatible with the existing
       Log type without changing types.ts.
       ===================================================== */

    const handleRecordNonInstructionalDay = (
        reasonText: string
    ) => {
        const cleanedReason = reasonText.trim();

        if (!cleanedReason) {
            setErrorMessage(
                'A holiday or suspension reason is required.'
            );
            return;
        }

        try {
            const existing = todayLogs.filter(
                (log) =>
                    log.date === todayDateStr &&
                    (
                        log.classType ===
                            'Non-Instructional / Suspension' ||
                        log.classSource ===
                            'Institutional Notice'
                    )
            );

            const logEntry: TodayLog = {
                id: createLocalId('log_institutional'),
                date: todayDateStr,

                /*
                 * Never borrow a genuine course ID for a
                 * non-instructional day.
                 */
                courseId: 'general_course_placeholder',

                status: 'cancelled',
                hours: 0,
                remarks: cleanedReason,
                classType:
                    'Non-Instructional / Suspension',
                classSource: 'Institutional Notice',
                type: 'Non-Instructional Day',
            };

            const existingIds = new Set(
                existing.map((log) => log.id)
            );

            const updatedLogs = todayLogs.filter(
                (log) => !existingIds.has(log.id)
            );

            updatedLogs.push(logEntry);

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs as Log[],
            };

            save(updatedData);
            setD(updatedData);
            setErrorMessage(null);
        } catch (err) {
            console.error(
                'Failed to save institutional day:',
                err
            );

            setErrorMessage(
                'Failed to save holiday / suspension record.'
            );
        }
    };

    /* =====================================================
       REMOVE HOLIDAY / SUSPENSION RECORD
       ===================================================== */

    const handleRemoveSuspensionLog = () => {
        if (!existingSuspensionLog) return;

        const confirmed = window.confirm(
            'Remove this holiday/suspension status from today’s register?'
        );

        if (!confirmed) return;

        try {
            const updatedLogs = todayLogs.filter(
                (log) =>
                    log.id !==
                    existingSuspensionLog.id
            );

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs as Log[],
            };

            save(updatedData);
            setD(updatedData);
            setErrorMessage(null);
        } catch (err) {
            console.error(
                'Failed to remove institutional record:',
                err
            );

            setErrorMessage(
                'Failed to update storage during removal.'
            );
        }
    };

    /* =====================================================
       QUICK LOG OPEN
       ===================================================== */

    const handleOpenQuickLog = (
        slot: TodaySlot
    ) => {
        const courseTopics = getCourseTopics(
            slot.courseId
        );

        const defaultTopic = courseTopics[0];

        setActiveSlot(slot);

        setSelectedTopicId(
            defaultTopic?.id || ''
        );

        setTopicCovered(
            defaultTopic?.name ||
                defaultTopic?.title ||
                ''
        );

        setAttendance('');
        setStatus('Taken');
        setRemarks('');
        setErrorMessage(null);
    };

    /* =====================================================
       TOPIC CHANGE
       ===================================================== */

    const handleTopicDropdownChange = (
        topicId: string
    ) => {
        setSelectedTopicId(topicId);

        const chosen = (d.topics || []).find(
            (topic) => topic.id === topicId
        );

        if (chosen) {
            setTopicCovered(
                chosen.name ||
                    chosen.title ||
                    ''
            );
        } else {
            setTopicCovered('');
        }
    };

    /* =====================================================
       QUICK LOG SAVE
       ===================================================== */

    const handleSaveQuickLog = (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (!activeSlot) return;

        const typedTopic = topicCovered.trim();

        if (!typedTopic) {
            setErrorMessage(
                'Please enter the topic actually covered.'
            );
            return;
        }

        /* ---------------------------------------------
           Attendance validation
           --------------------------------------------- */

        let attendanceValue: number | undefined;

        if (attendance.trim() !== '') {
            const parsedAttendance = Number(
                attendance
            );

            if (
                !Number.isInteger(
                    parsedAttendance
                ) ||
                parsedAttendance < 0 ||
                parsedAttendance > 200
            ) {
                setErrorMessage(
                    'Attendance must be a whole number between 0 and 200.'
                );
                return;
            }

            attendanceValue =
                parsedAttendance;
        }

        try {
            const startMinutes =
                timeToMinutes(
                    activeSlot.start
                );

            const endMinutes =
                timeToMinutes(
                    activeSlot.end
                );

            const diff =
                endMinutes -
                startMinutes;

            const calculatedHours =
                Number.isFinite(diff) &&
                diff > 0
                    ? Number(
                          (
                              diff / 60
                          ).toFixed(2)
                      )
                    : 0.75;

            const plannedTopicObj =
                (d.topics || []).find(
                    (topic) =>
                        topic.id ===
                        selectedTopicId
                );

            const resolvedPlannedName =
                plannedTopicObj?.name ||
                plannedTopicObj?.title ||
                'General / Unplanned';

            const resolvedCovered =
                typedTopic ||
                resolvedPlannedName;

            const canonicalStatus: TodayLog['status'] =
                status === 'Taken'
                    ? 'completed'
                    : status ===
                      'Compensated'
                    ? 'partial'
                    : 'cancelled';

            const newLog: TodayLog = {
                id: createLocalId('log'),

                date: todayDateStr,

                slotId: activeSlot.id,

                courseId:
                    activeSlot.courseId,

                topicId:
                    selectedTopicId || '',

                plannedTopicName:
                    resolvedPlannedName,

                status: canonicalStatus,

                classSource:
                    'Scheduled Class',

                type:
                    'Regular Lecture',

                actualStart:
                    activeSlot.start,

                actualEnd:
                    activeSlot.end,

                covered:
                    resolvedCovered,

                hours:
                    calculatedHours,

                attendance:
                    attendanceValue,

                remarks:
                    remarks.trim(),

                legacyStatus:
                    status,
            };

            /*
             * One scheduled period should have one active
             * quick-log record for the current date.
             */
            const updatedLogs = todayLogs.filter(
                (log) =>
                    !(
                        log.date ===
                            todayDateStr &&
                        log.slotId ===
                            activeSlot.id
                    )
            );

            updatedLogs.push(newLog);

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs as Log[],
            };

            save(updatedData);
            setD(updatedData);

            setActiveSlot(null);
            setErrorMessage(null);
        } catch (err) {
            console.error(
                'Failed to save quick log:',
                err
            );

            setErrorMessage(
                'Failed to save progress log.'
            );
        }
    };

    /* =====================================================
       UNDO LOG
       ===================================================== */

    const handleUndoLog = (
        slotId: string
    ) => {
        const existingLog = todayLogs.find(
            (log) =>
                log.date ===
                    todayDateStr &&
                log.slotId === slotId
        );

        if (!existingLog) return;

        const confirmed = window.confirm(
            'Re-open this teaching period? The existing progress log will be removed.'
        );

        if (!confirmed) return;

        try {
            /*
             * Remove only the relevant scheduled log.
             * This avoids deleting unrelated records.
             */
            const updatedLogs = todayLogs.filter(
                (log) =>
                    log.id !== existingLog.id
            );

            const updatedData: ProfPlanData = {
                ...d,
                logs: updatedLogs as Log[],
            };

            save(updatedData);
            setD(updatedData);
            setErrorMessage(null);
        } catch (err) {
            console.error(
                'Failed to undo log:',
                err
            );

            setErrorMessage(
                'Failed to update storage during undo action.'
            );
        }
    };

    /* =====================================================
       MOUNT GUARD
       ===================================================== */

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

            {/* =================================================
                ONBOARDING
               ================================================= */}

            {showOnboarding && (
                <OnboardingModal
                    onComplete={() => {
                        setShowOnboarding(false);

                        try {
                            const refreshed =
                                load();

                            if (refreshed) {
                                setD({
                                    ...refreshed,
                                    classes:
                                        sortClassesByHierarchy(
                                            refreshed.classes ||
                                                []
                                        ),
                                });
                            }
                        } catch (err) {
                            console.error(
                                'Failed to refresh after onboarding:',
                                err
                            );
                        }
                    }}
                />
            )}

            {/* =================================================
                ERROR BANNER
               ================================================= */}

            {errorMessage && (
                <div
                    role="alert"
                    className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center justify-between shadow-sm"
                >
                    <span className="font-bold">
                        {errorMessage}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setErrorMessage(null)
                        }
                        className="text-rose-700 font-extrabold hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* =================================================
                HERO BANNER
               ================================================= */}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                    <div className="flex items-center gap-4">

                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white p-1 shadow-lg ring-2 ring-white/30 hidden sm:block">
                            <Image
                                src="/apnsir-logo.png"
                                alt="APNSIR Foundation"
                                width={56}
                                height={56}
                                className="h-full w-full object-contain rounded-full"
                                priority
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                An Initiative by APNSIR FOUNDATION
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white mt-0.5">
                                Today&apos;s Class Schedule
                            </h1>

                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-blue-300" />

                                {currentDate.toLocaleDateString(
                                    'en-IN',
                                    {
                                        weekday:
                                            'long',
                                        day:
                                            'numeric',
                                        month:
                                            'long',
                                        year:
                                            'numeric',
                                    }
                                )}

                                <span className="text-blue-300 mx-1">
                                    ·
                                </span>

                                Daily Teaching Routine &amp; Progress Register
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setIsDataHubOpen(true)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs shadow-md transition"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        Backup &amp; Export Hub
                    </button>
                </div>
            </section>

            {/* =================================================
                ACTION BUTTONS
               ================================================= */}

            <section className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">

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
                        onClick={() =>
                            handleProtectedAction(
                                () => {
                                    window.location.href =
                                        '/timetable';
                                }
                            )
                        }
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

                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedAction(
                                () => {
                                    window.location.href =
                                        '/syllabus';
                                }
                            )
                        }
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <BookMarked className="w-5 h-5 text-white" />
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-100 block">
                                    Curriculum
                                </span>

                                <h2 className="text-sm font-black text-white">
                                    Syllabus Planner
                                </h2>
                            </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition" />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedAction(
                                () => {
                                    window.location.href =
                                        '/log';
                                }
                            )
                        }
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
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
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedAction(
                                () => {
                                    window.location.href =
                                        '/holidays';
                                }
                            )
                        }
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
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
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedAction(
                                () => {
                                    window.location.href =
                                        '/reports';
                                }
                            )
                        }
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-2xl shadow-md transition transform active:scale-95 group text-left"
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
                    </button>

                </div>
            </section>

            {/* =================================================
                METRICS
               ================================================= */}

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

                            {Number(todayDeliveredHours) > 0 && (
                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                                    {todayDeliveredHours} hrs delivered
                                </p>
                            )}
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
                        </div>

                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Percent className="w-6 h-6" />
                        </div>
                    </div>

                </div>
            </section>

            {/* =================================================
                HOLIDAY ALERT
               ================================================= */}

            {todayHoliday && (
                <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">

                    <div className="flex items-center gap-3.5">

                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md">
                            <SunMedium className="w-7 h-7" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">

                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                                    {todayHoliday.type ||
                                        'Institutional Holiday'}
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
                                onClick={
                                    handleRemoveSuspensionLog
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                                <Check className="w-4 h-4" />
                                Holiday Recorded — Undo
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    handleRecordNonInstructionalDay(
                                        `Holiday: ${todayHoliday.name}`
                                    )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                                <CalendarDays className="w-4 h-4" />
                                Record Holiday in Register
                            </button>
                        )}

                    </div>
                </div>
            )}

            {/* =================================================
                SUSPENSION / NOTICE
               ================================================= */}

            {existingSuspensionLog &&
                !todayHoliday && (
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
                                    {existingSuspensionLog.remarks ||
                                        'Classes Suspended'}
                                </h2>

                                <p className="text-xs font-semibold text-rose-800/90 mt-0.5">
                                    Today&apos;s teaching periods are marked as suspended in the progress register.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={
                                handleRemoveSuspensionLog
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Revert Suspension Status
                        </button>
                    </div>
                )}

            {/* =================================================
                TODAY'S SCHEDULE
               ================================================= */}

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
                            onClick={() =>
                                handleProtectedAction(
                                    () => {
                                        window.location.href =
                                            '/timetable';
                                    }
                                )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-blue-950 hover:bg-blue-900 rounded-xl transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            + Add Period for Today
                        </button>
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
                                You have no timetable periods assigned for this day of the week.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleProtectedAction(
                                    () => {
                                        window.location.href =
                                            '/timetable';
                                    }
                                )
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                            <Plus className="w-4 h-4" />
                            Set Up Timetable Routine
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">

                        {todaySlots.map((slot) => {
                            const course =
                                getCourse(
                                    slot.courseId
                                );

                            const logEntry =
                                todayLogs.find(
                                    (log) =>
                                        log.date ===
                                            todayDateStr &&
                                        log.slotId ===
                                            slot.id
                                );

                            const hasLog =
                                !!logEntry;

                            const isCompleted =
                                !!logEntry &&
                                isTeachingCompleted(
                                    logEntry
                                );

                            const isCancelled =
                                !!logEntry &&
                                isCancelledLog(
                                    logEntry
                                );

                            const isRecorded =
                                hasLog;

                            return (
                                <div
                                    key={slot.id}
                                    className={`rounded-3xl border p-5 shadow-sm transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                                        isCompleted
                                            ? 'border-emerald-200 bg-emerald-50/30'
                                            : isCancelled
                                            ? 'border-rose-200 bg-rose-50/20'
                                            : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
                                    }`}
                                >

                                    <div className="space-y-2.5 flex-1">

                                        <div className="flex flex-wrap items-center gap-2">

                                            <span
                                                className={`px-2.5 py-0.5 rounded-md font-black text-xs ${
                                                    isCompleted
                                                        ? 'bg-emerald-700 text-white'
                                                        : isCancelled
                                                        ? 'bg-rose-700 text-white'
                                                        : 'bg-blue-950 text-white'
                                                }`}
                                            >
                                                Period {slot.period || '—'}
                                            </span>

                                            <h3 className="text-base font-extrabold text-slate-900">
                                                {course?.name ||
                                                    'Unknown Subject'}
                                            </h3>

                                            {course?.code && (
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                                    {course.code}
                                                </span>
                                            )}

                                            {(slot.semesterClass ||
                                                course?.semester) && (
                                                <span className="text-xs font-semibold text-slate-500">
                                                    ·{' '}
                                                    {slot.semesterClass ||
                                                        course?.semester}
                                                </span>
                                            )}

                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">

                                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                {slot.start} –{' '}
                                                {slot.end}
                                            </span>

                                            {slot.room && (
                                                <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {slot.room}
                                                </span>
                                            )}

                                        </div>

                                        {/* =====================================
                                            COMPLETED LOG
                                           ===================================== */}

                                        {logEntry &&
                                            isCompleted && (
                                                <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1.5 text-xs">

                                                    <div className="flex items-center justify-between flex-wrap gap-2">

                                                        <span className="font-black text-emerald-950">
                                                            ✓ Covered:{' '}
                                                            {logEntry.covered ||
                                                                logEntry.plannedTopicName ||
                                                                'Completed'}
                                                        </span>

                                                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                                                            Status:{' '}
                                                            {getStatusLabel(
                                                                logEntry
                                                            )}
                                                        </span>

                                                    </div>

                                                    <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium pt-0.5">

                                                        {logEntry.attendance !==
                                                            undefined &&
                                                            logEntry.attendance !==
                                                                null && (
                                                                <span>
                                                                    👥 Attendance:{' '}
                                                                    <strong>
                                                                        {
                                                                            logEntry.attendance
                                                                        }{' '}
                                                                        students
                                                                    </strong>
                                                                </span>
                                                            )}

                                                        {Number(
                                                            logEntry.hours ||
                                                                0
                                                        ) > 0 && (
                                                            <span>
                                                                ⏱️ Workload:{' '}
                                                                <strong>
                                                                    {Number(
                                                                        logEntry.hours ||
                                                                            0
                                                                    )}{' '}
                                                                    hrs
                                                                </strong>
                                                            </span>
                                                        )}

                                                    </div>

                                                    {logEntry.remarks && (
                                                        <p className="text-[11px] text-slate-500 italic pt-0.5">
                                                            Remarks:{' '}
                                                            {
                                                                logEntry.remarks
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                        {/* =====================================
                                            CANCELLED LOG
                                           ===================================== */}

                                        {logEntry &&
                                            isCancelled && (
                                                <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1.5 text-xs">

                                                    <div className="flex items-center justify-between flex-wrap gap-2">

                                                        <span className="font-black text-rose-950">
                                                            ✕ Period Cancelled
                                                        </span>

                                                        <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider">
                                                            Status: Cancelled
                                                        </span>

                                                    </div>

                                                    {logEntry.remarks && (
                                                        <p className="text-[11px] text-slate-500 italic pt-0.5">
                                                            Remarks:{' '}
                                                            {
                                                                logEntry.remarks
                                                            }
                                                        </p>
                                                    )}

                                                </div>
                                            )}

                                        {/* =====================================
                                            OTHER / UNKNOWN RECORDED LOG
                                           ===================================== */}

                                        {logEntry &&
                                            !isCompleted &&
                                            !isCancelled && (
                                                <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1.5 text-xs">

                                                    <div className="flex items-center justify-between flex-wrap gap-2">

                                                        <span className="font-black text-amber-950">
                                                            Recorded
                                                        </span>

                                                        <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider">
                                                            Status:{' '}
                                                            {getStatusLabel(
                                                                logEntry
                                                            )}
                                                        </span>

                                                    </div>

                                                    {logEntry.covered && (
                                                        <p className="text-[11px] text-slate-600">
                                                            Covered:{' '}
                                                            {
                                                                logEntry.covered
                                                            }
                                                        </p>
                                                    )}

                                                </div>
                                            )}

                                    </div>

                                    {/* =========================================
                                        ACTIONS
                                       ========================================= */}

                                    <div className="flex items-center gap-2 self-end md:self-center">

                                        {isRecorded ? (
                                            <div className="flex items-center gap-2">

                                                <Link
                                                    href={`/log?editId=${encodeURIComponent(
                                                        logEntry?.id || ''
                                                    )}`}
                                                    className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition border border-blue-200 shadow-xs"
                                                >
                                                    Edit Log
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleUndoLog(
                                                            slot.id
                                                        )
                                                    }
                                                    title="Re-open period"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>

                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">

                                                <Link
                                                    href={`/log?slotId=${encodeURIComponent(
                                                        slot.id
                                                    )}`}
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                                                >
                                                    Open Register
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenQuickLog(
                                                            slot
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Quick Complete
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

            {/* =================================================
                EXTRA / UNSCHEDULED CLASSES
               ================================================= */}

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

                        {todayExtraClasses.map(
                            (extra) => {
                                const course =
                                    extra.courseId !==
                                    'custom_activity'
                                        ? getCourse(
                                              extra.courseId
                                          )
                                        : null;

                                const subjectName =
                                    course?.name ||
                                    extra.customSubjectName ||
                                    extra.plannedTopicName ||
                                    'Extra Teaching Session';

                                return (
                                    <div
                                        key={
                                            extra.id
                                        }
                                        className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                                    >

                                        <div className="space-y-2.5 flex-1">

                                            <div className="flex flex-wrap items-center gap-2">

                                                <span className="px-2.5 py-0.5 rounded-md bg-amber-600 text-white font-black text-xs">
                                                    Extra / Unscheduled
                                                </span>

                                                <h3 className="text-base font-extrabold text-slate-900">
                                                    {
                                                        subjectName
                                                    }
                                                </h3>

                                                {course?.code && (
                                                    <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 font-bold text-xs border border-amber-200">
                                                        {
                                                            course.code
                                                        }
                                                    </span>
                                                )}

                                                {extra.semester && (
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        ·{' '}
                                                        {
                                                            extra.semester
                                                        }
                                                    </span>
                                                )}

                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-xs">

                                                {extra.actualStart &&
                                                    extra.actualEnd && (
                                                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                            {
                                                                extra.actualStart
                                                            }{' '}
                                                            –{' '}
                                                            {
                                                                extra.actualEnd
                                                            }
                                                        </span>
                                                    )}

                                                {extra.room && (
                                                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        {
                                                            extra.room
                                                        }
                                                    </span>
                                                )}

                                                {Number(
                                                    extra.hours ||
                                                        0
                                                ) > 0 && (
                                                    <span className="font-bold text-slate-600">
                                                        ⏱️{' '}
                                                        {Number(
                                                            extra.hours
                                                        )}{' '}
                                                        hrs
                                                    </span>
                                                )}

                                            </div>

                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-center">

                                            <Link
                                                href={`/log?editId=${encodeURIComponent(
                                                    extra.id
                                                )}`}
                                                className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs transition border border-amber-300 shadow-xs"
                                            >
                                                Edit Log
                                            </Link>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>
                </section>
            )}

            {/* =================================================
                ADD CLASS MODAL
               ================================================= */}

            {isAddClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-class-title"
                >
                    <div
                        className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-[30px] border border-white/40 bg-white shadow-2xl flex flex-col"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* =====================================
                            BRAND HEADER
                           ===================================== */}

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

                                        <p
                                            id="add-class-title"
                                            className="truncate text-sm font-extrabold text-white"
                                        >
                                            ProfPlan &bull; Academic Workspace Setup
                                        </p>

                                    </div>

                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeAddClassModal
                                    }
                                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                                    title="Close"
                                    aria-label="Close academic workspace setup"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                            </div>
                        </div>

                        {/* =====================================
                            MODAL BODY
                           ===================================== */}

                        <div className="overflow-y-auto px-6 py-5 space-y-4">

                            {/* ADVISORY */}

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

                            {/* SUCCESS */}

                            {classSaveMessage && (
                                <div
                                    role="status"
                                    className="flex items-start gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 shadow-md animate-in fade-in zoom-in-95"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />

                                    <span className="font-extrabold leading-relaxed">
                                        {
                                            classSaveMessage
                                        }
                                    </span>
                                </div>
                            )}

                            <form
                                onSubmit={
                                    handleSaveNewClass
                                }
                                className="space-y-4"
                            >

                                {/* CLASS NAME */}

                                <div>

                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                        Class / Semester Name{' '}
                                        <span className="text-rose-500">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        ref={
                                            classNameInputRef
                                        }
                                        type="text"
                                        placeholder="e.g. BA 1st Semester, +2 1st Year Arts, Class XI"
                                        value={
                                            newClassName
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setNewClassName(
                                                event.target
                                                    .value
                                            );
                                            setClassSaveMessage(
                                                null
                                            );
                                            setErrorMessage(
                                                null
                                            );
                                        }}
                                        required
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                    />

                                </div>

                                {/* STREAM */}

                                <div>

                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                        Stream / Faculty *
                                    </label>

                                    <select
                                        value={
                                            newClassStream
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            const value =
                                                event.target
                                                    .value;

                                            setNewClassStream(
                                                value
                                            );

                                            setClassSaveMessage(
                                                null
                                            );

                                            setErrorMessage(
                                                null
                                            );

                                            if (
                                                value !==
                                                'Other / Custom'
                                            ) {
                                                setCustomStreamInput(
                                                    ''
                                                );
                                            }
                                        }}
                                        className="w-full rounded-xl border-2 border-indigo-200/80 bg-indigo-50/20 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                    >
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

                                        <option value="General / Academic">
                                            General / Academic
                                        </option>

                                        <option value="Other / Custom">
                                            Other / Custom
                                        </option>
                                    </select>

                                    {newClassStream ===
                                        'Other / Custom' && (
                                        <div className="mt-2.5">

                                            <input
                                                type="text"
                                                placeholder="Enter Custom Stream Name"
                                                value={
                                                    customStreamInput
                                                }
                                                onChange={(
                                                    event
                                                ) => {
                                                    setCustomStreamInput(
                                                        event
                                                            .target
                                                            .value
                                                    );

                                                    setClassSaveMessage(
                                                        null
                                                    );

                                                    setErrorMessage(
                                                        null
                                                    );
                                                }}
                                                required
                                                className="w-full rounded-xl border-2 border-indigo-300 bg-indigo-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                            />

                                        </div>
                                    )}

                                </div>

                                {/* EXISTING CLASSES */}

                                {d.classes &&
                                    d.classes.length >
                                        0 && (
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">

                                            <div className="flex items-center justify-between">

                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                    Already Registered Academic Groups (
                                                    {
                                                        d.classes
                                                            .length
                                                    }
                                                    )
                                                </span>

                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    Hierarchy Sorted
                                                </span>

                                            </div>

                                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">

                                                {d.classes.map(
                                                    (
                                                        cls,
                                                        index
                                                    ) => {
                                                        const isEditing =
                                                            editingClassId ===
                                                            cls.id;

                                                        return (
                                                            <div
                                                                key={
                                                                    cls.id
                                                                }
                                                                className={`rounded-xl border p-3 transition flex items-center justify-between gap-2 ${
                                                                    isEditing
                                                                        ? 'bg-indigo-50/90 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                                        : 'bg-white border-slate-200 shadow-xs hover:border-indigo-200'
                                                                }`}
                                                            >

                                                                {isEditing ? (
                                                                    <div className="space-y-2 w-full">

                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                                                                            <input
                                                                                ref={
                                                                                    editClassInputRef
                                                                                }
                                                                                type="text"
                                                                                value={
                                                                                    editClassNameVal
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setEditClassNameVal(
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                placeholder="Class Name"
                                                                                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                            />

                                                                            <input
                                                                                type="text"
                                                                                value={
                                                                                    editClassStreamVal
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setEditClassStreamVal(
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                placeholder="Stream / Branch"
                                                                                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                            />

                                                                        </div>

                                                                        <div className="flex justify-end gap-2 pt-1">

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setEditingClassId(
                                                                                        null
                                                                                    )
                                                                                }
                                                                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-md transition"
                                                                            >
                                                                                Cancel
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleSaveEditClass(
                                                                                        cls.id
                                                                                    )
                                                                                }
                                                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-md shadow transition"
                                                                            >
                                                                                Save
                                                                            </button>

                                                                        </div>

                                                                    </div>
                                                                ) : (
                                                                    <>

                                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">

                                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                                                {
                                                                                    index +
                                                                                    1
                                                                                }
                                                                            </span>

                                                                            <span className="truncate text-xs font-bold text-slate-800">
                                                                                {
                                                                                    cls.name
                                                                                }{' '}
                                                                                <span className="text-slate-400 font-normal">
                                                                                    (
                                                                                    {
                                                                                        cls.stream
                                                                                    }
                                                                                    )
                                                                                </span>
                                                                            </span>

                                                                        </div>

                                                                        <div className="flex items-center gap-1 shrink-0">

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleStartEditClass(
                                                                                        cls
                                                                                    )
                                                                                }
                                                                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] tracking-wide uppercase shadow-sm transition"
                                                                                title="Edit Class Name"
                                                                            >
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleDeleteClass(
                                                                                        cls.id
                                                                                    )
                                                                                }
                                                                                className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg shrink-0 transition hover:bg-rose-50"
                                                                                title="Delete class"
                                                                                aria-label={`Delete ${cls.name}`}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>

                                                                        </div>

                                                                    </>
                                                                )}

                                                            </div>
                                                        );
                                                    }
                                                )}

                                            </div>
                                        </div>
                                    )}

                                {/* FOOTER */}

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">

                                    <button
                                        type="button"
                                        onClick={
                                            closeAddClassModal
                                        }
                                        className="px-5 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                    >
                                        Cancel / Done
                                    </button>

                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:opacity-95"
                                    >
                                        <Check className="h-4 w-4" />
                                        Save Class
                                    </button>

                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
                QUICK LOG MODAL
               ================================================= */}

            {activeSlot && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quick-log-title"
                >
                    <div
                        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">

                            <div>

                                <h3
                                    id="quick-log-title"
                                    className="text-base font-black text-slate-900"
                                >
                                    Quick Log: Period{' '}
                                    {activeSlot.period ||
                                        '—'}
                                </h3>

                                <p className="text-xs text-slate-500">
                                    {
                                        getCourse(
                                            activeSlot.courseId
                                        )?.name
                                    }{' '}
                                    (
                                    {
                                        activeSlot.start
                                    }{' '}
                                    –{' '}
                                    {
                                        activeSlot.end
                                    }
                                    )
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveSlot(
                                        null
                                    )
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                title="Close"
                                aria-label="Close quick log"
                            >
                                <X className="w-5 h-5" />
                            </button>

                        </div>

                        <form
                            onSubmit={
                                handleSaveQuickLog
                            }
                            className="space-y-4"
                        >

                            {/* PLANNED TOPIC */}

                            <div>

                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Planned Syllabus Topic
                                </label>

                                <select
                                    value={
                                        selectedTopicId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleTopicDropdownChange(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50/60 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >

                                    <option value="">
                                        -- Custom / Unplanned Topic --
                                    </option>

                                    {getCourseTopics(
                                        activeSlot.courseId
                                    ).map(
                                        (topic) => (
                                            <option
                                                key={
                                                    topic.id
                                                }
                                                value={
                                                    topic.id
                                                }
                                            >
                                                Unit{' '}
                                                {(
                                                    topic as typeof topic & {
                                                        unitNumber?: number;
                                                        unit?: string;
                                                    }
                                                )
                                                    .unitNumber ||
                                                    (
                                                        topic as typeof topic & {
                                                            unit?: string;
                                                        }
                                                    )
                                                        .unit ||
                                                    1}{' '}
                                                —{' '}
                                                {
                                                    topic.name ||
                                                    topic.title
                                                }
                                            </option>
                                        )
                                    )}

                                </select>
                            </div>

                            {/* ACTUAL TOPIC */}

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
                                    value={
                                        topicCovered
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setTopicCovered(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Detail what was taught today"
                                    required
                                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                />

                            </div>

                            {/* STATUS / ATTENDANCE */}

                            <div className="grid grid-cols-2 gap-3">

                                <div>

                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Period Status
                                    </label>

                                    <select
                                        value={
                                            status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setStatus(
                                                event
                                                    .target
                                                    .value as
                                                    | 'Taken'
                                                    | 'Compensated'
                                                    | 'Cancelled'
                                            )
                                        }
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60 font-semibold"
                                    >

                                        <option value="Taken">
                                            Taken
                                        </option>

                                        <option value="Compensated">
                                            Compensated
                                        </option>

                                        <option value="Cancelled">
                                            Cancelled
                                        </option>

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
                                        step="1"
                                        value={
                                            attendance
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setAttendance(
                                                event
                                                    .target
                                                    .value
                                            );
                                            setErrorMessage(
                                                null
                                            );
                                        }}
                                        placeholder="e.g. 48"
                                        className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60"
                                    />

                                </div>

                            </div>

                            {/* REMARKS */}

                            <div>

                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Remarks / Deviations (Optional)
                                </label>

                                <input
                                    type="text"
                                    value={
                                        remarks
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setRemarks(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="e.g. Extended discussion on student doubts"
                                    className="w-full px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/60"
                                />

                            </div>

                            {/* FOOTER */}

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveSlot(
                                            null
                                        )
                                    }
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

            {/* =================================================
                DATA HUB
               ================================================= */}

            <DataHubModal
                isOpen={isDataHubOpen}
                onClose={() =>
                    setIsDataHubOpen(false)
                }
            />

        </div>
    );
}