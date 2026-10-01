'use client';

import React, {
    Suspense,
    useEffect,
    useMemo,
    useState,
} from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import {
    Plus,
    Trash2,
    Edit3,
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
    CheckCircle2,
    MousePointerClick,
    BookCheck,
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

import AILessonPlanModal from '@/components/AILessonPlanModal';

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
        bg: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
    {
        bg: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
    {
        bg: 'bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
    {
        bg: 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
    {
        bg: 'bg-gradient-to-br from-rose-600 via-pink-700 to-rose-800',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
    {
        bg: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-indigo-900',
        text: 'text-white',
        badge: 'bg-white/20 text-white border border-white/25'
    },
];

function SyllabusContent() {
    const searchParams = useSearchParams();

    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<ProfPlanData>(emptyData());
    const [activeClassId, setActiveClassId] = useState<string | null>(null);

    // AI Lesson Plan Modal State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    // Custom Workspace Selector Dropdown State
    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

    // Progressive Disclosure Drawer State ('none' | 'subjects' | 'units' | 'topics')
    const [activeDrawer, setActiveDrawer] = useState<'none' | 'subjects' | 'units' | 'topics'>('none');

    // Dedicated APNSIR Branded Curriculum Studio View State ('overview' | 'units-studio' | 'topics-studio')
    const [viewMode, setViewMode] = useState<'overview' | 'units-studio' | 'topics-studio'>('overview');
    const [selectedCourseIdForStudio, setSelectedCourseIdForStudio] = useState<string | null>(null);
    const [selectedUnitIdForStudio, setSelectedUnitIdForStudio] = useState<string | null>(null);

    // Inline Subject, Unit & Topic Edit States
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingCourseName, setEditingCourseName] = useState('');
    const [editingCourseCode, setEditingCourseCode] = useState('');
    const [editingCourseHours, setEditingCourseHours] = useState('0');

    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [editingUnitName, setEditingUnitName] = useState('');
    const [editingUnitNumber, setEditingUnitNumber] = useState('1');

    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [editingTopicName, setEditingTopicName] = useState('');
    const [editingTopicPeriods, setEditingTopicPeriods] = useState('2');

    // Inline Class Edit States
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editingClassNameVal, setEditingClassNameVal] = useState('');
    const [editingClassStreamVal, setEditingClassStreamVal] = useState('');

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
    const [courseHours, setCourseHours] = useState('0');

    const [targetCourseIdForUnit, setTargetCourseIdForUnit] = useState('');
    const [unitNumber, setUnitNumber] = useState('');
    const [unitName, setUnitName] = useState('');

    const [targetUnitIdForTopic, setTargetUnitIdForTopic] = useState('');
    const [topicName, setTopicName] = useState('');
    const [plannedClasses, setPlannedClasses] = useState('2');

    const [cloneSourceId, setCloneSourceId] = useState('');
    const [cloneTargetId, setCloneTargetId] = useState('');

    /* =====================================================
        LOAD / REFRESH DATA & INTERCONNECTIVITY SYNC
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
        if (classId && data.classes.some((item) => String(item.id) === classId)) {
            setActiveClassId(classId);
        }
    }, [mounted, searchParams, data.classes]);

    /* =====================================================
        ACTIVE CLASS
    ===================================================== */
    const activeClassIndex = useMemo(() => {
        return (data.classes || []).findIndex((c) => String(c.id) === String(activeClassId));
    }, [data.classes, activeClassId]);

    const activePalette =
        activeClassIndex >= 0
            ? CARD_PALETTES[activeClassIndex % CARD_PALETTES.length]
            : {
                bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950',
                text: 'text-white',
                badge: 'bg-white/20 text-white border border-white/25'
            };

    const activeClass = useMemo<ClassItem | undefined>(() => {
        return data.classes.find((cls) => String(cls.id) === String(activeClassId));
    }, [data.classes, activeClassId]);

    const activeClassCourses = useMemo<Course[]>(() => {
        if (!activeClass) return [];
        return data.courses.filter(
            (course) =>
                String(course.classId) === String(activeClass.id) ||
                String(course.semester).trim().toLowerCase() === String(activeClass.name).trim().toLowerCase()
        );
    }, [data.courses, activeClass]);

    /* =====================================================
        SYLLABUS HELPERS
    ===================================================== */
    const getCourseUnits = (courseId: string): any[] => {
        return [...(data.units || [])]
            .filter((unit: any) => {
                if (String(unit.courseId) !== String(courseId)) return false;
                const titleStr = (unit.name || unit.title || '').trim();
                return titleStr.length > 0;
            })
            .sort((a: any, b: any) => {
                const numA = a.unitNumber ?? a.order ?? 0;
                const numB = b.unitNumber ?? b.order ?? 0;
                if (numA !== numB) return numA - numB;
                return (a.order ?? 0) - (b.order ?? 0);
            });
    };

    const getUnitTopics = (unitId: string): any[] => {
        return [...(data.topics || [])]
            .filter((topic: any) => {
                if (String(topic.unitId) !== String(unitId)) return false;
                const topicStr = (topic.name || topic.title || '').trim();
                return topicStr.length > 0;
            })
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    };

    const persist = (updatedData: ProfPlanData) => {
        save(updatedData);
        setData(updatedData);
        window.dispatchEvent(new Event('profplan-change'));
    };

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
        EDIT & DELETE HANDLERS
    ===================================================== */
    const handleDeleteUnit = (unit: any) => {
        const confirmed = window.confirm(`Delete "${unit.name ?? unit.title}" and all topics inside it?`);
        if (!confirmed) return;

        const updatedData = {
            ...data,
            units: (data.units || []).filter((item: any) => String(item.id) !== String(unit.id)),
            topics: (data.topics || []).filter((topic: any) => String(topic.unitId) !== String(unit.id)),
        };

        persist(updatedData);
    };

    const handleDeleteTopic = (topic: any) => {
        const confirmed = window.confirm(`Delete topic "${topic.name ?? topic.title}"?`);
        if (!confirmed) return;

        const updatedData = {
            ...data,
            topics: (data.topics || []).filter((item: any) => String(item.id) !== String(topic.id)),
        };

        persist(updatedData);
    };

    const handleSaveEditClassInline = (classItem: ClassItem) => {
        const trimmedName = editingClassNameVal.trim();
        const trimmedStream = editingClassStreamVal.trim();
        if (!trimmedName) {
            alert('Class name cannot be empty.');
            return;
        }

        const oldName = classItem.name;
        const updatedClasses = (data.classes || []).map((c: any) => {
            if (String(c.id) === String(classItem.id)) {
                return {
                    ...c,
                    name: trimmedName,
                    stream: trimmedStream || c.stream || 'General',
                };
            }
            return c;
        });

        const updatedCourses = (data.courses || []).map((co: any) => {
            if (String(co.classId) === String(classItem.id) || String(co.semester).trim().toLowerCase() === String(oldName).trim().toLowerCase()) {
                return { ...co, semester: trimmedName };
            }
            return co;
        });

        persist({ ...data, classes: updatedClasses, courses: updatedCourses });
        setEditingClassId(null);
    };

    /* =====================================================
        CLASS STATISTICS & DYNAMIC PERIOD TARGETS
    ===================================================== */
    const getClassStats = (classItem: ClassItem) => {
        const courses = data.courses.filter(
            (course) =>
                String(course.classId) === String(classItem.id) ||
                String(course.semester).trim().toLowerCase() === String(classItem.name).trim().toLowerCase()
        );

        const courseIds = new Set(courses.map((course) => String(course.id)));
        const unitsList = (data.units || []).filter((u: any) => courseIds.has(String(u.courseId)) && Boolean((u.name || u.title || '').trim()));
        const unitIds = new Set(unitsList.map((u: any) => String(u.id)));

        const topics = (data.topics || []).filter(
            (topic: any) =>
                (unitIds.has(String(topic.unitId)) || courseIds.has(String(topic.courseId))) &&
                Boolean((topic.name || topic.title || '').trim())
        );

        const plannedPeriods = topics.reduce(
            (total: number, topic: any) => total + (Number(topic.plannedClasses) || 0),
            0
        );

        const targetPeriods = courses.reduce(
            (total: number, course: any) => total + (Number(course.hours ?? course.targetHours) || 0),
            0
        );

        const effectiveTarget = targetPeriods > 0 ? targetPeriods : plannedPeriods;

        const progress =
            effectiveTarget > 0
                ? Math.min(100, Math.round((plannedPeriods / effectiveTarget) * 100))
                : topics.length > 0 ? 100 : 0;

        return {
            courses,
            units: unitsList,
            topics,
            plannedPeriods,
            targetPeriods: effectiveTarget,
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
        MODAL & FORM ACTIONS
    ===================================================== */
    const openClassModal = () => {
        setNewClassName('');
        setNewClassStream('General / Academic');
        setCustomClassStream('');
        setSessionClassesAdded(0);
        setIsClassModalOpen(true);
        setIsWorkspaceDropdownOpen(false);
    };

    const handleSaveClass = (e?: React.FormEvent, keepOpen = false) => {
        e?.preventDefault();
        const name = newClassName.trim();
        if (!name) {
            alert('Please enter a Class / Semester Name.');
            return;
        }

        const duplicate = data.classes.some(
            (item) => String(item.name).trim().toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            alert('This Class / Semester already exists.');
            return;
        }

        const stream =
            newClassStream === 'Other / Custom'
                ? customClassStream.trim()
                : newClassStream;

        const newClass: ClassItem = {
            id: createId('class'),
            name,
            stream: stream || 'General / Academic',
        } as ClassItem;

        const updatedData: ProfPlanData = {
            ...data,
            classes: [...data.classes, newClass],
        };

        persist(updatedData);
        setActiveClassId(newClass.id);

        if (keepOpen) {
            setSessionClassesAdded((count) => count + 1);
            setNewClassName('');
            setNewClassStream('General / Academic');
            setCustomClassStream('');
            return;
        }

        setIsClassModalOpen(false);
        setSessionClassesAdded(0);
    };

    const handleDeleteClass = (classItem: ClassItem) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete workspace "${classItem.name}"?

` +
            `This will permanently remove all associated subjects, units, topics, and timetable slots.

` +
            `Historical teaching records / Reports will be preserved.`
        );
        if (!confirmed) return;

        const targetCourses = data.courses.filter(
            (course) => String(course.classId) === String(classItem.id) || String(course.semester).trim().toLowerCase() === String(classItem.name).trim().toLowerCase()
        );
        const courseIds = new Set(targetCourses.map((course) => String(course.id)));
        const targetUnits = (data.units || []).filter((unit: any) => courseIds.has(String(unit.courseId)));
        const unitIds = new Set(targetUnits.map((unit: any) => String(unit.id)));

        const updatedClasses = data.classes.filter((cls) => String(cls.id) !== String(classItem.id));
        const updatedCourses = data.courses.filter((course) => !courseIds.has(String(course.id)));
        const updatedUnits = (data.units || []).filter((unit: any) => !courseIds.has(String(unit.courseId)));
        const updatedTopics = (data.topics || []).filter(
            (topic: any) => !unitIds.has(String(topic.unitId)) && !courseIds.has(String(topic.courseId))
        );
        const updatedSlots = (data.slots || []).filter(
            (slot: any) =>
                String(slot.classId) !== String(classItem.id) &&
                String(slot.semesterClass).trim().toLowerCase() !== String(classItem.name).trim().toLowerCase() &&
                !courseIds.has(String(slot.courseId))
        );

        const updatedData: ProfPlanData = {
            ...data,
            classes: updatedClasses,
            courses: updatedCourses,
            units: updatedUnits,
            topics: updatedTopics,
            slots: updatedSlots,
            logs: data.logs,
        };

        persist(updatedData);
        setIsClassModalOpen(false);
        setIsWorkspaceDropdownOpen(false);

        if (String(activeClassId) === String(classItem.id)) {
            setActiveClassId(updatedClasses.length > 0 ? String(updatedClasses[0].id) : null);
        }
    };

    const openCourseModal = () => {
        if (!activeClass) {
            alert('Please select a Class / Semester first.');
            return;
        }
        setCourseName('');
        setCourseCode('');
        setCourseHours('0');
        setIsCourseModalOpen(true);
    };

    const handleSaveCourse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeClass) return;

        const name = courseName.trim();
        const code = courseCode.trim();
        if (!name || !code) {
            alert('Please enter Subject Name and Paper Code.');
            return;
        }

        const newCourse: Course = {
            id: createId('course'),
            name,
            code,
            hours: Number(courseHours) || 0,
            targetHours: Number(courseHours) || 0,
            classId: activeClass.id,
            semester: activeClass.name,
        } as Course;

        const updatedData = {
            ...data,
            courses: [...data.courses, newCourse],
        };

        persist(updatedData);
        setExpandedCourses((previous) => ({ ...previous, [newCourse.id]: true }));
        setIsCourseModalOpen(false);
    };

    const openUnitModal = (courseId?: string) => {
        if (!activeClass) {
            alert('Please select a Class / Semester first.');
            return;
        }

        const target = courseId || activeClassCourses[0]?.id || '';
        if (!target) {
            alert('Please create a subject first.');
            return;
        }

        setTargetCourseIdForUnit(target);
        const units = getCourseUnits(target);
        setUnitNumber(String(units.length + 1));
        setUnitName('');
        setIsUnitModalOpen(true);
    };

    const openTopicModal = (unitId?: string) => {
        const target = unitId || activeStats.units[0]?.id || '';
        if (!target) {
            alert('Please create a Unit first.');
            return;
        }

        setTargetUnitIdForTopic(target);
        setTopicName('');
        setPlannedClasses('2');
        setIsTopicModalOpen(true);
    };

    const openUnitStudio = (courseId: string) => {
        setSelectedCourseIdForStudio(courseId);
        setViewMode('units-studio');
    };

    const openTopicStudio = (courseId: string, unitId?: string) => {
        setSelectedCourseIdForStudio(courseId);
        const units = getCourseUnits(courseId);
        const targetUnit = unitId || units[0]?.id || '';
        setSelectedUnitIdForStudio(targetUnit);
        setViewMode('topics-studio');
    };

    const handleSaveUnitFromStudio = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseIdForStudio) return;

        const name = unitName.trim();
        if (!name) {
            alert('Please enter a Unit Title.');
            return;
        }

        const existingUnits = getCourseUnits(selectedCourseIdForStudio);
        const number = Number(unitNumber) || existingUnits.length + 1;

        const newUnit: Unit = {
            id: createId('unit'),
            courseId: selectedCourseIdForStudio,
            name,
            title: name,
            unitNumber: number,
            order: existingUnits.length,
        } as Unit;

        const updatedData = {
            ...data,
            units: [...(data.units || []), newUnit],
        };

        persist(updatedData);
        setUnitName('');
        setUnitNumber(String(existingUnits.length + 2));
    };

    const handleSaveTopicFromStudio = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUnitIdForStudio || !selectedCourseIdForStudio) return;

        const name = topicName.trim();
        if (!name) {
            alert('Please enter a Topic Title.');
            return;
        }

        const unitTopics = getUnitTopics(selectedUnitIdForStudio);
        const newTopic: Topic = {
            id: createId('topic'),
            courseId: selectedCourseIdForStudio,
            unitId: selectedUnitIdForStudio,
            name,
            title: name,
            plannedClasses: Number(plannedClasses) || 1,
            order: unitTopics.length,
        } as Topic;

        const updatedData = {
            ...data,
            topics: [...(data.topics || []), newTopic],
        };

        persist(updatedData);
        setTopicName('');
        setPlannedClasses('2');
    };

    const openCloneModal = () => {
        if (!activeClass) return;
        const otherClass = data.classes.find((item) => String(item.id) !== String(activeClass.id));
        setCloneSourceId(String(activeClass.id));
        setCloneTargetId(otherClass ? String(otherClass.id) : '');
        setIsCloneModalOpen(true);
    };

    const handleClone = (e: React.FormEvent) => {
        e.preventDefault();
        const source = data.classes.find((item) => String(item.id) === String(cloneSourceId));
        const target = data.classes.find((item) => String(item.id) === String(cloneTargetId));
        if (!source || !target) {
            alert('Please select both source and target classes.');
            return;
        }

        if (String(source.id) === String(target.id)) {
            alert('Source and target classes must be different.');
            return;
        }

        const sourceCourses = data.courses.filter(
            (course) => String(course.classId) === String(source.id) || String(course.semester).trim().toLowerCase() === String(source.name).trim().toLowerCase()
        );

        if (sourceCourses.length === 0) {
            alert('The source class has no syllabus to clone.');
            return;
        }

        let courses = [...data.courses];
        let units = [...(data.units || [])];
        let topics = [...(data.topics || [])];

        sourceCourses.forEach((sourceCourse) => {
            const newCourseId = createId('course');
            const newCourse: Course = {
                ...sourceCourse,
                id: newCourseId,
                classId: target.id,
                semester: target.name,
            };
            courses.push(newCourse);

            const sourceUnits = (data.units || []).filter((unit: any) => String(unit.courseId) === String(sourceCourse.id));
            sourceUnits.forEach((sourceUnit: any) => {
                const newUnitId = createId('unit');
                const newUnit: any = {
                    ...sourceUnit,
                    id: newUnitId,
                    courseId: newCourseId,
                };
                units.push(newUnit);

                const sourceTopics = (data.topics || []).filter((topic: any) => String(topic.unitId) === String(sourceUnit.id));
                sourceTopics.forEach((sourceTopic: any) => {
                    topics.push({
                        ...sourceTopic,
                        id: createId('topic'),
                        courseId: newCourseId,
                        unitId: newUnitId,
                    });
                });
            });
        });

        persist({ ...data, courses, units, topics });
        setIsCloneModalOpen(false);
        alert(`Syllabus cloned successfully to ${target.name}.`);
    };

    if (!mounted) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="animate-pulse text-sm font-bold text-slate-500">
                    Loading Syllabus Workspace...
                </div>
            </div>
        );
    }

    const currentCourseForStudio = data.courses.find((c: any) => c.id === selectedCourseIdForStudio);
    const studioUnits = selectedCourseIdForStudio ? getCourseUnits(selectedCourseIdForStudio) : [];
    const currentUnitForStudio = studioUnits.find((u: any) => u.id === selectedUnitIdForStudio) || studioUnits[0];
    const studioTopics = currentUnitForStudio ? getUnitTopics(currentUnitForStudio.id) : [];

    /* =====================================================
        DEDICATED APNSIR BRANDED CURRICULUM STUDIO VIEW (UNITS / TOPICS)
    ===================================================== */
    if (viewMode !== 'overview' && currentCourseForStudio) {
        return (
            <div className="space-y-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6 pt-2 animate-in fade-in">
                
                {/* BACK TO SYLLABUS OVERVIEW BUTTON */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => setViewMode('overview')}
                        className="group inline-flex items-center gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition cursor-pointer"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <div className="text-left">
                            <span className="block text-xs font-black text-slate-800 tracking-tight">
                                Back to Syllabus Overview
                            </span>
                            <span className="block text-[10px] font-semibold text-slate-400 -mt-0.5">
                                Return to Class Workspace
                            </span>
                        </div>
                    </button>
                </div>

                {/* SIGNATURE APNSIR DEEP BLUE GRADIENT BANNER WITH LOGO */}
                <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 md:p-9 text-white shadow-2xl border border-blue-900/40">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2 ring-2 ring-white/20 backdrop-blur-md shadow-lg">
                                <Image
                                    src="/apnsir-logo.png"
                                    alt="APNSIR Foundation"
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-contain rounded-full"
                                    priority
                                />
                            </div>

                            <div>
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-4 py-1 text-xs font-extrabold tracking-wide text-blue-200 backdrop-blur-md">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                    APNSIR Curriculum Studio • {currentCourseForStudio.name} ({currentCourseForStudio.code || 'PAPER'})
                                </div>

                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
                                    {viewMode === 'units-studio' ? 'Module & Unit Management' : 'Teaching Topics & Pacing Studio'}
                                </h1>

                                <p className="mt-1 text-xs sm:text-sm text-blue-100/80 font-medium">
                                    Manage modular breakdowns, lecture scheduling, and academic progression for this subject.
                                </p>
                            </div>
                        </div>

                        {/* STUDIO MODE SWITCHER TABS */}
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setViewMode('units-studio')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                                    viewMode === 'units-studio'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-blue-200 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Units ({studioUnits.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => openTopicStudio(currentCourseForStudio.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                                    viewMode === 'topics-studio'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-blue-200 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Topics ({studioUnits.reduce((acc, u) => acc + getUnitTopics(u.id).length, 0)})
                            </button>
                        </div>
                    </div>
                </section>

                {/* VIEW 1: UNITS STUDIO */}
                {viewMode === 'units-studio' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {/* LEFT FORM: ADD UNIT */}
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-md space-y-4 h-fit">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 font-black">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Add New Unit</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Create modular division</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveUnitFromStudio} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Unit Number
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={unitNumber}
                                        onChange={(e) => setUnitNumber(e.target.value)}
                                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100 text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Unit Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Literary Movements"
                                        value={unitName}
                                        onChange={(e) => setUnitName(e.target.value)}
                                        required
                                        autoFocus
                                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100 text-slate-900"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Save &amp; Add Unit
                                </button>
                            </form>
                        </div>

                        {/* RIGHT LIST: EXISTING UNITS WITH TOPIC JUMP */}
                        <div className="lg:col-span-2 space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 px-1">
                                Configured Units for {currentCourseForStudio.name} ({studioUnits.length})
                            </h3>

                            {studioUnits.length === 0 ? (
                                <div className="rounded-[28px] border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
                                    <Layers className="mx-auto h-8 w-8 text-violet-400 animate-pulse" />
                                    <h4 className="mt-2 text-sm font-black text-slate-900">No Units Created Yet</h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Use the form on the left to create your first unit.
                                    </p>
                                </div>
                            ) : (
                                studioUnits.map((unit: any) => {
                                    const uTopics = getUnitTopics(unit.id);
                                    return (
                                        <div
                                            key={unit.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-950 text-white text-xs font-black shadow-inner">
                                                    U{unit.unitNumber || 1}
                                                </span>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900">{unit.name || unit.title}</h4>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{uTopics.length} teaching topics mapped</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => openTopicStudio(currentCourseForStudio.id, unit.id)}
                                                    className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                                                >
                                                    <Target className="w-3.5 h-3.5" /> Manage Topics →
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteUnit(unit)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer border border-slate-200"
                                                    title="Delete Unit"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW 2: TOPICS STUDIO */}
                {viewMode === 'topics-studio' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {/* LEFT FORM: ADD TOPIC */}
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-md space-y-4 h-fit">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-black">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Add Teaching Topic</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Schedule lecture periods</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveTopicFromStudio} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Select Unit *
                                    </label>
                                    <select
                                        value={selectedUnitIdForStudio || ''}
                                        onChange={(e) => setSelectedUnitIdForStudio(e.target.value)}
                                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100 text-slate-900 cursor-pointer"
                                    >
                                        {studioUnits.map((u: any) => (
                                            <option key={u.id} value={u.id} className="text-slate-900 font-bold bg-white">
                                                U{u.unitNumber || 1} — {u.name || u.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Topic Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Modernist Poetry Analysis"
                                        value={topicName}
                                        onChange={(e) => setTopicName(e.target.value)}
                                        required
                                        autoFocus
                                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100 text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Planned Teaching Periods
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={plannedClasses}
                                        onChange={(e) => setPlannedClasses(e.target.value)}
                                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100 text-slate-900"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!selectedUnitIdForStudio}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Save &amp; Add Topic
                                </button>
                            </form>
                        </div>

                        {/* RIGHT LIST: TOPICS BY UNIT */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Topics Breakdown for {currentCourseForStudio.name}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('units-studio')}
                                    className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                                >
                                    + Manage Units
                                </button>
                            </div>

                            {studioUnits.length === 0 ? (
                                <div className="rounded-[28px] border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
                                    <Target className="mx-auto h-8 w-8 text-amber-400 animate-pulse" />
                                    <h4 className="mt-2 text-sm font-black text-slate-900">No Units Available</h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Please create at least one unit before managing topics.
                                    </p>
                                </div>
                            ) : (
                                studioUnits.map((u: any) => {
                                    const uTopics = getUnitTopics(u.id);
                                    return (
                                        <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md bg-indigo-950 text-white px-2 py-0.5 text-[10px] font-black">
                                                        U{u.unitNumber || 1}
                                                    </span>
                                                    <h4 className="text-sm font-black text-slate-900">{u.name || u.title}</h4>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">{uTopics.length} topics</span>
                                            </div>

                                            {uTopics.length === 0 ? (
                                                <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                                                    No topics in this unit yet. Use the form on the left to add topics.
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5 pt-1">
                                                    {uTopics.map((topic: any, tIdx: number) => (
                                                        <div key={topic.id} className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
                                                            <span>{tIdx + 1}. {topic.name || topic.title}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                                                                    {topic.plannedClasses || 2} periods
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteTopic(topic)}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                                                    title="Delete Topic"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const hasAnyContent = activeStats.courses.length > 0 || activeStats.units.length > 0 || activeStats.topics.length > 0;

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 pt-2">

            {/* BACK NAVIGATION & QUICK TODAY BUTTON BAR */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition cursor-pointer"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>

                    <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 tracking-tight">
                            Back to Today Dashboard
                        </span>
                        <span className="block text-[10px] font-semibold text-slate-400 -mt-0.5">
                            Return to Daily Workspace
                        </span>
                    </div>
                </Link>

                <Link
                    href="/today"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                    <Home className="w-4 h-4" />
                    Go to Today Page
                </Link>
            </div>

            {/* UNIFIED HERO HEADER WITH APNSIR BRANDING */}
            <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 md:p-9 text-white shadow-2xl border border-blue-900/40">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-4 py-1 text-xs font-extrabold tracking-wide text-blue-200 backdrop-blur-md shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                            Curriculum Foundation • An Initiative by APNSIR FOUNDATION
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-1">
                            Syllabus Planner
                        </h1>

                        <p className="mt-2 text-xs sm:text-sm text-blue-100/80 font-medium max-w-2xl leading-relaxed">
                            Build and manage your teaching curriculum with academic precision, modular unit breakdowns, and instant AI lesson plan generation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsAIModalOpen(true)}
                            className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-orange-500/20 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-amber-300/40"
                        >
                            <Sparkles className="h-4 w-4 text-white animate-spin" />
                            AI Lesson Plan
                        </button>

                        <button
                            type="button"
                            onClick={openCloneModal}
                            disabled={!activeClass || data.classes.length < 2}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer backdrop-blur-md border border-white/20"
                        >
                            <Copy className="h-4 w-4" />
                            Clone Syllabus
                        </button>
                    </div>
                </div>
            </section>

            {/* MAIN CONTENT WORKSPACE */}
            <main className="space-y-6">

                {/* ELEGANT WORKSPACE SELECTOR BAR WITH FAINT HUE & COLLAPSE BUTTON */}
                <div className="relative rounded-[32px] border-2 border-indigo-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 shadow-md p-5 sm:p-6 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-950">
                                    Class / Semester Workspace *
                                </label>

                                {activeClassId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveClassId(null);
                                            setIsWorkspaceDropdownOpen(false);
                                            setActiveDrawer('none');
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-xl border border-indigo-200 shadow-xs transition cursor-pointer"
                                        title="Collapse back to unselected state"
                                    >
                                        <X className="w-3.5 h-3.5" /> Collapse / Close Workspace
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                                className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 border-indigo-200 bg-white hover:bg-indigo-50/40 text-slate-900 font-black text-sm shadow-xs transition cursor-pointer"
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                                        <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <span className="truncate">
                                        {activeClass
                                            ? `🎓 ${activeClass.name} (${activeClass.stream || 'General'})`
                                            : '-- Select Class / Semester Workspace --'}
                                    </span>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-indigo-600 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* REDESIGNED HIGH-END VISUAL DROPDOWN POPUP DECK */}
                            {isWorkspaceDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-2.5 z-50 rounded-3xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-2">
                                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                                        {data.classes.length === 0 ? (
                                            <div className="py-8 text-center text-xs font-bold text-slate-400">
                                                No workspaces created yet.
                                            </div>
                                        ) : (
                                            data.classes.map((cls: any) => {
                                                const isCurrentActive = String(cls.id) === String(activeClassId);
                                                const isEditingThisClass = editingClassId === cls.id;

                                                return (
                                                    <div
                                                        key={cls.id}
                                                        className={`group flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                                                            isCurrentActive
                                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50/80 border-2 border-indigo-400 text-indigo-950 font-black shadow-sm ring-2 ring-indigo-200/50'
                                                                : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-800 font-bold hover:border-indigo-200 hover:shadow-xs'
                                                        }`}
                                                    >
                                                        {isEditingThisClass ? (
                                                            <div className="flex items-center gap-2 w-full flex-wrap">
                                                                <input
                                                                    type="text"
                                                                    value={editingClassNameVal}
                                                                    onChange={(e) => setEditingClassNameVal(e.target.value)}
                                                                    className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                    autoFocus
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={editingClassStreamVal}
                                                                    onChange={(e) => setEditingClassStreamVal(e.target.value)}
                                                                    className="w-32 px-3.5 py-2 text-xs font-bold rounded-xl border-2 border-indigo-500 bg-white text-slate-900 outline-none"
                                                                    placeholder="Stream"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEditClassInline(cls)}
                                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingClassId(null)}
                                                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    onClick={() => {
                                                                        setActiveClassId(cls.id);
                                                                        setIsWorkspaceDropdownOpen(false);
                                                                    }}
                                                                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                                                                >
                                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-inner">
                                                                        <GraduationCap className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-black text-slate-900 truncate">
                                                                            {cls.name}
                                                                        </div>
                                                                        <div className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                                                                            {cls.stream || 'General / Academic'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingClassId(cls.id);
                                                                            setEditingClassNameVal(cls.name || '');
                                                                            setEditingClassStreamVal(cls.stream || '');
                                                                        }}
                                                                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer border border-indigo-100 shadow-2xs"
                                                                        title="Edit Class"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteClass(cls);
                                                                        }}
                                                                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer border border-rose-100 shadow-2xs"
                                                                        title="Delete Class"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* LAST OPTION: BLUE ADD CLASS BUTTON */}
                                    <div className="pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={openClassModal}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            + ADD CLASS / SEMESTER
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* GUIDE STATE OR ACTIVE WORKSPACE */}
                {!activeClass ? (
                    <section className="rounded-[32px] border border-slate-200 bg-white p-8 md:p-12 shadow-sm space-y-8 animate-in fade-in">
                        <div className="flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 pb-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shrink-0 shadow-inner">
                                <BookMarked className="h-8 w-8" />
                            </div>

                            <div className="text-center md:text-left">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                    Welcome to the Syllabus Planner
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                                    Select a class workspace using the dropdown above to begin organising your curriculum, subjects, and lesson registers.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md">
                                    1
                                </div>
                                <h4 className="text-sm font-black text-slate-900">Create Workspaces</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Register classes, semesters, or academic batches using the <strong className="text-slate-900">+ Add Class / Semester</strong> button inside the dropdown.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md">
                                    2
                                </div>
                                <h4 className="text-sm font-black text-slate-900">Add Subjects & Units</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Map out paper codes, target lecture hours, modules, and detailed unit structures.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-black text-xs shadow-md">
                                    3
                                </div>
                                <h4 className="text-sm font-black text-slate-900">Track & Clone</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Monitor planned vs. actual progress in real-time or clone templates across sections instantly.
                                </p>
                            </div>
                        </div>
                    </section>
                ) : (
                    <div className="space-y-6 animate-in fade-in">

                        {/* ACTIVE CLASS BANNER WITH INTERACTIVE METRIC CARDS */}
                        <section className={`rounded-[32px] p-6 md:p-8 shadow-xl transition-colors duration-300 ${activePalette.bg} text-white relative overflow-hidden`}>
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

                            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
                                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-black tracking-wide ${activePalette.badge} shadow-sm backdrop-blur-md`}>
                                            <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse"></span>
                                            Active Workspace
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveClassId(null);
                                                setActiveDrawer('none');
                                            }}
                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs transition shadow-sm cursor-pointer backdrop-blur-md border border-white/20"
                                        >
                                            <ListFilter className="w-3.5 h-3.5 text-amber-300" />
                                            Switch Class Workspace
                                        </button>
                                    </div>

                                    <h2 className={`mt-1 text-2xl md:text-3xl font-black ${activePalette.text}`}>
                                        {activeClass.name}
                                    </h2>

                                    <p className={`mt-1 text-xs sm:text-sm ${activePalette.text} opacity-90 font-medium`}>
                                        {activeClass.stream || 'General / Academic'} • Complete syllabus overview & curriculum control
                                    </p>
                                </div>

                                {/* INTERACTIVE CLICKABLE METRIC CARDS */}
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(activeDrawer === 'subjects' ? 'none' : 'subjects')}
                                        className="rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-3.5 text-center border border-white/25 backdrop-blur-md shadow-inner transition cursor-pointer transform hover:scale-105 active:scale-95"
                                        title="Click to manage Subjects"
                                    >
                                        <div className={`text-2xl font-black ${activePalette.text}`}>
                                            {activeStats.courses.length}
                                        </div>
                                        <div className={`text-[10px] font-extrabold uppercase tracking-wider ${activePalette.text} opacity-90 flex items-center justify-center gap-1`}>
                                            <span>Subjects</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${activeDrawer === 'subjects' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(activeDrawer === 'units' ? 'none' : 'units')}
                                        className="rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-3.5 text-center border border-white/25 backdrop-blur-md shadow-inner transition cursor-pointer transform hover:scale-105 active:scale-95"
                                        title="Click to manage Units"
                                    >
                                        <div className={`text-2xl font-black ${activePalette.text}`}>
                                            {activeStats.units.length}
                                        </div>
                                        <div className={`text-[10px] font-extrabold uppercase tracking-wider ${activePalette.text} opacity-90 flex items-center justify-center gap-1`}>
                                            <span>Units</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${activeDrawer === 'units' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(activeDrawer === 'topics' ? 'none' : 'topics')}
                                        className="rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-3.5 text-center border border-white/25 backdrop-blur-md shadow-inner transition cursor-pointer transform hover:scale-105 active:scale-95"
                                        title="Click to manage Topics"
                                    >
                                        <div className={`text-2xl font-black ${activePalette.text}`}>
                                            {activeStats.topics.length}
                                        </div>
                                        <div className={`text-[10px] font-extrabold uppercase tracking-wider ${activePalette.text} opacity-90 flex items-center justify-center gap-1`}>
                                            <span>Topics</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${activeDrawer === 'topics' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* PROGRESSIVE DISCLOSURE COLLAPSIBLE ACTION DRAWERS */}
                        {activeDrawer === 'subjects' && (
                            <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-5 shadow-md animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                                        ⚡ Quick Action: Subject Manager
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={openCourseModal}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase rounded-xl shadow cursor-pointer transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Subject to Workspace
                                    </button>
                                </div>
                                <p className="text-xs text-emerald-800 font-medium">
                                    Click the button above to add paper codes and target teaching hours for {activeClass.name}.
                                </p>
                            </div>
                        )}

                        {activeDrawer === 'units' && (
                            <div className="rounded-3xl border-2 border-violet-300 bg-violet-50/60 p-5 shadow-md animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-violet-900">
                                        ⚡ Quick Action: Unit Manager
                                    </h4>
                                    {activeClassCourses.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => openUnitModal(activeClassCourses[0].id)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-[11px] uppercase rounded-xl shadow cursor-pointer transition"
                                        >
                                            <Layers className="w-3.5 h-3.5" /> Add Unit to Subject
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-violet-800 font-medium">
                                    {activeClassCourses.length === 0
                                        ? 'Please add a subject first before mapping units.'
                                        : 'Map out modules and unit structures for your active subjects.'}
                                </p>
                            </div>
                        )}

                        {activeDrawer === 'topics' && (
                            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/60 p-5 shadow-md animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                                        ⚡ Quick Action: Topic Manager
                                    </h4>
                                    {activeStats.units.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => openTopicModal(activeStats.units[0].id)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] uppercase rounded-xl shadow cursor-pointer transition"
                                        >
                                            <Target className="w-3.5 h-3.5" /> Add Topic to Unit
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-amber-800 font-medium">
                                    {activeStats.units.length === 0
                                        ? 'Please create at least one Unit before adding teaching topics.'
                                        : 'Add precise syllabus lecture topics and planned periods.'}
                                </p>
                            </div>
                        )}

                        {/* UPGRADED SUBJECT GRADIENT PANELS WITH FROSTED GLASS UNIT & TOPIC BADGES OPENING DEDICATED APNSIR STUDIO */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Linked Subjects &amp; Curriculum Breakdown ({activeClassCourses.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={openCourseModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wide shadow-xs transition cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> + Add Subject
                                </button>
                            </div>

                            {activeClassCourses.length === 0 ? (
                                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
                                    <BookOpen className="mx-auto h-8 w-8 text-blue-600 animate-pulse" />
                                    <h4 className="mt-2 text-sm font-black text-slate-900">No Subjects Added Yet</h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Add subjects to this class workspace to view and manage their units and topics.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={openCourseModal}
                                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl shadow cursor-pointer transition"
                                    >
                                        <Plus className="w-4 h-4" /> Add Subject Now
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {activeClassCourses.map((course) => {
                                        const courseUnits = getCourseUnits(course.id);
                                        const unitCount = courseUnits.length;
                                        const topicCount = courseUnits.reduce(
                                            (sum, u) => sum + getUnitTopics(u.id).length,
                                            0
                                        );

                                        const isEmptyUnits = unitCount === 0;
                                        const isEmptyTopics = topicCount === 0;

                                        return (
                                            <div
                                                key={course.id}
                                                className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/80 to-white p-5 md:p-6 shadow-md transition-all hover:border-blue-300 hover:shadow-lg"
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                    {/* SUBJECT TITLE & META */}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 ring-1 ring-blue-300">
                                                                {course.code || 'PAPER'}
                                                            </span>
                                                            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                                {course.name}
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium mt-1">
                                                            Manage curriculum units, syllabus pacing, and daily progress.
                                                        </p>
                                                    </div>

                                                    {/* FROSTED GLASS UNIT & TOPIC BADGES OPENING THE DEDICATED APNSIR STUDIO */}
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        {/* UNIT BADGE -> OPENS UNITS STUDIO */}
                                                        <button
                                                            type="button"
                                                            onClick={() => openUnitStudio(course.id)}
                                                            className={`group/badge relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-extrabold transition cursor-pointer shadow-xs ${
                                                                isEmptyUnits
                                                                    ? 'bg-amber-500/15 border-amber-300 text-amber-900 hover:bg-amber-500/25 ring-2 ring-amber-400/20'
                                                                    : 'bg-slate-900/5 border-slate-200 text-slate-800 hover:bg-slate-900/10'
                                                            }`}
                                                            title="Click to open APNSIR Units Studio"
                                                        >
                                                            <Layers className="w-4 h-4 text-blue-600" />
                                                            <div className="text-left">
                                                                <span className="block text-[9px] uppercase tracking-wider text-slate-500">
                                                                    {isEmptyUnits ? 'Empty State' : 'Units Studio'}
                                                                </span>
                                                                <span className="block text-xs font-black">
                                                                    {unitCount} {unitCount === 1 ? 'Unit' : 'Units'} {isEmptyUnits && '• + Add'}
                                                                </span>
                                                            </div>
                                                        </button>

                                                        {/* TOPIC BADGE -> OPENS TOPICS STUDIO */}
                                                        <button
                                                            type="button"
                                                            onClick={() => openTopicStudio(course.id)}
                                                            className={`group/badge relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-extrabold transition cursor-pointer shadow-xs ${
                                                                isEmptyTopics
                                                                    ? 'bg-indigo-500/15 border-indigo-300 text-indigo-900 hover:bg-indigo-500/25 ring-2 ring-indigo-400/20'
                                                                    : 'bg-slate-900/5 border-slate-200 text-slate-800 hover:bg-slate-900/10'
                                                            }`}
                                                            title="Click to open APNSIR Topics Studio"
                                                        >
                                                            <Target className="w-4 h-4 text-indigo-600" />
                                                            <div className="text-left">
                                                                <span className="block text-[9px] uppercase tracking-wider text-slate-500">
                                                                    {isEmptyTopics ? 'No Topics yet' : 'Topics Studio'}
                                                                </span>
                                                                <span className="block text-xs font-black">
                                                                    {topicCount} {topicCount === 1 ? 'Topic' : 'Topics'} →
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* =====================================================
                MODALS
            ===================================================== */}

            {/* ADD CLASS / SEMESTER MODAL */}
            {isClassModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
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
                    <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Add Class / Semester Workspace
                                    </h3>
                                    {sessionClassesAdded > 0 && (
                                        <p className="mt-0.5 text-xs font-bold text-emerald-600">
                                            {sessionClassesAdded} workspace{sessionClassesAdded > 1 ? 's' : ''} added in this session
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsClassModalOpen(false);
                                    setSessionClassesAdded(0);
                                }}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={(e) => handleSaveClass(e, false)} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Class / Semester Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Class 6, Semester 1, BA First Year"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-900 transition"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Stream / Faculty
                                </label>
                                <select
                                    value={newClassStream}
                                    onChange={(e) => {
                                        setNewClassStream(e.target.value);
                                        if (e.target.value !== 'Other / Custom') {
                                            setCustomClassStream('');
                                        }
                                    }}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-900 cursor-pointer transition"
                                >
                                    <option value="General / Academic" className="text-slate-900 font-bold bg-white">General / Academic</option>
                                    <option value="Arts Stream" className="text-slate-900 font-bold bg-white">Arts Stream</option>
                                    <option value="Science Stream" className="text-slate-900 font-bold bg-white">Science Stream</option>
                                    <option value="Commerce Stream" className="text-slate-900 font-bold bg-white">Commerce Stream</option>
                                    <option value="Vocational" className="text-slate-900 font-bold bg-white">Vocational</option>
                                    <option value="Other / Custom" className="text-slate-900 font-bold bg-white">Other / Custom</option>
                                </select>

                                {newClassStream === 'Other / Custom' && (
                                    <input
                                        type="text"
                                        placeholder="Enter Custom Stream"
                                        value={customClassStream}
                                        onChange={(e) => setCustomClassStream(e.target.value)}
                                        required
                                        className="mt-3 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-900 transition"
                                    />
                                )}
                            </div>

                            {sessionClassesAdded > 0 && (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                                    <div className="flex items-start gap-2.5">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                        <div>
                                            <p className="font-black">Workspace added successfully.</p>
                                            <p className="mt-0.5 leading-relaxed text-emerald-700">
                                                You can continue adding your other classes or semesters below.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="submit"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-indigo-700 cursor-pointer"
                                >
                                    <Check className="h-4 w-4" />
                                    Create Workspace
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSaveClass(undefined, true)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-indigo-600 bg-indigo-50 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-indigo-700 shadow-xs transition hover:bg-indigo-100 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Save & Add More Classes / Semesters
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsClassModalOpen(false);
                                        setSessionClassesAdded(0);
                                    }}
                                    className="rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsCourseModalOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <h3 className="text-base font-black text-slate-900">
                                    Add Subject / Paper
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsCourseModalOpen(false)}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCourse} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Subject Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Communicative English"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 text-slate-900 transition"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Paper Code *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. ENG-101"
                                    value={courseCode}
                                    onChange={(e) => setCourseCode(e.target.value)}
                                    required
                                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold uppercase outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 text-slate-900 transition"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Target Teaching Periods (Optional)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={courseHours}
                                    onChange={(e) => setCourseHours(e.target.value)}
                                    placeholder="e.g. 45 (or leave 0 for automatic accumulation)"
                                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 text-slate-900 transition"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCourseModalOpen(false)}
                                    className="rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700 cursor-pointer"
                                >
                                    <Check className="h-4 w-4" />
                                    Save Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CLONE MODAL */}
            {isCloneModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsCloneModalOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-inner">
                                    <Copy className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Clone Syllabus
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Copy curriculum between workspaces
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsCloneModalOpen(false)}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleClone} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Copy From
                                </label>
                                <select
                                    value={cloneSourceId}
                                    onChange={(e) => setCloneSourceId(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-900 cursor-pointer transition"
                                >
                                    {data.classes.map((item) => (
                                        <option key={item.id} value={item.id} className="text-slate-900 font-bold bg-white">
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-center text-slate-400">
                                <ChevronDown className="h-5 w-5" />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Copy To
                                </label>
                                <select
                                    value={cloneTargetId}
                                    onChange={(e) => setCloneTargetId(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-900 cursor-pointer transition"
                                >
                                    <option value="" className="text-slate-400 bg-white">Select target class</option>
                                    {data.classes
                                        .filter((item) => String(item.id) !== String(cloneSourceId))
                                        .map((item) => (
                                            <option key={item.id} value={item.id} className="text-slate-900 font-bold bg-white">
                                                {item.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 font-medium">
                                This will create a fresh copy of the subjects, units, and topics for the chosen target.
                            </div>

                            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCloneModalOpen(false)}
                                    className="rounded-xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-violet-700 cursor-pointer"
                                >
                                    <Copy className="h-4 w-4" />
                                    Clone Syllabus
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI LESSON PLAN MODAL */}
            <AILessonPlanModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                data={data}
            />
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