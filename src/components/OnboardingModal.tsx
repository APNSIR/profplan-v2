'use client';

import React, {
    useEffect,
    useState,
    useRef,
} from 'react';

import { useRouter } from 'next/navigation';

import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    CircleHelp,
    GraduationCap,
    Layers,
    BookOpen,
    Target,
    Plus,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Trash2,
    User,
    PhoneCall,
    Briefcase,
    Building2,
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
   CONSTANTS & ODISHA TIER CONFIGURATION
============================================================ */

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

const DRAFT_KEY = 'profplan_onboarding_odyssey_v1';

type TierId = 'primary' | 'upper_primary' | 'secondary' | 'higher_secondary' | 'ug' | 'pg';

interface TierOption {
    id: TierId;
    title: string;
    subtitle: string;
    badge: string;
    classes: string[];
}

const ODISHA_TIERS: TierOption[] = [
    {
        id: 'primary',
        title: 'Primary School Level',
        subtitle: 'Class I to Class V (Foundational)',
        badge: 'Classes 1–5',
        classes: ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V'],
    },
    {
        id: 'upper_primary',
        title: 'Upper Primary (ME Level)',
        subtitle: 'Class VI to Class VIII (Middle School)',
        badge: 'Classes 6–8',
        classes: ['Class VI', 'Class VII', 'Class VIII'],
    },
    {
        id: 'secondary',
        title: 'Secondary / High School',
        subtitle: 'Class IX & Class X (BSE Odisha / CBSE / ICSE)',
        badge: 'Classes 9–10',
        classes: ['Class IX', 'Class X'],
    },
    {
        id: 'higher_secondary',
        title: 'Higher Secondary / +2 Junior College',
        subtitle: '+2 1st Year (XI) & +2 2nd Year (XII) — Arts, Science, Commerce, Vocational',
        badge: '+2 Stream',
        classes: ['+2 1st Year (XI)', '+2 2nd Year (XII)'],
    },
    {
        id: 'ug',
        title: 'Undergraduate (UG Degree College)',
        subtitle: 'CBCS 3-Year / 4-Year Honors & Elective Semesters',
        badge: 'Sem 1–6/8',
        classes: [
            'UG Semester 1',
            'UG Semester 2',
            'UG Semester 3',
            'UG Semester 4',
            'UG Semester 5',
            'UG Semester 6',
        ],
    },
    {
        id: 'pg',
        title: 'Postgraduate (University / Autonomous)',
        subtitle: '2-Year Masters Degree (Semesters 1 to 4)',
        badge: 'PG Sem 1–4',
        classes: ['PG Semester 1', 'PG Semester 2', 'PG Semester 3', 'PG Semester 4'],
    },
];

type WizardStep = 1 | 2 | 3 | 4;


/* ============================================================
   HELPERS
============================================================ */

function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
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
    const [step, setStep] = useState<WizardStep>(1);
    const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);

    const [selectedTiers, setSelectedTiers] = useState<TierId[]>(['ug']);
    const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
    const [customClassInput, setCustomClassInput] = useState('');

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const customInputRef = useRef<HTMLInputElement | null>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);
    const modalBodyRef = useRef<HTMLDivElement | null>(null);


    /* ========================================================
       INITIAL LOAD & PERSISTENCE
    ======================================================== */

    useEffect(() => {
        const checkProfile = () => {
            try {
                const savedProfile = loadProfile();
                const existingData = load();

                const hasExistingAcademicData =
                    (existingData?.classes && existingData.classes.length > 0) ||
                    (existingData?.slots && existingData.slots.length > 0);

                if (savedProfile?.onboarded === true || hasExistingAcademicData) {
                    if (!savedProfile?.onboarded && hasExistingAcademicData) {
                        saveProfile({
                            ...(savedProfile || EMPTY_PROFILE),
                            onboarded: true,
                        });
                    }
                    setProfile(savedProfile || EMPTY_PROFILE);
                    setIsOpen(false);
                    return;
                }

                setProfile(savedProfile || EMPTY_PROFILE);

                try {
                    const draftRaw = window.localStorage.getItem(DRAFT_KEY);
                    if (draftRaw) {
                        const parsed = JSON.parse(draftRaw);
                        if (parsed.profile) setProfile((p) => ({ ...p, ...parsed.profile }));
                        if (Array.isArray(parsed.selectedTiers)) setSelectedTiers(parsed.selectedTiers);
                        if (Array.isArray(parsed.assignedClasses)) setAssignedClasses(parsed.assignedClasses);
                    }
                } catch {
                    // Ignore
                }

                setStep(1);
                setIsOpen(true);
            } catch (error) {
                console.error('ProfPlan Odyssey load error:', error);
                setProfile(EMPTY_PROFILE);
                setStep(1);
                setIsOpen(false);
            }
        };

        checkProfile();

        const handleProfileChange = () => checkProfile();
        window.addEventListener('profplan-profile-change', handleProfileChange);
        return () => window.removeEventListener('profplan-profile-change', handleProfileChange);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        try {
            window.localStorage.setItem(
                DRAFT_KEY,
                JSON.stringify({
                    profile,
                    selectedTiers,
                    assignedClasses,
                })
            );
        } catch {
            // Storage quota handled gracefully
        }
    }, [isOpen, profile, selectedTiers, assignedClasses]);

    useEffect(() => {
        if (editingIndex !== null) {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }
    }, [editingIndex]);

    useEffect(() => {
        if (modalBodyRef.current) {
            modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);


    /* ========================================================
       PROFILE & TIER HANDLERS
    ======================================================== */

    const updateProfile = (field: keyof UserProfile, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setErrorMessage('');
    };

    const toggleTier = (id: TierId) => {
        setSelectedTiers((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
        setErrorMessage('');
    };

    const applyPreset = (presetTiers: TierId[]) => {
        setSelectedTiers(presetTiers);
        setErrorMessage('');
    };

    const buildClassesFromTiers = () => {
        if (selectedTiers.length === 0) {
            setErrorMessage('Please select at least one educational level you teach.');
            return;
        }

        const generated: string[] = [];
        ODISHA_TIERS.forEach((tier) => {
            if (selectedTiers.includes(tier.id)) {
                generated.push(...tier.classes);
            }
        });

        setAssignedClasses(Array.from(new Set(generated)));
        setEditingIndex(null);
        setErrorMessage('');
        setStep(3);
    };


    /* ========================================================
       CLASS EDITING & MANAGEMENT (STEP 3)
    ======================================================== */

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditingValue(assignedClasses[index] || '');
        setErrorMessage('');
    };

    const saveEditing = (index: number) => {
        const trimmed = cleanText(editingValue);
        if (!trimmed) {
            setErrorMessage('Class name cannot be empty.');
            return;
        }

        const duplicate = assignedClasses.some(
            (c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
            setErrorMessage(`"${trimmed}" already exists in your list.`);
            return;
        }

        setAssignedClasses((prev) => {
            const next = [...prev];
            next[index] = trimmed;
            return next;
        });
        setEditingIndex(null);
        setEditingValue('');
        setErrorMessage('');
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditingValue('');
        setErrorMessage('');
    };

    const removeClass = (index: number) => {
        if (editingIndex === index) {
            cancelEditing();
        }
        setAssignedClasses((prev) => prev.filter((_, i) => i !== index));
    };

    const addCustomClass = () => {
        const trimmed = cleanText(customClassInput);
        if (!trimmed) return;

        if (assignedClasses.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            setErrorMessage(`"${trimmed}" is already on your list.`);
            return;
        }

        setAssignedClasses((prev) => [...prev, trimmed]);
        setCustomClassInput('');
        setErrorMessage('');
        setTimeout(() => customInputRef.current?.focus(), 40);
    };

    const resetClassesFromTiers = () => {
        const generated: string[] = [];
        ODISHA_TIERS.forEach((tier) => {
            if (selectedTiers.includes(tier.id)) {
                generated.push(...tier.classes);
            }
        });
        setAssignedClasses(Array.from(new Set(generated)));
        setEditingIndex(null);
        setErrorMessage('');
    };


    /* ========================================================
       NAVIGATION & VALIDATION
    ======================================================== */

    const goToStep2 = () => {
        if (!profile.name.trim()) {
            setErrorMessage('Please enter your full name.');
            return;
        }

        const cleanPhone = profile.mobile.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            setErrorMessage('Please enter a valid 10-digit phone or WhatsApp number.');
            return;
        }

        const cleanProfile: UserProfile = {
            ...profile,
            name: cleanText(profile.name),
            designation: cleanText(profile.designation),
            mobile: cleanPhone,
            college: cleanText(profile.college),
            department: cleanText(profile.department),
            onboarded: false,
        };
        saveProfile(cleanProfile);
        setProfile(cleanProfile);

        setErrorMessage('');
        setStep(2);
    };

    const goToStep4 = () => {
        if (assignedClasses.length === 0) {
            setErrorMessage('Please keep or add at least one class you teach.');
            return;
        }
        setErrorMessage('');
        setStep(4);
    };

    const goBack = () => {
        setEditingIndex(null);
        setErrorMessage('');
        setStep((prev) => Math.max(1, prev - 1) as WizardStep);
    };


    /* ========================================================
       FINAL SAVE (REDIRECTS TO /TODAY)
    ======================================================== */

    const completeSetup = async () => {
        if (saving) return;

        setSaving(true);
        setErrorMessage('');

        try {
            const cleanPhone = profile.mobile.replace(/\D/g, '');
            const completedProfile: UserProfile = {
                ...profile,
                name: cleanText(profile.name),
                designation: cleanText(profile.designation),
                mobile: cleanPhone,
                college: cleanText(profile.college),
                department: cleanText(profile.department),
                onboarded: true,
            };

            if (supabase) {
                try {
                    await supabase.from('profiles').upsert(
                        {
                            full_name: completedProfile.name,
                            phone: completedProfile.mobile,
                            school_name: completedProfile.college,
                            designation: completedProfile.designation,
                            department: completedProfile.department,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'phone' }
                    );
                } catch (dbErr) {
                    console.warn('Supabase sync note:', dbErr);
                }
            }

            const storeData = load();

            const existingClasses = (storeData.classes || []).filter(
                (item: ClassItem) => !String(item.id || '').startsWith('class_setup_')
            );
            const existingCourses = (storeData.courses || []).filter(
                (course: Course) => !String(course.id || '').startsWith('course_setup_')
            );
            const existingUnits = (storeData.units || []).filter(
                (unit: Unit) => !String(unit.id || '').startsWith('unit_setup_')
            );

            const newClasses: ClassItem[] = [];
            const newCourses: Course[] = [];
            const newUnits: Unit[] = [];

            const deptName = completedProfile.department || 'Primary Subject';

            assignedClasses.forEach((cName, idx) => {
                const classId = createId('class_setup');
                newClasses.push({ id: classId, name: cName });

                const courseId = createId('course_setup');
                newCourses.push({
                    id: courseId,
                    name: `${deptName} (Paper ${idx + 1})`,
                    code: `P-${idx + 1}`,
                    semester: cName,
                    department: deptName,
                    hours: 45,
                    targetHours: 45,
                    classId,
                } as Course);

                ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'].forEach((uName, uIdx) => {
                    newUnits.push({
                        id: createId('unit_setup'),
                        courseId,
                        name: uName,
                        unitNumber: uIdx + 1,
                        order: uIdx,
                    } as Unit);
                });
            });

            save({
                ...storeData,
                classes: [...existingClasses, ...newClasses],
                courses: [...existingCourses, ...newCourses],
                units: [...existingUnits, ...newUnits],
            });

            saveProfile(completedProfile);

            try {
                window.localStorage.removeItem(DRAFT_KEY);
            } catch {
                // Ignore
            }

            setProfile(completedProfile);
            setIsOpen(false);
            onComplete?.(completedProfile);

            // Redirect to Today dashboard
            router.replace('/today?setup=1');
        } catch (err) {
            console.error('ProfPlan Odyssey finish error:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Unable to complete setup.');
            setSaving(false);
        }
    };


    const stepTitles = [
        'Educator Identity',
        'Academic Levels',
        'Workspace Architect',
        'Curriculum Blueprint'
    ];
    const progress = Math.round((step / 4) * 100);

    if (!isOpen) return null;


    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="ProfPlan Gamified Setup Odyssey"
        >
            <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl">
                
                {/* 1. ATMOSPHERIC BRAND HEADER */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-5 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.4),transparent_50%)]" />

                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/30 backdrop-blur-md shadow-inner">
                                <img
                                    src="/apnsir-logo.png"
                                    alt="APNSIR Foundation"
                                    className="max-h-full max-w-full object-contain rounded-full"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                                        OdishaTeachers.com
                                    </span>
                                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[8px] font-black text-indigo-200 ring-1 ring-indigo-400/40">
                                        APNSIR FOUNDATION
                                    </span>
                                </div>
                                <p className="truncate text-sm font-extrabold text-white mt-0.5">
                                    ProfPlan Odyssey &bull; Gamified Setup
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-400/40 backdrop-blur-md shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span className="hidden sm:inline">Level {step} of 4</span>
                        </div>
                    </div>
                </div>

                {/* PROGRESS TRACKER */}
                <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-3.5 sm:px-8">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white shadow-sm">
                                {step}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">
                                Phase {step}: {stepTitles[step - 1]}
                            </span>
                        </div>
                        <span className="text-xs font-extrabold text-slate-700">{progress}% Completed</span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 transition-all duration-500 shadow-sm"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* BODY CONTENT AREA */}
                <div ref={modalBodyRef} className="min-h-0 flex-1 overflow-y-auto">

                    {/* ========================================================
                        STEP 1: EDUCATOR IDENTITY
                    ======================================================== */}
                    {step === 1 && (
                        <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                                        Welcome to Your Teaching Odyssey
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500">
                                        Let&apos;s personalize your professional digital register.
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                            </div>

                            {/* LIVE PREVIEW BADGE */}
                            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white shadow-md relative overflow-hidden">
                                <div className="absolute right-2 top-2 opacity-10">
                                    <Sparkles className="w-20 h-20 text-indigo-300" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">
                                    Live Inspection Signature Preview
                                </span>
                                <p className="text-sm font-black text-white mt-1">
                                    {profile.name || 'Dr. Atmaprakash Nayak'}
                                </p>
                                <p className="text-[11px] text-indigo-200 font-medium">
                                    {profile.designation || 'HOD of English'} · {profile.college || "People's College, Buguda"}
                                </p>
                            </div>

                            <div className="space-y-3.5 pt-1">
                                <SpecimenField icon={<User className="h-4 w-4 text-indigo-700" />} label="Full Name" required>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={profile.name}
                                        onChange={(e) => updateProfile('name', e.target.value)}
                                        placeholder="e.g. Dr. Ramesh Chandra Nayak"
                                        className={specimenInputClass}
                                    />
                                </SpecimenField>

                                <SpecimenField icon={<PhoneCall className="h-4 w-4 text-indigo-700" />} label="Phone / WhatsApp Number" required>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={profile.mobile}
                                        onChange={(e) => updateProfile('mobile', e.target.value.replace(/\D/g, ''))}
                                        placeholder="e.g. 9861012345"
                                        className={specimenInputClass}
                                    />
                                </SpecimenField>

                                <SpecimenField icon={<Briefcase className="h-4 w-4 text-indigo-700" />} label="Designation / Post">
                                    <input
                                        type="text"
                                        value={profile.designation}
                                        onChange={(e) => updateProfile('designation', e.target.value)}
                                        placeholder="e.g. Lecturer / Assistant Professor / Reader / PGT / Headmaster"
                                        className={specimenInputClass}
                                    />
                                </SpecimenField>

                                <SpecimenField icon={<Building2 className="h-4 w-4 text-indigo-700" />} label="Institution / College / School Name">
                                    <input
                                        type="text"
                                        value={profile.college}
                                        onChange={(e) => updateProfile('college', e.target.value)}
                                        placeholder="e.g. People's College, Buguda"
                                        className={specimenInputClass}
                                    />
                                </SpecimenField>

                                <SpecimenField icon={<GraduationCap className="h-4 w-4 text-indigo-700" />} label="Subject / Department">
                                    <input
                                        type="text"
                                        value={profile.department}
                                        onChange={(e) => updateProfile('department', e.target.value)}
                                        placeholder="e.g. Odia, English, Botany, Political Science, Physics"
                                        className={specimenInputClass}
                                    />
                                </SpecimenField>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: ACADEMIC LEVELS (ONE-TAP ARCHETYPES)
                    ======================================================== */}
                    {step === 2 && (
                        <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900">
                                        Select Your Academic Scope
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                        Choose your teaching levels across Odisha institutions.
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                            </div>

                            {/* INSTANT PRESET BUTTONS DECK */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    ⚡ Quick Odisha Archetypes (One-Tap Presets):
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => applyPreset(['higher_secondary'])}
                                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-extrabold border border-indigo-200 transition cursor-pointer"
                                    >
                                        +2 Junior College (+2 Arts/Sc)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset(['ug'])}
                                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-extrabold border border-blue-200 transition cursor-pointer"
                                    >
                                        UG Degree College (CBCS)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset(['secondary'])}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-200 transition cursor-pointer"
                                    >
                                        High School (Class 9-10)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-1">
                                {ODISHA_TIERS.map((tier) => {
                                    const isSelected = selectedTiers.includes(tier.id);
                                    return (
                                        <div
                                            key={tier.id}
                                            onClick={() => toggleTier(tier.id)}
                                            className={`group relative flex items-center justify-between gap-3 rounded-2xl border-2 p-4 transition cursor-pointer select-none ${
                                                isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-200/60'
                                                    : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/60'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                <div
                                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                                                        isSelected
                                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-xs sm:text-sm font-black text-slate-900">
                                                            {tier.title}
                                                        </h3>
                                                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200 shadow-2xs">
                                                            {tier.badge}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 font-medium">
                                                        {tier.subtitle}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                                {tier.classes.length} classes
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: WORKSPACE ARCHITECT (CLASSES)
                    ======================================================== */}
                    {step === 3 && (
                        <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900">
                                        Architect Your Workspaces
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                        Customize your classes and semesters for your daily routine.
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>

                            {/* INSTRUCTION CARD */}
                            <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-50 p-4 shadow-sm">
                                <p className="text-xs font-bold leading-relaxed text-indigo-950">
                                    We generated these workspaces from your selected levels. Rename, edit, or add custom batches below before building your curriculum.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-black text-slate-800">
                                    {assignedClasses.length} {assignedClasses.length === 1 ? 'Workspace' : 'Workspaces'} Active
                                </span>
                                <button
                                    type="button"
                                    onClick={resetClassesFromTiers}
                                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset to standard
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                                {assignedClasses.length === 0 ? (
                                    <div className="py-8 text-center text-xs font-semibold text-slate-400">
                                        No classes remaining. Add your specific class below.
                                    </div>
                                ) : (
                                    assignedClasses.map((className, idx) => {
                                        const isEditing = editingIndex === idx;

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between gap-3 rounded-2xl p-3 transition ${
                                                    isEditing
                                                        ? 'bg-indigo-50 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                        : 'bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-200'
                                                }`}
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input
                                                            ref={editInputRef}
                                                            type="text"
                                                            value={editingValue}
                                                            onChange={(e) => setEditingValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    saveEditing(idx);
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    cancelEditing();
                                                                }
                                                            }}
                                                            className="flex-1 rounded-xl border-2 border-indigo-500 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => saveEditing(idx)}
                                                            title="Save changes"
                                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700 transition cursor-pointer"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditing}
                                                            title="Cancel edit"
                                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-black text-indigo-700 shadow-2xs">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="truncate text-xs sm:text-sm font-black text-slate-900">
                                                                {className}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditing(idx)}
                                                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-xs cursor-pointer"
                                                            >
                                                                EDIT
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => removeClass(idx)}
                                                                title={`Delete ${className}`}
                                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="pt-1">
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Add Special Batch / Custom Class
                                </label>
                                <div className="flex gap-2.5">
                                    <input
                                        ref={customInputRef}
                                        type="text"
                                        value={customClassInput}
                                        onChange={(e) => setCustomClassInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomClass();
                                            }
                                        }}
                                        placeholder="e.g. +2 1st Year (Vocational) or PG Sem 2"
                                        className="min-w-0 flex-1 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 px-4 py-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomClass}
                                        disabled={!customClassInput.trim()}
                                        className="flex h-[46px] shrink-0 items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4" /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 4: CURRICULUM BLUEPRINT PREVIEW (GAMIFIED EXPLAINER)
                    ======================================================== */}
                    {step === 4 && (
                        <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900">
                                        Your Curriculum Hierarchy Blueprint
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                        How ProfPlan organizes your teaching register for NAAC inspection.
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 shadow-sm">
                                    <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
                                </div>
                            </div>

                            {/* HIERARCHY DIAGRAM CARD */}
                            <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-5 text-white shadow-xl space-y-3">
                                <div className="flex items-center gap-2 text-indigo-300 font-black text-xs uppercase tracking-wider">
                                    <Layers className="w-4 h-4 text-amber-400" />
                                    <span>Structural Breakdown</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20 backdrop-blur-md">
                                        <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs">
                                            <GraduationCap className="w-4 h-4" />
                                            <span>Classes ({assignedClasses.length})</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 mt-1">
                                            Active workspaces you configured in Phase 3.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20 backdrop-blur-md">
                                        <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs">
                                            <BookOpen className="w-4 h-4" />
                                            <span>Subjects (Papers)</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 mt-1">
                                            Assigned papers with target lecture hours.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20 backdrop-blur-md">
                                        <div className="flex items-center gap-2 text-violet-300 font-extrabold text-xs">
                                            <Target className="w-4 h-4" />
                                            <span>Units &amp; Topics</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 mt-1">
                                            Pre-loaded 4-unit skeletons ready for AI lesson planning.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-black">Ready to launch!</p>
                                    <p className="text-emerald-800 mt-0.5">
                                        Clicking below will initialize your IndexedDB and Supabase profile, taking you straight to your Today Dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ERROR NOTIFICATION */}
                {errorMessage && (
                    <div className="shrink-0 border-t border-rose-100 bg-rose-50 px-6 py-3">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-rose-800">
                            <CircleHelp className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* BOTTOM FOOTER NAVIGATION */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={goBack}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                type="button"
                                onClick={goToStep2}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 cursor-pointer"
                            >
                                Select Academic Levels <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={buildClassesFromTiers}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 cursor-pointer"
                            >
                                Build Workspaces ({selectedTiers.length} Levels Selected) <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={goToStep4}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 cursor-pointer"
                            >
                                Review Curriculum Blueprint <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 4 && (
                            <button
                                type="button"
                                onClick={completeSetup}
                                disabled={saving}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-indigo-200 transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                            >
                                {saving ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                                        Bootstrapping Workspace…
                                    </>
                                ) : (
                                    <>
                                        Launch My Teaching Dashboard <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}


/* ============================================================
   REUSABLE UI HELPERS & SPECIMEN STYLING
============================================================ */

const specimenInputClass = `
    w-full
    rounded-2xl
    border-2
    border-slate-200/90
    bg-slate-50/50
    px-4
    py-3
    text-xs sm:text-sm
    font-semibold
    text-indigo-950
    outline-none
    transition
    placeholder:text-slate-400
    focus:border-indigo-600
    focus:bg-white
    focus:ring-4
    focus:ring-indigo-100
`;

function SpecimenField({
    icon,
    label,
    required = false,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-950">
                {icon}
                <span>{label}</span>
                {required && <span className="text-rose-500">*</span>}
            </span>
            {children}
        </label>
    );
}