'use client';

import React, {
    useEffect,
    useMemo,
    useState,
    useRef,
} from 'react';

import { useRouter } from 'next/navigation';

import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    CircleHelp,
    GraduationCap,
    Layers3,
    MessageCircle,
    Minus,
    Plus,
    RotateCcw,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X,
} from 'lucide-react';

import {
    load,
    save,
    loadProfile,
    saveProfile,
    UserProfile,
} from '@/lib/store';

import { supabase } from '@/lib/supabaseClient';

import type {
    ClassItem,
    Course,
    Unit,
} from '@/lib/types';


/* ============================================================
   CONSTANTS & CONFIGURATION
============================================================ */

const WHATSAPP_COMMUNITY_URL =
    'https://chat.whatsapp.com/Gkm703nk0tzEojU0wol0pX?s=cl&p=i&mlu=4&ilr=4';

const EMPTY_PROFILE: UserProfile = {
    name: '',
    designation: '',
    mobile: '',
    email: '',
    institutionType: '',
    college: '',
    department: '',
    onboarded: false,
};

const DRAFT_KEY = 'profplan_onboarding_draft_v3';

const MAX_CLASSES = 20;
const MAX_SUBJECTS = 20;
const MAX_UNITS = 20;


/* ============================================================
   TYPES
============================================================ */

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

type DraftState = {
    step: WizardStep;
    profile: UserProfile;
    classNames: string[];
    subjectsByClass: string[][];
    unitsBySubject: string[][][];
};


/* ============================================================
   HELPERS
============================================================ */

function createId(prefix: string): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanText(value: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}


/* ============================================================
   COMPONENT
============================================================ */

export default function OnboardingModal({
    onComplete,
}: {
    onComplete?: (profile: UserProfile) => void;
}) {
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<WizardStep>(0);
    const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);

    // Dynamic additive state
    const [classNames, setClassNames] = useState<string[]>([]);
    const [subjectsByClass, setSubjectsByClass] = useState<string[][]>([]);
    const [unitsBySubject, setUnitsBySubject] = useState<string[][][]>([]);

    // Temporary input buffers for active row
    const [newClassName, setNewClassName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState<{ [classIdx: number]: string }>({});
    const [newUnitName, setNewUnitName] = useState<{ [key: string]: string }>({});

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [draftAvailable, setDraftAvailable] = useState(false);

    const classInputRef = useRef<HTMLInputElement | null>(null);


    /* ========================================================
       INITIAL LOAD
    ======================================================== */

    useEffect(() => {
        const checkProfile = () => {
            try {
                const savedProfile = loadProfile();

                if (savedProfile?.onboarded === true) {
                    setProfile(savedProfile);
                    setIsOpen(false);
                    return;
                }

                setProfile(savedProfile || EMPTY_PROFILE);

                try {
                    const savedDraft = window.localStorage.getItem(DRAFT_KEY);
                    if (savedDraft) {
                        const parsed = JSON.parse(savedDraft) as Partial<DraftState>;
                        if (parsed && Array.isArray(parsed.classNames) && parsed.classNames.length > 0) {
                            setDraftAvailable(true);
                        }
                    }
                } catch {
                    setDraftAvailable(false);
                }

                setStep(0);
                setIsOpen(true);
            } catch (error) {
                console.error('ProfPlan onboarding load error:', error);
                setProfile(EMPTY_PROFILE);
                setStep(0);
                setIsOpen(true);
            }
        };

        checkProfile();

        const handleProfileChange = () => checkProfile();
        window.addEventListener('profplan-profile-change', handleProfileChange);

        return () => {
            window.removeEventListener('profplan-profile-change', handleProfileChange);
        };
    }, []);


    /* ========================================================
       DRAFT PERSISTENCE
    ======================================================== */

    useEffect(() => {
        if (!isOpen) return;

        if (step === 0 && !profile.name.trim() && classNames.length === 0) {
            return;
        }

        try {
            const draft: DraftState = {
                step,
                profile,
                classNames,
                subjectsByClass,
                unitsBySubject,
            };

            window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (error) {
            console.warn('ProfPlan: unable to save onboarding draft.', error);
        }
    }, [isOpen, step, profile, classNames, subjectsByClass, unitsBySubject]);


    /* ========================================================
       PROFILE MANAGEMENT
    ======================================================== */

    const updateProfile = (field: keyof UserProfile, value: string) => {
        setProfile((previous) => ({
            ...previous,
            [field]: value,
        }));
        setErrorMessage('');
    };

    const saveCurrentProfile = () => {
        const updatedProfile: UserProfile = {
            ...profile,
            name: cleanText(profile.name),
            designation: cleanText(profile.designation),
            mobile: cleanText(profile.mobile),
            email: cleanText(profile.email),
            institutionType: cleanText(profile.institutionType),
            college: cleanText(profile.college),
            department: cleanText(profile.department),
            onboarded: false,
        };

        saveProfile(updatedProfile);
        setProfile(updatedProfile);
    };


    /* ========================================================
       DYNAMIC BUILDERS
    ======================================================== */

    const addClassItem = () => {
        const trimmed = cleanText(newClassName);
        if (!trimmed) return;

        if (classNames.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            setErrorMessage(`"${trimmed}" has already been added.`);
            return;
        }

        if (classNames.length >= MAX_CLASSES) return;

        setClassNames((prev) => [...prev, trimmed]);
        setSubjectsByClass((prev) => [...prev, []]);
        setUnitsBySubject((prev) => [...prev, []]);
        setNewClassName('');
        setErrorMessage('');

        setTimeout(() => {
            classInputRef.current?.focus();
        }, 50);
    };

    const removeClassItem = (index: number) => {
        setClassNames((prev) => prev.filter((_, i) => i !== index));
        setSubjectsByClass((prev) => prev.filter((_, i) => i !== index));
        setUnitsBySubject((prev) => prev.filter((_, i) => i !== index));
    };

    const clearAllClasses = () => {
        if (confirm('Clear all listed classes to start your own list?')) {
            setClassNames([]);
            setSubjectsByClass([]);
            setUnitsBySubject([]);
        }
    };

    const addSubjectItem = (classIndex: number) => {
        const subName = cleanText(newSubjectName[classIndex] || '');
        if (!subName) return;

        const currentSubs = subjectsByClass[classIndex] || [];
        if (currentSubs.some((s) => s.toLowerCase() === subName.toLowerCase())) {
            setErrorMessage(`"${subName}" is already added to this group.`);
            return;
        }

        if (currentSubs.length >= MAX_SUBJECTS) return;

        setSubjectsByClass((prev) => {
            const updated = prev.map((arr) => [...arr]);
            if (!updated[classIndex]) updated[classIndex] = [];
            updated[classIndex].push(subName);
            return updated;
        });

        setUnitsBySubject((prev) => {
            const updated = prev.map((classArr) => classArr.map((unitArr) => [...unitArr]));
            if (!updated[classIndex]) updated[classIndex] = [];
            updated[classIndex].push([]);
            return updated;
        });

        setNewSubjectName((prev) => ({ ...prev, [classIndex]: '' }));
        setErrorMessage('');
    };

    const removeSubjectItem = (classIndex: number, subjectIndex: number) => {
        setSubjectsByClass((prev) => {
            const updated = prev.map((arr) => [...arr]);
            if (updated[classIndex]) {
                updated[classIndex] = updated[classIndex].filter((_, i) => i !== subjectIndex);
            }
            return updated;
        });

        setUnitsBySubject((prev) => {
            const updated = prev.map((classArr) => classArr.map((unitArr) => [...unitArr]));
            if (updated[classIndex]) {
                updated[classIndex] = updated[classIndex].filter((_, i) => i !== subjectIndex);
            }
            return updated;
        });
    };

    const addUnitItem = (classIndex: number, subjectIndex: number) => {
        const key = `${classIndex}-${subjectIndex}`;
        const unitName = cleanText(newUnitName[key] || '');
        if (!unitName) return;

        const currentUnits = unitsBySubject[classIndex]?.[subjectIndex] || [];
        if (currentUnits.some((u) => u.toLowerCase() === unitName.toLowerCase())) {
            setErrorMessage(`"${unitName}" is already added to this subject.`);
            return;
        }

        if (currentUnits.length >= MAX_UNITS) return;

        setUnitsBySubject((prev) => {
            const updated = prev.map((classArr) => classArr.map((unitArr) => [...unitArr]));
            if (!updated[classIndex]) updated[classIndex] = [];
            if (!updated[classIndex][subjectIndex]) updated[classIndex][subjectIndex] = [];
            updated[classIndex][subjectIndex].push(unitName);
            return updated;
        });

        setNewUnitName((prev) => ({ ...prev, [key]: '' }));
        setErrorMessage('');
    };

    const removeUnitItem = (classIndex: number, subjectIndex: number, unitIndex: number) => {
        setUnitsBySubject((prev) => {
            const updated = prev.map((classArr) => classArr.map((unitArr) => [...unitArr]));
            if (updated[classIndex]?.[subjectIndex]) {
                updated[classIndex][subjectIndex] = updated[classIndex][subjectIndex].filter((_, i) => i !== unitIndex);
            }
            return updated;
        });
    };


    /* ========================================================
       TEMPLATE
    ======================================================== */

    const loadOdishaUGTemplate = () => {
        const semesters = [
            'Semester 1',
            'Semester 2',
            'Semester 3',
            'Semester 4',
            'Semester 5',
            'Semester 6',
        ];

        const subjects = semesters.map(() => [
            'Major Paper',
            'Minor Paper',
            'Multidisciplinary / AEC',
            'SEC / VAC',
        ]);

        const units = subjects.map((classSubjects) =>
            classSubjects.map(() => [
                'Unit 1',
                'Unit 2',
                'Unit 3',
                'Unit 4',
            ])
        );

        setClassNames(semesters);
        setSubjectsByClass(subjects);
        setUnitsBySubject(units);
        setErrorMessage('');

        if (!profile.name.trim() || !profile.mobile.trim()) {
            setStep(1);
            setErrorMessage('Please provide your name and phone number to complete the setup.');
        } else {
            setStep(5);
        }
    };


    /* ========================================================
       RESUME & DISCARD DRAFT
    ======================================================== */

    const resumeDraft = () => {
        try {
            const raw = window.localStorage.getItem(DRAFT_KEY);
            if (!raw) {
                setDraftAvailable(false);
                return;
            }

            const draft = JSON.parse(raw) as DraftState;

            if (draft.profile) {
                setProfile({
                    ...EMPTY_PROFILE,
                    ...draft.profile,
                    onboarded: false,
                });
            }

            if (Array.isArray(draft.classNames) && draft.classNames.length) {
                setClassNames(draft.classNames);
            }

            if (Array.isArray(draft.subjectsByClass)) {
                setSubjectsByClass(draft.subjectsByClass);
            }

            if (Array.isArray(draft.unitsBySubject)) {
                setUnitsBySubject(draft.unitsBySubject);
            }

            const restoredStep = Number(draft.step);
            if (restoredStep >= 0 && restoredStep <= 5) {
                setStep(restoredStep as WizardStep);
            } else {
                setStep(0);
            }

            setDraftAvailable(false);
            setErrorMessage('');
        } catch (error) {
            console.error('Unable to restore draft:', error);
            setDraftAvailable(false);
        }
    };

    const discardDraft = () => {
        try {
            window.localStorage.removeItem(DRAFT_KEY);
        } catch {
            // Ignore
        }
        setDraftAvailable(false);
        setProfile(EMPTY_PROFILE);
        setClassNames([]);
        setSubjectsByClass([]);
        setUnitsBySubject([]);
        setStep(0);
    };


    /* ========================================================
       NAVIGATION & VALIDATION
    ======================================================== */

    const goToProfile = () => {
        setErrorMessage('');
        setStep(1);
    };

    const goToClasses = () => {
        if (!profile.name.trim()) {
            setErrorMessage('Please enter your full name.');
            return;
        }

        const phoneClean = profile.mobile.replace(/\D/g, '');
        if (!phoneClean || phoneClean.length < 10) {
            setErrorMessage('Please provide a valid 10-digit phone or WhatsApp number.');
            return;
        }

        saveCurrentProfile();
        setErrorMessage('');
        setStep(2);
    };

    const goToSubjects = () => {
        if (classNames.length === 0) {
            setErrorMessage('Please add at least one class or semester.');
            return;
        }
        setErrorMessage('');
        setStep(3);
    };

    const goToUnits = () => {
        const missingSub = subjectsByClass.findIndex((subs) => !subs || subs.length === 0);
        if (missingSub !== -1) {
            setErrorMessage(`Please add at least one subject for "${classNames[missingSub]}".`);
            return;
        }
        setErrorMessage('');
        setStep(4);
    };

    const goToReview = () => {
        setErrorMessage('');
        setStep(5);
    };

    const goBack = () => {
        setErrorMessage('');
        setStep((prev) => Math.max(0, prev - 1) as WizardStep);
    };


    /* ========================================================
       COUNTS
    ======================================================== */

    const classCount = classNames.length;

    const subjectCount = useMemo(
        () => subjectsByClass.reduce((acc, subs) => acc + (subs?.length || 0), 0),
        [subjectsByClass]
    );

    const unitCount = useMemo(
        () => unitsBySubject.reduce((acc, cUnits) => acc + cUnits.reduce((sAcc, uArr) => sAcc + (uArr?.length || 0), 0), 0),
        [unitsBySubject]
    );


    /* ========================================================
       FINAL SAVE (SUPABASE + LOCAL SYNC)
    ======================================================== */

    const finishSyllabusAndOpenTimetable = async () => {
        if (saving) return;
        setSaving(true);
        setErrorMessage('');

        try {
            if (!profile.name.trim()) {
                setStep(1);
                throw new Error('Please enter your full name.');
            }

            const phoneClean = profile.mobile.replace(/\D/g, '');
            if (!phoneClean || phoneClean.length < 10) {
                setStep(1);
                throw new Error('Please provide a valid 10-digit phone or WhatsApp number.');
            }

            if (classNames.length === 0) {
                setStep(2);
                throw new Error('Please add at least one class or semester.');
            }

            const completedProfile: UserProfile = {
                ...profile,
                name: cleanText(profile.name),
                designation: cleanText(profile.designation),
                mobile: phoneClean,
                email: cleanText(profile.email),
                institutionType: cleanText(profile.institutionType),
                college: cleanText(profile.college),
                department: cleanText(profile.department),
                onboarded: true,
            };

            // 1. SAVE DIRECTLY TO SUPABASE BACKEND
            if (supabase) {
                try {
                    const { error: dbError } = await supabase
                        .from('profiles')
                        .upsert(
                            {
                                full_name: completedProfile.name,
                                phone: completedProfile.mobile,
                                school_name: completedProfile.college,
                                designation: completedProfile.designation,
                                department: completedProfile.department,
                                email: completedProfile.email || null,
                                updated_at: new Date().toISOString(),
                            },
                            { onConflict: 'phone' }
                        );

                    if (dbError) {
                        console.warn('Supabase profile sync notice:', dbError.message);
                    }
                } catch (supabaseErr) {
                    console.warn('Supabase network dispatch error:', supabaseErr);
                }
            }

            // 2. CONSTRUCT SYLLABUS RECORDS FOR LOCAL WORKSPACE
            const data = load();

            const existingClasses = (data.classes || []).filter(
                (item: ClassItem) => !String(item.id || '').startsWith('class_setup_')
            );
            const existingCourses = (data.courses || []).filter(
                (course: Course) => !String(course.id || '').startsWith('course_setup_')
            );
            const existingUnits = (data.units || []).filter(
                (unit: Unit) => !String(unit.id || '').startsWith('unit_setup_')
            );

            const newClasses: ClassItem[] = [];
            const newCourses: Course[] = [];
            const newUnits: Unit[] = [];

            classNames.forEach((className, classIndex) => {
                const classId = createId('class_setup');
                newClasses.push({ id: classId, name: className });

                const subjects = subjectsByClass[classIndex] || [];
                subjects.forEach((subjectName, subjectIndex) => {
                    const courseId = createId('course_setup');
                    newCourses.push({
                        id: courseId,
                        name: subjectName,
                        code: `SUB-${classIndex + 1}-${subjectIndex + 1}`,
                        semester: className,
                        department: profile.department || 'General',
                        hours: 45,
                        targetHours: 45,
                        classId,
                    } as Course);

                    const units = unitsBySubject[classIndex]?.[subjectIndex] || [];
                    units.forEach((unitName, unitIndex) => {
                        newUnits.push({
                            id: createId('unit_setup'),
                            courseId,
                            name: unitName,
                            unitNumber: unitIndex + 1,
                            order: unitIndex,
                        } as Unit);
                    });
                });
            });

            save({
                ...data,
                classes: [...existingClasses, ...newClasses],
                courses: [...existingCourses, ...newCourses],
                units: [...existingUnits, ...newUnits],
            });

            // 3. PERSIST COMPLETED STATE LOCALLY
            saveProfile(completedProfile);

            try {
                window.localStorage.removeItem(DRAFT_KEY);
            } catch {
                // Ignore
            }

            setProfile(completedProfile);
            setIsOpen(false);
            onComplete?.(completedProfile);
            router.replace('/timetable?setup=1');
        } catch (error) {
            console.error('ProfPlan syllabus setup error:', error);
            setErrorMessage(
                error instanceof Error ? error.message : 'Unable to save your syllabus. Please try again.'
            );
            setSaving(false);
        }
    };


    const progress = step === 0 ? 0 : Math.round((step / 5) * 100);
    const stepTitle = ['Welcome', 'Your Profile', 'Classes / Semesters', 'Subjects / Papers', 'Units', 'Review'][step];

    if (!isOpen) return null;


    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="OdishaTeachers.com ProfPlan setup wizard"
        >
            <div className="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-2xl">
                {/* BRAND HEADER */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.30),transparent_45%)]" />

                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2 ring-1 ring-white/20">
                                <img
                                    src="/apnsir-logo.png"
                                    alt="APNSIR Foundation"
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300">
                                    OdishaTeachers.com &bull; APNSIR Foundation
                                </p>
                                <p className="truncate text-sm font-bold text-white">
                                    ProfPlan &bull; LessonPlan & Progress Record
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <a
                                href={WHATSAPP_COMMUNITY_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Join OdishaTeachers WhatsApp Community"
                                className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">WhatsApp Group</span>
                            </a>
                            <div className="hidden sm:flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-100 ring-1 ring-white/10">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Secure</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PROGRESS BAR */}
                {step > 0 && (
                    <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">
                                Step {step} of 5
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{stepTitle}</span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* CONTENT AREA */}
                <div className="min-h-0 flex-1 overflow-y-auto">

                    {/* STEP 0: WELCOME */}
                    {step === 0 && (
                        <div className="px-5 py-7 text-center sm:px-8 sm:py-9">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                                <GraduationCap className="h-8 w-8" />
                            </div>

                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                                Welcome to OdishaTeachers.com
                            </p>

                            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                Let’s set up your teaching plan.
                            </h1>

                            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                                ProfPlan brings your syllabus, timetable, lesson planning, and class progress together in one unified educator workspace.
                            </p>

                            <div className="mt-7 space-y-3 text-left">
                                <button
                                    type="button"
                                    onClick={loadOdishaUGTemplate}
                                    className="group w-full rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-4 text-left transition hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                            <Layers3 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                                                Recommended
                                            </span>
                                            <h2 className="mt-1 text-sm font-extrabold text-slate-900">
                                                Start with the Odisha UG Syllabus Template
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                A ready-made six-semester structure with Major, Minor, AEC, and SEC / VAC papers. Fully editable at each step.
                                            </p>
                                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                                                Use this template <ChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={goToProfile}
                                    className="group w-full rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-100"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                                                Custom Setup
                                            </span>
                                            <h2 className="mt-1 text-sm font-extrabold text-slate-900">
                                                Create My Own Custom Structure
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                Enter your own school standards (Class IX, X, +2) or college semesters, subjects, and units from scratch.
                                            </p>
                                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                                Create my setup <ChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {draftAvailable && (
                                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                                    <div className="flex items-start gap-3">
                                        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-extrabold text-amber-900">
                                                You have an unfinished setup.
                                            </p>
                                            <p className="mt-1 text-[11px] leading-5 text-amber-800">
                                                Continue where you left off or start a fresh setup.
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={resumeDraft}
                                                    className="rounded-xl bg-amber-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700"
                                                >
                                                    Continue Setup
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={discardDraft}
                                                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-800 shadow-sm hover:bg-amber-100/50"
                                                >
                                                    Start Fresh
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 1: PROFILE */}
                    {step === 1 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<UserCheck className="h-5 w-5" />}
                                eyebrow="Step 1"
                                title="Tell ProfPlan about yourself."
                                description="This information personalises your lesson plans and registers your workspace."
                            />

                            <div className="mt-6 space-y-4">
                                <Field label="Full Name" required>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={profile.name}
                                        onChange={(e) => updateProfile('name', e.target.value)}
                                        placeholder="e.g. Dr. Ramesh Chandra Nayak"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Phone / WhatsApp Number" required>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={profile.mobile}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            updateProfile('mobile', val);
                                        }}
                                        placeholder="e.g. 9861012345"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Designation">
                                    <input
                                        type="text"
                                        value={profile.designation}
                                        onChange={(e) => updateProfile('designation', e.target.value)}
                                        placeholder="e.g. Lecturer / Assistant Professor / Headmaster"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Institution Name">
                                    <input
                                        type="text"
                                        value={profile.college}
                                        onChange={(e) => updateProfile('college', e.target.value)}
                                        placeholder="e.g. People's College, Buguda"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Department / Subject Area">
                                    <input
                                        type="text"
                                        value={profile.department}
                                        onChange={(e) => updateProfile('department', e.target.value)}
                                        placeholder="e.g. Odia, English, Botany, Political Science"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CLASSES / SEMESTERS */}
                    {step === 2 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<Users className="h-5 w-5" />}
                                eyebrow="Step 2"
                                title="Which classes or semesters do you teach?"
                                description="Add, remove, or modify all classes or semesters to fit your schedule."
                            />

                            {/* EDITABILITY NOTICE BANNER */}
                            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950">
                                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-indigo-900">Customise to your need</p>
                                    <p className="mt-0.5 leading-5 text-indigo-800">
                                        These items can be edited freely. Delete unwanted items with the trash button or add school standards (e.g., <em>Class IX, +2 Arts</em>) below.
                                    </p>
                                </div>
                                {classNames.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearAllClasses}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600 transition"
                                    >
                                        <RotateCcw className="h-3 w-3" /> Clear All
                                    </button>
                                )}
                            </div>

                            <div className="mt-5 space-y-3">
                                {classNames.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">
                                        No classes added yet. Use the field below to add your teaching classes or semesters.
                                    </div>
                                ) : (
                                    classNames.map((className, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 shadow-sm"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                                                    {index + 1}
                                                </span>
                                                <span className="truncate text-sm font-bold text-slate-800">
                                                    {className}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeClassItem(index)}
                                                aria-label={`Remove ${className}`}
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-4">
                                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-indigo-900">
                                    Add Class / Semester
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        ref={classInputRef}
                                        type="text"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addClassItem();
                                            }
                                        }}
                                        placeholder="e.g. Class IX, +2 Arts, or Semester III"
                                        className={inputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={addClassItem}
                                        disabled={!newClassName.trim()}
                                        className="flex h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40 transition"
                                    >
                                        <Plus className="h-4 w-4" /> Add
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                                <span>{classCount} {classCount === 1 ? 'group' : 'groups'} added</span>
                                <span>Up to {MAX_CLASSES}</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUBJECTS */}
                    {step === 3 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<BookOpen className="h-5 w-5" />}
                                eyebrow="Step 3"
                                title="What subjects or papers do you teach?"
                                description="Add or remove the subjects and papers you teach under each class."
                            />

                            {/* EDITABILITY NOTICE BANNER */}
                            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5 text-xs text-violet-950">
                                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-violet-900">Customizable paper names</p>
                                    <p className="mt-0.5 leading-5 text-violet-800">
                                        You can remove any paper using the &times; button or add specific titles like <em>Odia Sahitya, Indian Polity, or Microeconomics</em>.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                {classNames.map((className, classIndex) => {
                                    const subs = subjectsByClass[classIndex] || [];
                                    return (
                                        <div
                                            key={`${className}-${classIndex}`}
                                            className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-600">
                                                        Academic Group
                                                    </p>
                                                    <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">
                                                        {className}
                                                    </h3>
                                                </div>
                                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                                                    {subs.length} subjects
                                                </span>
                                            </div>

                                            <div className="space-y-2 mb-3">
                                                {subs.map((subject, subjectIndex) => (
                                                    <div
                                                        key={subjectIndex}
                                                        className="flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white px-3.5 py-2.5 shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-[10px] font-black text-violet-700">
                                                                {subjectIndex + 1}
                                                            </span>
                                                            <span className="truncate text-xs font-bold text-slate-800">
                                                                {subject}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSubjectItem(classIndex, subjectIndex)}
                                                            aria-label="Remove subject"
                                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSubjectName[classIndex] || ''}
                                                    onChange={(e) =>
                                                        setNewSubjectName((prev) => ({
                                                            ...prev,
                                                            [classIndex]: e.target.value,
                                                        }))
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addSubjectItem(classIndex);
                                                        }
                                                    }}
                                                    placeholder={`Add subject for ${className}`}
                                                    className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addSubjectItem(classIndex)}
                                                    disabled={!(newSubjectName[classIndex] || '').trim()}
                                                    className="flex h-[38px] shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 transition"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: UNITS */}
                    {step === 4 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<Layers3 className="h-5 w-5" />}
                                eyebrow="Step 4"
                                title="What are the units in each subject?"
                                description="Add or customize the teaching modules or chapter units for each subject."
                            />

                            {/* EDITABILITY NOTICE BANNER */}
                            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-100/70 p-3.5 text-xs text-slate-800">
                                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-slate-900">Custom units / chapters</p>
                                    <p className="mt-0.5 leading-5 text-slate-600">
                                        Use generic labels like <em>Unit 1, Unit 2</em> or type exact chapter names like <em>Ch-1: Vedic Literature</em>.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                {classNames.map((className, classIndex) => {
                                    const subs = subjectsByClass[classIndex] || [];
                                    return (
                                        <div key={`${className}-${classIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <h3 className="text-sm font-extrabold text-slate-900 mb-3">{className}</h3>

                                            <div className="space-y-4">
                                                {subs.map((subject, subjectIndex) => {
                                                    const units = unitsBySubject[classIndex]?.[subjectIndex] || [];
                                                    const unitKey = `${classIndex}-${subjectIndex}`;
                                                    return (
                                                        <div key={`${subject}-${subjectIndex}`} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <p className="min-w-0 truncate text-xs font-extrabold text-indigo-900">
                                                                    {subject}
                                                                </p>
                                                                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                                                    {units.length} units
                                                                </span>
                                                            </div>

                                                            <div className="space-y-1.5 mb-2.5">
                                                                {units.map((unit, unitIndex) => (
                                                                    <div key={unitIndex} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[9px] font-black text-slate-600">
                                                                                {unitIndex + 1}
                                                                            </span>
                                                                            <span className="truncate text-xs font-semibold text-slate-700">
                                                                                {unit}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeUnitItem(classIndex, subjectIndex, unitIndex)}
                                                                            aria-label="Remove unit"
                                                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={newUnitName[unitKey] || ''}
                                                                    onChange={(e) =>
                                                                        setNewUnitName((prev) => ({
                                                                            ...prev,
                                                                            [unitKey]: e.target.value,
                                                                        }))
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            addUnitItem(classIndex, subjectIndex);
                                                                        }
                                                                    }}
                                                                    placeholder={`Add unit for ${subject}`}
                                                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-50"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addUnitItem(classIndex, subjectIndex)}
                                                                    disabled={!(newUnitName[unitKey] || '').trim()}
                                                                    className="flex h-[34px] shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 transition"
                                                                >
                                                                    <Plus className="h-3 w-3" /> Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: REVIEW & COMPLETE */}
                    {step === 5 && (
                        <div className="px-5 py-7 text-center sm:px-8 sm:py-8">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-100">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>

                            <div className="mt-5">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                                    Syllabus Setup Complete
                                </span>
                                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                                    Your teaching structure is ready.
                                </h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    ProfPlan now knows what you teach. The next step is to configure your weekly timetable.
                                </p>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-2">
                                <SummaryCard value={classCount} label={classCount === 1 ? 'Class / Semester' : 'Classes / Semesters'} icon={<Users className="h-4 w-4" />} />
                                <SummaryCard value={subjectCount} label="Subjects / Papers" icon={<BookOpen className="h-4 w-4" />} />
                                <SummaryCard value={unitCount} label="Units" icon={<Layers3 className="h-4 w-4" />} />
                            </div>

                            {/* DEDICATED WHATSAPP COMMUNITY INVITATION CARD */}
                            <div className="mt-5 text-left">
                                <a
                                    href={WHATSAPP_COMMUNITY_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Join OdishaTeachers WhatsApp Community"
                                    className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 transition hover:border-emerald-500 hover:shadow-lg"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-200 group-hover:scale-105 transition-transform">
                                            <MessageCircle className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                                                Teacher Support &amp; Collaboration
                                            </span>
                                            <h4 className="mt-0.5 truncate text-xs font-extrabold text-slate-900 sm:text-sm">
                                                Join the OdishaTeachers.com WhatsApp Community
                                            </h4>
                                            <p className="text-[11px] text-slate-600">
                                                Connect with fellow educators, share teaching resources &amp; circulars.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white group-hover:bg-emerald-700 transition">
                                        Join Now &rarr;
                                    </span>
                                </a>
                            </div>

                            <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                        <span className="text-sm font-black">5</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-600">Next Step</p>
                                        <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">Set up your weekly timetable</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                            Add your teaching periods, days, subjects, and rooms. ProfPlan will use this to organise your daily lesson records.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={saving}
                                onClick={finishSyllabusAndOpenTimetable}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-wait disabled:opacity-70"
                            >
                                {saving ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        Saving profile &amp; syllabus…
                                    </>
                                ) : (
                                    <>
                                        Set Up My Timetable <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            <p className="mt-3 text-center text-[10px] text-slate-400">
                                Your profile and syllabus will be securely saved before the Timetable opens.
                            </p>
                        </div>
                    )}

                </div>

                {/* ERROR MESSAGE */}
                {errorMessage && (
                    <div className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-3">
                        <div className="flex items-start gap-2 text-xs font-semibold text-red-700">
                            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* FOOTER NAVIGATION (STEPS 1 THROUGH 5) */}
                {step > 0 && (
                    <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={goBack}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>

                            {step === 1 && (
                                <button
                                    type="button"
                                    onClick={goToClasses}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"
                                >
                                    Continue <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={goToSubjects}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"
                                >
                                    Continue to Subjects <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {step === 3 && (
                                <button
                                    type="button"
                                    onClick={goToUnits}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
                                >
                                    Continue to Units <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {step === 4 && (
                                <button
                                    type="button"
                                    onClick={goToReview}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
                                >
                                    Review My Syllabus <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {step === 5 && (
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={finishSyllabusAndOpenTimetable}
                                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Proceed to Timetable <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}


/* ============================================================
   REUSABLE UI
============================================================ */

const inputClass = `
    w-full
    rounded-xl
    border-2
    border-indigo-200/80
    bg-indigo-50/30
    px-4
    py-3
    text-sm
    font-semibold
    text-slate-900
    outline-none
    transition
    placeholder:text-slate-400
    focus:border-indigo-600
    focus:bg-white
    focus:ring-4
    focus:ring-indigo-100
`;

function StepHeading({
    icon,
    eyebrow,
    title,
    description,
}: {
    icon: React.ReactNode;
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                        {eyebrow}
                    </p>
                    <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">
                        {title}
                    </h2>
                    <p className="mt-2 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">
                        {description}
                    </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    required = false,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </span>
            {children}
        </label>
    );
}

function SummaryCard({
    value,
    label,
    icon,
}: {
    value: number;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                {icon}
            </div>
            <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
            <p className="mt-0.5 text-[9px] font-bold leading-3 text-slate-400">{label}</p>
        </div>
    );
}