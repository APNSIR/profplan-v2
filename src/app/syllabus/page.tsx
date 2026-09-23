'use client';

import React, {
    Suspense,
    useEffect,
    useMemo,
    useState,
} from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
    Plus,
    Trash2,
    ArrowLeft,
    X,
    GraduationCap,
    ChevronRight,
    ChevronDown,
    Copy,
    BookOpen,
    Layers,
    Check,
    Clock3,
    Target,
    BarChart3,
    Home,
    Sparkles,
    BookMarked,
    ListFilter,
    CheckCircle2
} from 'lucide-react';

import {
    load,
    save,
    ProfPlanData,
} from '@/lib/store';

import type {
    Course,
    Unit,
    Topic,
} from '@/lib/types';

import type {
    ClassItem,
} from '@/lib/store';

function createId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

function emptyData(): ProfPlanData {
    return {
        classes: [],
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
    };
}

const CARD_PALETTES = [
    {
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
    {
        bg: 'bg-gradient-to-br from-emerald-600 to-teal-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
    {
        bg: 'bg-gradient-to-br from-violet-600 to-purple-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
    {
        bg: 'bg-gradient-to-br from-amber-600 to-orange-700',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
    {
        bg: 'bg-gradient-to-br from-rose-600 to-pink-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
    {
        bg: 'bg-gradient-to-br from-cyan-700 to-blue-900',
        text: 'text-white',
        badge: 'bg-white/20 text-white'
    },
];

function SyllabusContent() {
    const searchParams = useSearchParams();

    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<ProfPlanData>(emptyData());
    const [activeClassId, setActiveClassId] = useState<string | null>(null);

    const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

    /* =====================================================
        CLASS / SEMESTER FORM
    ===================================================== */

    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('General / Academic');
    const [customClassStream, setCustomClassStream] = useState('');

    const [sessionClassesAdded, setSessionClassesAdded] = useState(0);

    const [courseName, setCourseName] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [courseHours, setCourseHours] = useState('45');

    const [targetCourseIdForUnit, setTargetCourseIdForUnit] = useState('');
    const [unitNumber, setUnitNumber] = useState('');
    const [unitName, setUnitName] = useState('');

    const [targetUnitIdForTopic, setTargetUnitIdForTopic] = useState('');
    const [topicName, setTopicName] = useState('');
    const [plannedClasses, setPlannedClasses] = useState('2');

    const [cloneSourceId, setCloneSourceId] = useState('');
    const [cloneTargetId, setCloneTargetId] = useState('');

    /* =====================================================
        LOAD / REFRESH DATA
    ===================================================== */

    useEffect(() => {
        setMounted(true);

        const loadedData = load();
        setData(loadedData);

        const refresh = () => {
            setData(load());
        };

        window.addEventListener('profplan-change', refresh);
        window.addEventListener('storage', refresh);

        return () => {
            window.removeEventListener('profplan-change', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const classId = searchParams.get('classId');

        if (
            classId &&
            data.classes.some((item) => item.id === classId)
        ) {
            setActiveClassId(classId);
        }
    }, [mounted, searchParams, data.classes]);

    /* =====================================================
        ACTIVE CLASS
    ===================================================== */

    const activeClassIndex = useMemo(() => {
        return (data.classes || []).findIndex(
            (c) => c.id === activeClassId
        );
    }, [data.classes, activeClassId]);

    const activePalette =
        activeClassIndex >= 0
            ? CARD_PALETTES[
            activeClassIndex % CARD_PALETTES.length
            ]
            : {
                bg: 'bg-[#131b40]',
                text: 'text-white',
                badge: 'bg-white/15 text-blue-200'
            };

    const activeClass = useMemo<ClassItem | undefined>(() => {
        return data.classes.find(
            (cls) => cls.id === activeClassId
        );
    }, [data.classes, activeClassId]);

    const activeClassCourses = useMemo<Course[]>(() => {
        if (!activeClass) return [];

        return data.courses.filter(
            (course) =>
                course.classId === activeClass.id ||
                course.semester === activeClass.name
        );
    }, [data.courses, activeClass]);

    /* =====================================================
        SYLLABUS HELPERS (Strictly Filter Blank / Ghost Units)
    ===================================================== */

    const getCourseUnits = (courseId: string): any[] => {
        return [...(data.units || [])]
            .filter((unit: any) => {
                if (unit.courseId !== courseId) return false;
                const titleStr = (unit.name || unit.title || '').trim();
                return titleStr.length > 0; // Filter out empty/ghost units completely
            })
            .sort((a: any, b: any) => {
                const numA = a.unitNumber ?? a.order ?? 0;
                const numB = b.unitNumber ?? b.order ?? 0;
                if (numA !== numB) {
                    return numA - numB;
                }
                return (a.order ?? 0) - (b.order ?? 0);
            });
    };

    const getUnitTopics = (unitId: string): any[] => {
        return [...(data.topics || [])]
            .filter((topic: any) => {
                if (topic.unitId !== unitId) return false;
                const topicStr = (topic.name || topic.title || '').trim();
                return topicStr.length > 0;
            })
            .sort(
                (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
            );
    };

    /* =====================================================
        PERSIST
    ===================================================== */

    const persist = (updatedData: ProfPlanData) => {
        save(updatedData);
        setData(updatedData);

        window.dispatchEvent(
            new Event('profplan-change')
        );
    };

    /* =====================================================
        EXPANSION CONTROLS
    ===================================================== */

    const toggleCourse = (courseId: string) => {
        setExpandedCourses((previous) => ({
            ...previous,
            [courseId]: !(previous[courseId] ?? true),
        }));
    };

    const toggleUnit = (unitId: string) => {
        setExpandedUnits((previous) => ({
            ...previous,
            [unitId]: !(previous[unitId] ?? true),
        }));
    };

    /* =====================================================
        CLASS STATISTICS
    ===================================================== */

    const getClassStats = (classItem: ClassItem) => {
        const courses = data.courses.filter(
            (course) =>
                course.classId === classItem.id ||
                course.semester === classItem.name
        );

        const courseIds = courses.map(
            (course) => course.id
        );

        const units = getCourseUnits(courseIds[0] || ''); // filtered safely
        const unitsList = (data.units || []).filter((u: any) => courseIds.includes(u.courseId) && Boolean((u.name || u.title || '').trim()));
        const unitIds = new Set(unitsList.map((u: any) => u.id));

        const topics = (data.topics || []).filter(
            (topic: any) =>
                (unitIds.has(topic.unitId) || courseIds.includes(topic.courseId)) &&
                Boolean((topic.name || topic.title || '').trim())
        );

        const plannedPeriods = topics.reduce(
            (total: number, topic: any) =>
                total +
                (Number(topic.plannedClasses) || 0),
            0
        );

        const targetPeriods = courses.reduce(
            (total: number, course: any) =>
                total +
                (Number(course.hours ?? course.targetHours) || 45),
            0
        );

        const progress =
            targetPeriods > 0
                ? Math.min(
                    100,
                    Math.round(
                        (plannedPeriods /
                            targetPeriods) *
                        100
                    )
                )
                : topics.length > 0
                    ? 100
                    : 0;

        return {
            courses,
            units: unitsList,
            topics,
            plannedPeriods,
            targetPeriods,
            progress,
        };
    };

    const activeStats = useMemo(() => {
        if (!activeClass) {
            return {
                courses: [],
                units: [],
                topics: [],
                plannedPeriods: 0,
                targetPeriods: 0,
                progress: 0,
            };
        }

        return getClassStats(activeClass);
    }, [activeClass, data]);

    /* =====================================================
        CLASS MODAL
    ===================================================== */

    const openClassModal = () => {
        setNewClassName('');
        setNewClassStream('General / Academic');
        setCustomClassStream('');
        setSessionClassesAdded(0);
        setIsClassModalOpen(true);
    };

    const handleSaveClass = (
        e?: React.FormEvent,
        keepOpen = false
    ) => {
        e?.preventDefault();

        const name = newClassName.trim();

        if (!name) {
            alert(
                'Please enter a Class / Semester Name.'
            );
            return;
        }

        const duplicate = data.classes.some(
            (item) =>
                item.name.trim().toLowerCase() ===
                name.toLowerCase()
        );

        if (duplicate) {
            alert(
                'This Class / Semester already exists.'
            );
            return;
        }

        const stream =
            newClassStream === 'Other / Custom'
                ? customClassStream.trim()
                : newClassStream;

        const newClass: ClassItem = {
            id: createId('class'),
            name,
            stream:
                stream ||
                'General / Academic',
        } as ClassItem;

        const updatedData: ProfPlanData = {
            ...data,
            classes: [
                ...data.classes,
                newClass,
            ],
        };

        persist(updatedData);

        setActiveClassId(newClass.id);

        if (keepOpen) {
            setSessionClassesAdded(
                (count) => count + 1
            );

            setNewClassName('');
            setNewClassStream(
                'General / Academic'
            );
            setCustomClassStream('');

            return;
        }

        setIsClassModalOpen(false);
        setSessionClassesAdded(0);
    };

    const handleDeleteClass = (
        classItem: ClassItem
    ) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete workspace "${classItem.name}"?\n\n` +
            `This will permanently remove all associated subjects, units, topics, and timetable slots.\n\n` +
            `Historical teaching records / Reports will be preserved.`
        );

        if (!confirmed) return;

        const targetCourses =
            data.courses.filter(
                (course) =>
                    course.classId ===
                    classItem.id ||
                    course.semester ===
                    classItem.name
            );

        const courseIds = new Set(
            targetCourses.map(
                (course) => course.id
            )
        );

        const targetUnits =
            (data.units || []).filter(
                (unit: any) =>
                    courseIds.has(
                        unit.courseId
                    )
            );

        const unitIds = new Set(
            targetUnits.map(
                (unit: any) => unit.id
            )
        );

        const updatedClasses =
            data.classes.filter(
                (cls) =>
                    cls.id !== classItem.id
            );

        const updatedCourses =
            data.courses.filter(
                (course) =>
                    !courseIds.has(
                        course.id
                    )
            );

        const updatedUnits =
            (data.units || []).filter(
                (unit: any) =>
                    !courseIds.has(
                        unit.courseId
                    )
            );

        const updatedTopics =
            (data.topics || []).filter(
                (topic: any) =>
                    !unitIds.has(
                        topic.unitId
                    ) &&
                    !courseIds.has(
                        topic.courseId
                    )
            );

        const updatedSlots =
            (data.slots || []).filter(
                (slot: any) =>
                    slot.classId !==
                    classItem.id &&
                    slot.semesterClass !==
                    classItem.name &&
                    !courseIds.has(
                        slot.courseId
                    )
            );

        const updatedData: ProfPlanData = {
            ...data,
            classes:
                updatedClasses,
            courses:
                updatedCourses,
            units:
                updatedUnits,
            topics:
                updatedTopics,
            slots:
                updatedSlots,
            logs:
                data.logs,
        };

        persist(updatedData);

        setIsClassModalOpen(false);

        if (
            activeClassId ===
            classItem.id
        ) {
            setActiveClassId(
                updatedClasses.length > 0
                    ? updatedClasses[0].id
                    : null
            );
        }
    };

    /* =====================================================
        SUBJECT / COURSE
    ===================================================== */

    const openCourseModal = () => {
        if (!activeClass) {
            alert(
                'Please select a Class / Semester first.'
            );
            return;
        }

        setCourseName('');
        setCourseCode('');
        setCourseHours('45');
        setIsCourseModalOpen(true);
    };

    const handleSaveCourse = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!activeClass) return;

        const name =
            courseName.trim();

        const code =
            courseCode.trim();

        if (!name || !code) {
            alert(
                'Please enter Subject Name and Paper Code.'
            );
            return;
        }

        const newCourse: Course = {
            id: createId('course'),
            name,
            code,
            hours:
                Number(courseHours) ||
                45,
            targetHours:
                Number(courseHours) ||
                45,
            classId:
                activeClass.id,
            semester:
                activeClass.name,
        } as Course;

        const updatedData = {
            ...data,
            courses: [
                ...data.courses,
                newCourse,
            ],
        };

        persist(updatedData);

        setExpandedCourses(
            (previous) => ({
                ...previous,
                [newCourse.id]:
                    true,
            })
        );

        setIsCourseModalOpen(false);
    };

    const handleDeleteCourse = (
        course: Course
    ) => {
        const units =
            (data.units || []).filter(
                (unit: any) =>
                    unit.courseId ===
                    course.id
            );

        const unitIds =
            new Set(
                units.map(
                    (unit: any) =>
                        unit.id
                )
            );

        const confirmed =
            window.confirm(
                `Delete "${course.name}" and all its units, topics and timetable slots?`
            );

        if (!confirmed) return;

        const updatedData: ProfPlanData = {
            ...data,

            courses:
                data.courses.filter(
                    (item) =>
                        item.id !==
                        course.id
                ),

            units:
                (data.units || []).filter(
                    (unit: any) =>
                        unit.courseId !==
                        course.id
                ),

            topics:
                (data.topics || []).filter(
                    (topic: any) =>
                        !unitIds.has(
                            topic.unitId
                        ) &&
                        topic.courseId !==
                        course.id
                ),

            slots:
                (data.slots || []).filter(
                    (slot: any) =>
                        slot.courseId !==
                        course.id
                ),
        };

        persist(updatedData);
    };

    /* =====================================================
        UNIT
    ===================================================== */

    const openUnitModal = (
        courseId?: string
    ) => {
        if (!activeClass) {
            alert(
                'Please select a Class / Semester first.'
            );
            return;
        }

        const target =
            courseId ||
            activeClassCourses[0]?.id ||
            '';

        if (!target) {
            alert(
                'Please create a subject first.'
            );
            return;
        }

        setTargetCourseIdForUnit(
            target
        );

        const units =
            getCourseUnits(target);

        setUnitNumber(
            String(
                units.length + 1
            )
        );

        setUnitName('');
        setIsUnitModalOpen(true);
    };

    const handleSaveUnit = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const course =
            data.courses.find(
                (item) =>
                    item.id ===
                    targetCourseIdForUnit
            );

        if (!course) {
            alert(
                'Please select a subject.'
            );
            return;
        }

        const name =
            unitName.trim();

        if (!name) {
            alert(
                'Please enter a Unit Title.'
            );
            return;
        }

        const existingUnits =
            getCourseUnits(
                course.id
            );

        const number =
            Number(unitNumber) ||
            existingUnits.length +
            1;

        const newUnit: Unit = {
            id: createId('unit'),
            courseId:
                course.id,
            name,
            title: name,
            unitNumber:
                number,
            order:
                existingUnits.length,
        } as Unit;

        const updatedData = {
            ...data,
            units: [
                ...(data.units || []),
                newUnit,
            ],
        };

        persist(updatedData);

        setExpandedCourses(
            (previous) => ({
                ...previous,
                [course.id]:
                    true,
            })
        );

        setExpandedUnits(
            (previous) => ({
                ...previous,
                [newUnit.id]:
                    true,
            })
        );

        setIsUnitModalOpen(false);
    };

    const handleDeleteUnit = (
        unit: any
    ) => {
        const confirmed =
            window.confirm(
                `Delete "${unit.name ?? unit.title}" and all topics inside it?`
            );

        if (!confirmed) return;

        const updatedData = {
            ...data,

            units:
                (data.units || []).filter(
                    (item: any) =>
                        item.id !==
                        unit.id
                ),

            topics:
                (data.topics || []).filter(
                    (topic: any) =>
                        topic.unitId !==
                        unit.id
                ),
        };

        persist(updatedData);
    };

    /* =====================================================
        TOPIC
    ===================================================== */

    const openTopicModal = (
        unitId?: string
    ) => {
        const target =
            unitId ||
            activeStats.units[0]?.id ||
            '';

        if (!target) {
            alert(
                'Please create a Unit first.'
            );
            return;
        }

        setTargetUnitIdForTopic(
            target
        );

        setTopicName('');
        setPlannedClasses('2');
        setIsTopicModalOpen(true);
    };

    const handleSaveTopic = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const unit: any =
            (data.units || []).find(
                (item: any) =>
                    item.id ===
                    targetUnitIdForTopic
            );

        if (!unit) {
            alert(
                'Please select a Unit.'
            );
            return;
        }

        const name =
            topicName.trim();

        if (!name) {
            alert(
                'Please enter a Topic Title.'
            );
            return;
        }

        const unitTopics =
            getUnitTopics(
                unit.id
            );

        const newTopic: Topic = {
            id: createId('topic'),
            courseId:
                unit.courseId,
            unitId:
                unit.id,
            name,
            title: name,
            plannedClasses:
                Number(
                    plannedClasses
                ) || 1,
            order:
                unitTopics.length,
        } as Topic;

        const updatedData = {
            ...data,
            topics: [
                ...(data.topics || []),
                newTopic,
            ],
        };

        persist(updatedData);

        setExpandedUnits(
            (previous) => ({
                ...previous,
                [unit.id]:
                    true,
            })
        );

        setIsTopicModalOpen(false);
    };

    const handleDeleteTopic = (
        topic: any
    ) => {
        const confirmed =
            window.confirm(
                `Delete topic "${topic.name ?? topic.title}"?`
            );

        if (!confirmed) return;

        const updatedData = {
            ...data,
            topics:
                (data.topics || []).filter(
                    (item: any) =>
                        item.id !==
                        topic.id
                ),
        };

        persist(updatedData);
    };

    /* =====================================================
        CLONE SYLLABUS
    ===================================================== */

    const openCloneModal = () => {
        if (!activeClass) return;

        const otherClass =
            data.classes.find(
                (item) =>
                    item.id !==
                    activeClass.id
            );

        setCloneSourceId(
            activeClass.id
        );

        setCloneTargetId(
            otherClass?.id || ''
        );

        setIsCloneModalOpen(true);
    };

    const handleClone = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const source =
            data.classes.find(
                (item) =>
                    item.id ===
                    cloneSourceId
            );

        const target =
            data.classes.find(
                (item) =>
                    item.id ===
                    cloneTargetId
            );

        if (!source || !target) {
            alert(
                'Please select both source and target classes.'
            );
            return;
        }

        if (
            source.id ===
            target.id
        ) {
            alert(
                'Source and target classes must be different.'
            );
            return;
        }

        const sourceCourses =
            data.courses.filter(
                (course) =>
                    course.classId ===
                    source.id ||
                    course.semester ===
                    source.name
            );

        if (
            sourceCourses.length ===
            0
        ) {
            alert(
                'The source class has no syllabus to clone.'
            );
            return;
        }

        let courses = [
            ...data.courses,
        ];

        let units = [
            ...(data.units || []),
        ];

        let topics = [
            ...(data.topics || []),
        ];

        sourceCourses.forEach(
            (sourceCourse) => {
                const newCourseId =
                    createId(
                        'course'
                    );

                const newCourse: Course =
                {
                    ...sourceCourse,
                    id: newCourseId,
                    classId:
                        target.id,
                    semester:
                        target.name,
                };

                courses.push(
                    newCourse
                );

                const sourceUnits =
                    (data.units || []).filter(
                        (unit: any) =>
                            unit.courseId ===
                            sourceCourse.id
                    );

                sourceUnits.forEach(
                    (sourceUnit: any) => {
                        const newUnitId =
                            createId(
                                'unit'
                            );

                        const newUnit: any =
                        {
                            ...sourceUnit,
                            id: newUnitId,
                            courseId:
                                newCourseId,
                        };

                        units.push(
                            newUnit
                        );

                        const sourceTopics =
                            (data.topics || []).filter(
                                (topic: any) =>
                                    topic.unitId ===
                                    sourceUnit.id
                            );

                        sourceTopics.forEach(
                            (sourceTopic: any) => {
                                topics.push(
                                    {
                                        ...sourceTopic,
                                        id: createId(
                                            'topic'
                                        ),
                                        courseId:
                                            newCourseId,
                                        unitId:
                                            newUnitId,
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );

        persist({
            ...data,
            courses,
            units,
            topics,
        });

        setIsCloneModalOpen(false);

        alert(
            `Syllabus cloned successfully to ${target.name}.`
        );
    };

    /* =====================================================
        INITIAL LOADING
    ===================================================== */

    if (!mounted) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="animate-pulse text-sm font-bold text-slate-500">
                    Loading Syllabus Workspace...
                </div>
            </div>
        );
    }

    /* =====================================================
        PAGE
    ===================================================== */

    return (
        <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">

            {/* BACK NAVIGATION & QUICK TODAY BUTTON BAR */}
            <div className="flex items-center justify-between pt-4 flex-wrap gap-3">

                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>

                    <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 tracking-tight">
                            Back to Today Dashboard
                        </span>
                    </div>
                </Link>

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

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            Curriculum Foundation
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                            Syllabus Planner
                        </h1>

                        <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
                            Build and manage your teaching curriculum with academic precision.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">

                        <button
                            type="button"
                            onClick={openCloneModal}
                            disabled={
                                !activeClass ||
                                data.classes.length <
                                2
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Copy className="h-4 w-4" />
                            Clone Syllabus
                        </button>

                    </div>
                </div>
            </section>

            {/* MAIN CONTENT WORKSPACE */}
            <main className="space-y-6">

                {/* SELECT CLASS DROPDOWN BAR */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">

                            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-2xl shrink-0">
                                <Layers className="w-5 h-5" />
                            </div>

                            <div className="w-full sm:max-w-md">

                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Class / Semester Workspace *
                                </label>

                                <select
                                    value={
                                        activeClassId ||
                                        ''
                                    }
                                    onChange={(e) =>
                                        setActiveClassId(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full px-4 py-2.5 text-sm font-black rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        -- Select Class / Semester Workspace --
                                    </option>

                                    {data.classes.map(
                                        (
                                            cls: any
                                        ) => (
                                            <option
                                                key={
                                                    cls.id
                                                }
                                                value={
                                                    cls.id
                                                }
                                            >
                                                🎓{' '}
                                                {
                                                    cls.name
                                                }{' '}
                                                (
                                                {
                                                    cls.stream ||
                                                    'General'
                                                }
                                                )
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:pt-0 flex-wrap">

                            {activeClass && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleDeleteClass(
                                            activeClass
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl shadow-sm transition"
                                    title="Delete Active Workspace"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Class
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={
                                    openClassModal
                                }
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Class/Semester Workspace
                            </button>

                        </div>
                    </div>
                </div>

                {/* GUIDE STATE OR ACTIVE WORKSPACE */}
                {!activeClass ? (

                    <section className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm space-y-8 animate-in fade-in">

                        <div className="flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 pb-8">

                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shrink-0">
                                <BookMarked className="h-8 w-8" />
                            </div>

                            <div className="text-center md:text-left">

                                <h2 className="text-xl font-black text-slate-900">
                                    Welcome to the Syllabus Planner
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    Select a class workspace using the dropdown above to begin organising your curriculum, subjects, and lesson registers.
                                </p>

                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">

                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs">
                                    1
                                </div>

                                <h4 className="text-sm font-black text-slate-900">
                                    Create Workspaces
                                </h4>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Register classes, semesters, or academic batches using the <strong className="text-slate-900">Add New Class/Semester Workspace</strong> button.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">

                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs">
                                    2
                                </div>

                                <h4 className="text-sm font-black text-slate-900">
                                    Add Subjects & Units
                                </h4>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Map out paper codes, target lecture hours, modules, and detailed unit structures.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">

                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs">
                                    3
                                </div>

                                <h4 className="text-sm font-black text-slate-900">
                                    Track & Clone
                                </h4>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Monitor planned vs. actual progress in real-time or clone templates across sections instantly.
                                </p>
                            </div>

                        </div>
                    </section>

                ) : (

                    <div className="space-y-6 animate-in fade-in">

                        {/* ACTIVE CLASS BANNER */}
                        <section
                            className={`rounded-3xl p-6 shadow-xl transition-colors duration-300 ${activePalette.bg}`}
                        >

                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                                <div>

                                    <div className="flex items-center gap-2 flex-wrap mb-2">

                                        <div
                                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${activePalette.badge}`}
                                        >
                                            <span className="h-2 w-2 rounded-full bg-amber-300"></span>
                                            Active Workspace
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setActiveClassId(
                                                    null
                                                )
                                            }
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white hover:bg-slate-100 text-red-600 font-extrabold text-[11px] transition shadow-sm"
                                        >
                                            <ListFilter className="w-3.5 h-3.5 text-red-600" />
                                            Click to Select Other Classes
                                        </button>

                                    </div>

                                    <h2
                                        className={`mt-2 text-2xl font-black ${activePalette.text}`}
                                    >
                                        {activeClass.name}
                                    </h2>

                                    <p
                                        className={`mt-1 text-xs ${activePalette.text} opacity-85`}
                                    >
                                        {activeClass.stream ||
                                            'General / Academic'}{' '}
                                        • Complete syllabus overview & curriculum control
                                    </p>

                                </div>

                                <div className="grid grid-cols-3 gap-3">

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-center border border-white/20">

                                        <div
                                            className={`text-2xl font-black ${activePalette.text}`}
                                        >
                                            {
                                                activeStats
                                                    .courses
                                                    .length
                                            }
                                        </div>

                                        <div
                                            className={`text-[10px] font-bold uppercase tracking-wider ${activePalette.text} opacity-85`}
                                        >
                                            Subjects
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-center border border-white/20">

                                        <div
                                            className={`text-2xl font-black ${activePalette.text}`}
                                        >
                                            {
                                                activeStats
                                                    .units
                                                    .length
                                            }
                                        </div>

                                        <div
                                            className={`text-[10px] font-bold uppercase tracking-wider ${activePalette.text} opacity-85`}
                                        >
                                            Units
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-center border border-white/20">

                                        <div
                                            className={`text-2xl font-black ${activePalette.text}`}
                                        >
                                            {
                                                activeStats
                                                    .topics
                                                    .length
                                            }
                                        </div>

                                        <div
                                            className={`text-[10px] font-bold uppercase tracking-wider ${activePalette.text} opacity-85`}
                                        >
                                            Topics
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* PROGRESS BAR */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>

                                    <div>

                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Planned Curriculum
                                        </p>

                                        <p className="text-sm font-black text-slate-800">
                                            {
                                                activeStats.plannedPeriods
                                            }{' '}
                                            of{' '}
                                            {
                                                activeStats.targetPeriods
                                            }{' '}
                                            periods planned
                                        </p>

                                    </div>
                                </div>

                                <div className="flex items-center gap-3">

                                    <div className="h-3 w-40 overflow-hidden rounded-full bg-slate-100">

                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all"
                                            style={{
                                                width: `${activeStats.progress}%`,
                                            }}
                                        />

                                    </div>

                                    <span className="text-sm font-black text-blue-600">
                                        {
                                            activeStats.progress
                                        }
                                        %
                                    </span>

                                </div>
                            </div>
                        </section>

                        {/* TOOLBAR */}
                        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                                <h3 className="text-base font-black uppercase tracking-wider text-slate-800">
                                    Subjects / Papers
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Organise your curriculum from subject down to specific topics.
                                </p>

                            </div>

                            <div className="flex flex-wrap gap-2">

                                <button
                                    type="button"
                                    onClick={
                                        openCourseModal
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-blue-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Subject
                                </button>

                                {activeClassCourses.length >
                                    0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openUnitModal(
                                                    activeClassCourses[0]
                                                        .id
                                                )
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            <Layers className="h-4 w-4" />
                                            Add Unit
                                        </button>
                                    )}

                            </div>
                        </section>

                        {/* SUBJECT LIST */}
                        {activeClassCourses.length ===
                            0 ? (

                            <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <BookOpen className="h-7 w-7" />
                                </div>

                                <h3 className="mt-4 text-base font-black text-slate-900">
                                    No subjects added yet
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
                                    Add a subject or paper to begin building the syllabus for this workspace.
                                </p>

                                <div className="mt-5 flex justify-center">

                                    <button
                                        type="button"
                                        onClick={
                                            openCourseModal
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold uppercase text-white shadow-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Subject
                                    </button>

                                </div>
                            </section>

                        ) : (

                            <section className="space-y-4">

                                {activeClassCourses.map(
                                    (
                                        course,
                                        courseIndex
                                    ) => {

                                        const courseUnits =
                                            getCourseUnits(
                                                course.id
                                            );

                                        const courseTopics =
                                            courseUnits.reduce(
                                                (
                                                    total,
                                                    unit
                                                ) =>
                                                    total +
                                                    getUnitTopics(
                                                        unit.id
                                                    ).length,
                                                0
                                            );

                                        const coursePlanned =
                                            courseUnits.reduce(
                                                (
                                                    total,
                                                    unit
                                                ) =>
                                                    total +
                                                    getUnitTopics(
                                                        unit.id
                                                    ).reduce(
                                                        (
                                                            sum,
                                                            topic: any
                                                        ) =>
                                                            sum +
                                                            (Number(
                                                                topic.plannedClasses
                                                            ) ||
                                                                0),
                                                        0
                                                    ),
                                                0
                                            );

                                        const expanded =
                                            expandedCourses[
                                            course.id
                                            ] ?? true;

                                        const courseHoursVal = Number((course as any).hours ?? (course as any).targetHours ?? 45);

                                        return (

                                            <div
                                                key={
                                                    course.id
                                                }
                                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                            >

                                                {/* SUBJECT HEADER */}
<div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

                                            <div className="flex min-w-0 items-center gap-4">

                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                                                    <span className="text-sm font-black">
                                                        {
                                                            courseIndex +
                                                            1
                                                        }
                                                    </span>

                                                </div>

                                                <div className="min-w-0">

                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <h4 className="truncate text-base font-black text-slate-900">
                                                            {
                                                                course.name
                                                            }
                                                        </h4>

                                                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                                                            {
                                                                course.code
                                                            }
                                                        </span>

                                                    </div>

                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">

                                                        {/* Clickable Units Badge */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExpandedCourses(prev => ({ ...prev, [course.id]: true }));
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 font-bold transition shadow-xs"
                                                            title="Click to view/expand units"
                                                        >
                                                            <Layers className="w-3 h-3" />
                                                            {courseUnits.length} units
                                                        </button>

                                                        <span>•</span>

                                                        {/* Clickable Topics Badge */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExpandedCourses(prev => ({ ...prev, [course.id]: true }));
                                                                // Expand all units for this course
                                                                const newExpandedUnits = { ...expandedUnits };
                                                                courseUnits.forEach(u => { newExpandedUnits[u.id] = true; });
                                                                setExpandedUnits(newExpandedUnits);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 font-bold transition shadow-xs"
                                                            title="Click to expand units and view all topics"
                                                        >
                                                            <Target className="w-3 h-3" />
                                                            {courseTopics} topics
                                                        </button>

                                                        <span>•</span>

                                                        <span>
                                                            {
                                                                coursePlanned
                                                            }{' '}
                                                            /{' '}
                                                            {
                                                                courseHoursVal
                                                            }{' '}
                                                            periods
                                                        </span>

                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                {/* Action buttons remain unchanged */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openUnitModal(
                                                            course.id
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Unit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteCourse(
                                                            course
                                                        )
                                                    }
                                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete Subject"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleCourse(
                                                            course.id
                                                        )
                                                    }
                                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                                                    title={
                                                        expanded
                                                            ? 'Collapse Subject'
                                                            : 'Expand Subject'
                                                    }
                                                >
                                                    {expanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>

                                            </div>
                                        </div>

                                                {/* UNITS CONTAINER */}
                                                {expanded && (
                                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">

                                                        {courseUnits.length ===
                                                            0 ? (

                                                            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">

                                                                <Layers className="mx-auto h-6 w-6 text-slate-400" />

                                                                <p className="mt-2 text-xs font-medium text-slate-500">
                                                                    No units added yet.
                                                                </p>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openUnitModal(
                                                                            course.id
                                                                        )
                                                                    }
                                                                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold uppercase text-white shadow-sm"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Add Unit
                                                                </button>

                                                            </div>

                                                        ) : (

                                                            <div className="space-y-3">

                                                                {courseUnits.map(
                                                                    (
                                                                        unit: any
                                                                    ) => {

                                                                        const unitTopics =
                                                                            getUnitTopics(
                                                                                unit.id
                                                                            );

                                                                        const unitExpanded =
                                                                            expandedUnits[
                                                                            unit.id
                                                                            ] ??
                                                                            true;

                                                                        const unitNum = unit.unitNumber ?? unit.order ?? 1;
                                                                        const unitTitleStr = unit.name ?? unit.title ?? 'Unit';

                                                                        return (

                                                                            <div
                                                                                key={
                                                                                    unit.id
                                                                                }
                                                                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
                                                                            >

                                                                                {/* UNIT HEADER */}
                                                                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">

                                                                                    <div className="flex min-w-0 items-center gap-3">

                                                                                        <span className="shrink-0 rounded-lg bg-indigo-900 px-2.5 py-1 text-xs font-black text-white">
                                                                                            U
                                                                                            {
                                                                                                unitNum
                                                                                            }
                                                                                        </span>

                                                                                        <div className="min-w-0">

                                                                                            <p className="truncate text-sm font-black text-slate-800">
                                                                                                {
                                                                                                    unitTitleStr
                                                                                                }
                                                                                            </p>

                                                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                                                {
                                                                                                    unitTopics.length
                                                                                                }{' '}
                                                                                                teaching topics
                                                                                            </p>

                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex shrink-0 items-center gap-2">

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                openTopicModal(
                                                                                                    unit.id
                                                                                                )
                                                                                            }
                                                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                                                                        >
                                                                                            <Plus className="h-3.5 w-3.5" />
                                                                                            Topic
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleDeleteUnit(
                                                                                                    unit
                                                                                                )
                                                                                            }
                                                                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                                                            title="Delete Unit"
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                toggleUnit(
                                                                                                    unit.id
                                                                                                )
                                                                                            }
                                                                                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                                                                            title={
                                                                                                unitExpanded
                                                                                                    ? 'Collapse Unit'
                                                                                                    : 'Expand Unit'
                                                                                            }
                                                                                        >
                                                                                            {unitExpanded ? (
                                                                                                <ChevronDown className="h-4 w-4" />
                                                                                            ) : (
                                                                                                <ChevronRight className="h-4 w-4" />
                                                                                            )}
                                                                                        </button>

                                                                                    </div>
                                                                                </div>

                                                                                {/* TOPICS */}
                                                                                {unitExpanded && (
                                                                                    <div className="border-t border-slate-100 bg-slate-50/70 p-3">

                                                                                        {unitTopics.length ===
                                                                                            0 ? (

                                                                                            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-400">
                                                                                                No teaching topics added yet.
                                                                                            </div>

                                                                                        ) : (

                                                                                            <div className="space-y-2">

                                                                                                {unitTopics.map(
                                                                                                    (
                                                                                                        topic: any,
                                                                                                        index
                                                                                                    ) => {
                                                                                                        const topicNameStr = topic.name ?? topic.title ?? 'Topic';
                                                                                                        return (
                                                                                                            <div
                                                                                                                key={
                                                                                                                    topic.id
                                                                                                                }
                                                                                                                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
                                                                                                            >

                                                                                                                <div className="min-w-0">

                                                                                                                    <div className="flex items-center gap-3">

                                                                                                                        <span className="shrink-0 text-xs font-bold text-slate-400">
                                                                                                                            {
                                                                                                                                index +
                                                                                                                                1
                                                                                                                            }
                                                                                                                        </span>

                                                                                                                        <span className="text-sm font-medium text-slate-800">
                                                                                                                            {
                                                                                                                                topicNameStr
                                                                                                                            }
                                                                                                                        </span>

                                                                                                                    </div>
                                                                                                                </div>

                                                                                                                <div className="flex shrink-0 items-center gap-3">

                                                                                                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">

                                                                                                                        <Clock3 className="h-3 w-3" />

                                                                                                                        {
                                                                                                                            topic.plannedClasses
                                                                                                                        }{' '}
                                                                                                                        periods

                                                                                                                    </span>

                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() =>
                                                                                                                            handleDeleteTopic(
                                                                                                                                topic
                                                                                                                            )
                                                                                                                        }
                                                                                                                        className="rounded p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                                                                                                                        title="Delete Topic"
                                                                                                                    >
                                                                                                                        <X className="h-4 w-4" />
                                                                                                                    </button>

                                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                )}

                                                                                            </div>
                                                                                        )}

                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}

                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* =====================================================
                MODALS
            ===================================================== */}

            {/* ADD CLASS / SEMESTER MODAL */}
            {isClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsClassModalOpen(
                                false
                            );
                            setSessionClassesAdded(
                                0
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

                                <div>

                                    <h3 className="text-base font-black text-slate-900">
                                        Add Class / Semester Workspace
                                    </h3>

                                    {sessionClassesAdded >
                                        0 && (
                                            <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                                                {
                                                    sessionClassesAdded
                                                }{' '}
                                                workspace
                                                {sessionClassesAdded >
                                                    1
                                                    ? 's'
                                                    : ''}{' '}
                                                added in this session
                                            </p>
                                        )}

                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsClassModalOpen(
                                        false
                                    );
                                    setSessionClassesAdded(
                                        0
                                    );
                                }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>

                        </div>

                        <form
                            onSubmit={(e) =>
                                handleSaveClass(
                                    e,
                                    false
                                )
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Class / Semester Name *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. Class 6, Semester 1, BA First Year"
                                    value={
                                        newClassName
                                    }
                                    onChange={(e) =>
                                        setNewClassName(
                                            e.target
                                                .value
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
                                    onChange={(e) => {
                                        setNewClassStream(
                                            e.target
                                                .value
                                        );

                                        if (
                                            e.target
                                                .value !==
                                            'Other / Custom'
                                        ) {
                                            setCustomClassStream(
                                                ''
                                            );
                                        }
                                    }}
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

                                {newClassStream ===
                                    'Other / Custom' && (
                                        <input
                                            type="text"
                                            placeholder="Enter Custom Stream"
                                            value={
                                                customClassStream
                                            }
                                            onChange={(e) =>
                                                setCustomClassStream(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            required
                                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}

                            </div>

                            {sessionClassesAdded >
                                0 && (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">

                                        <div className="flex items-start gap-2">

                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                                            <div>

                                                <p className="font-black">
                                                    Workspace added successfully.
                                                </p>

                                                <p className="mt-0.5 leading-5 text-emerald-700">
                                                    You can continue adding your other classes or semesters below.
                                                </p>

                                            </div>

                                        </div>
                                    </div>
                                )}

                            <div className="flex flex-col gap-2 border-t pt-4">

                                <button
                                    type="submit"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white shadow-sm transition hover:bg-blue-700"
                                >
                                    <Check className="h-4 w-4" />
                                    Create Workspace
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleSaveClass(
                                            undefined,
                                            true
                                        )
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-blue-50 px-5 py-3 text-xs font-black uppercase text-blue-700 shadow-sm transition hover:bg-blue-100"
                                >
                                    <Plus className="h-4 w-4" />
                                    Save & Add More Classes / Semesters
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsClassModalOpen(
                                            false
                                        );
                                        setSessionClassesAdded(
                                            0
                                        );
                                    }}
                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ADD SUBJECT MODAL */}
            {isCourseModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsCourseModalOpen(
                                false
                            );
                        }
                    }}
                >

                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <BookOpen className="h-5 w-5" />
                                </div>

                                <h3 className="text-base font-black text-slate-900">
                                    Add Subject / Paper
                                </h3>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsCourseModalOpen(
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
                                handleSaveCourse
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Subject Name *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. Communicative English"
                                    value={
                                        courseName
                                    }
                                    onChange={(e) =>
                                        setCourseName(
                                            e.target
                                                .value
                                        )
                                    }
                                    required
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Paper Code *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. ENG-101"
                                    value={
                                        courseCode
                                    }
                                    onChange={(e) =>
                                        setCourseCode(
                                            e.target
                                                .value
                                        )
                                    }
                                    required
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium uppercase outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Target Teaching Periods
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        courseHours
                                    }
                                    onChange={(e) =>
                                        setCourseHours(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsCourseModalOpen(
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
                                    <Check className="h-4 w-4" />
                                    Save Subject
                                </button>

                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD UNIT MODAL */}
            {isUnitModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsUnitModalOpen(
                                false
                            );
                        }
                    }}
                >

                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                    <Layers className="h-5 w-5" />
                                </div>

                                <h3 className="text-base font-black text-slate-900">
                                    Add Unit
                                </h3>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsUnitModalOpen(
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
                                handleSaveUnit
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Subject / Paper *
                                </label>

                                <select
                                    value={
                                        targetCourseIdForUnit
                                    }
                                    onChange={(e) =>
                                        setTargetCourseIdForUnit(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Select subject
                                    </option>

                                    {activeClassCourses.map(
                                        (
                                            course
                                        ) => (
                                            <option
                                                key={
                                                    course.id
                                                }
                                                value={
                                                    course.id
                                                }
                                            >
                                                {
                                                    course.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Unit Number
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        unitNumber
                                    }
                                    onChange={(e) =>
                                        setUnitNumber(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Unit Title *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. Classical Thinkers"
                                    value={
                                        unitName
                                    }
                                    onChange={(e) =>
                                        setUnitName(
                                            e.target
                                                .value
                                        )
                                    }
                                    required
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsUnitModalOpen(
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
                                    <Check className="h-4 w-4" />
                                    Save Unit
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ADD TOPIC MODAL */}
            {isTopicModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsTopicModalOpen(
                                false
                            );
                        }
                    }}
                >

                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Target className="h-5 w-5" />
                                </div>

                                <h3 className="text-base font-black text-slate-900">
                                    Add Teaching Topic
                                </h3>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsTopicModalOpen(
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
                                handleSaveTopic
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Unit *
                                </label>

                                <select
                                    value={
                                        targetUnitIdForTopic
                                    }
                                    onChange={(e) =>
                                        setTargetUnitIdForTopic(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Select unit
                                    </option>

                                    {activeStats.units.map(
                                        (
                                            unit: any
                                        ) => (
                                            <option
                                                key={
                                                    unit.id
                                                }
                                                value={
                                                    unit.id
                                                }
                                            >
                                                U
                                                {unit.unitNumber ?? unit.order ?? 1}
                                                {' '}—{' '}
                                                {
                                                    unit.name ?? unit.title
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Topic Title *
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g. Aristotle's Model"
                                    value={
                                        topicName
                                    }
                                    onChange={(e) =>
                                        setTopicName(
                                            e.target
                                                .value
                                        )
                                    }
                                    required
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Planned Teaching Periods
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        plannedClasses
                                    }
                                    onChange={(e) =>
                                        setPlannedClasses(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />

                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsTopicModalOpen(
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
                                    <Check className="h-4 w-4" />
                                    Save Topic
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* =====================================================
                CLONE MODAL
            ===================================================== */}

            {isCloneModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setIsCloneModalOpen(
                                false
                            );
                        }
                    }}
                >

                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">

                        <div className="mb-5 flex items-center justify-between border-b pb-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                    <Copy className="h-5 w-5" />
                                </div>

                                <div>

                                    <h3 className="text-base font-black text-slate-900">
                                        Clone Syllabus
                                    </h3>

                                    <p className="text-xs text-slate-500">
                                        Copy curriculum between workspaces
                                    </p>

                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsCloneModalOpen(
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
                                handleClone
                            }
                            className="space-y-4"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Copy From
                                </label>

                                <select
                                    value={
                                        cloneSourceId
                                    }
                                    onChange={(e) =>
                                        setCloneSourceId(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {data.classes.map(
                                        (
                                            item
                                        ) => (
                                            <option
                                                key={
                                                    item.id
                                                }
                                                value={
                                                    item.id
                                                }
                                            >
                                                {
                                                    item.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>

                            <div className="flex justify-center text-slate-400">
                                <ChevronDown className="h-5 w-5" />
                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Copy To
                                </label>

                                <select
                                    value={
                                        cloneTargetId
                                    }
                                    onChange={(e) =>
                                        setCloneTargetId(
                                            e.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >

                                    <option value="">
                                        Select target class
                                    </option>

                                    {data.classes
                                        .filter(
                                            (
                                                item
                                            ) =>
                                                item.id !==
                                                cloneSourceId
                                        )
                                        .map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item.id
                                                    }
                                                    value={
                                                        item.id
                                                    }
                                                >
                                                    {
                                                        item.name
                                                    }
                                                </option>
                                            )
                                        )}

                                </select>

                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5 text-xs leading-5 text-amber-800">
                                This will create a fresh copy of the subjects, units, and topics for the chosen target.
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsCloneModalOpen(
                                            false
                                        )
                                    }
                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-black uppercase text-white transition hover:bg-violet-700"
                                >
                                    <Copy className="h-4 w-4" />
                                    Clone Syllabus
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SyllabusPage() {
    return (
        <Suspense fallback={null}>
            <Suspense fallback={null}>
                <SyllabusContent />
            </Suspense>
        </Suspense>
    );
}