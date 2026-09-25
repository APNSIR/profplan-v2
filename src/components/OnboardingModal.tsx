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
    BookOpen,
    Check,
    CheckCircle2,
    CircleHelp,
    GraduationCap,
    Info,
    Pencil,
    Plus,
    RotateCcw,
    ShieldCheck,
    Sparkles,
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

const DRAFT_KEY = 'profplan_onboarding_draft_v6';

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

type WizardStep = 1 | 2 | 3;


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

    // Selected tiers (multi-select for composite institutions)
    const [selectedTiers, setSelectedTiers] = useState<TierId[]>(['ug']);

    // Populated classes
    const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
    const [customClassInput, setCustomClassInput] = useState('');

    // Inline edit state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const customInputRef = useRef<HTMLInputElement | null>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);


    /* ========================================================
       INITIAL LOAD & PERSISTENCE
    ======================================================== */

    useEffect(() => {
        const checkProfile = () => {
            try {
                const savedProfile = loadProfile();
                const existingData = load();

                // Check whether user already has academic classes or slots created
                const hasExistingAcademicData =
                    (existingData?.classes && existingData.classes.length > 0) ||
                    (existingData?.slots && existingData.slots.length > 0);

                // IN ALL OTHER CASES: If already onboarded OR has existing classes/slots,
                // keep the modal closed and do NOT trigger any redirect.
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

                // If genuinely a brand-new user with zero data, open the wizard
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
                    // Ignore draft load errors
                }

                setStep(1);
                setIsOpen(true);
            } catch (error) {
                console.error('ProfPlan load error:', error);
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

    const goBack = () => {
        setEditingIndex(null);
        setErrorMessage('');
        setStep((prev) => Math.max(1, prev - 1) as WizardStep);
    };


    /* ========================================================
       FINAL SAVE (SUPABASE + LOCAL STORAGE)
    ======================================================== */

    const completeSetup = async () => {
        if (saving) return;

        if (assignedClasses.length === 0) {
            setErrorMessage('Please keep or add at least one class you teach.');
            return;
        }

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

            // 1. Supabase Sync
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

            // 2. Local State Assembly
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

            // ONLY when the wizard completes successfully, force open at weekly timetable:
            router.replace('/timetable?setup=1');
        } catch (err) {
            console.error('ProfPlan finish error:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Unable to complete setup.');
            setSaving(false);
        }
    };


    const stepTitle = ['Teacher Profile', 'Educational Levels', 'Assign & Edit Classes'][step - 1];
    const progress = Math.round((step / 3) * 100);

    if (!isOpen) return null;


    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="OdishaTeachers.com ProfPlan Setup Wizard"
        >
            <div className="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/40 bg-white shadow-2xl">
                
                {/* BRAND HEADER */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur-sm shadow-inner">
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
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                                        OdishaTeachers.com
                                    </span>
                                    <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                                        APNSIR
                                    </span>
                                </div>
                                <p className="truncate text-sm font-extrabold text-white">
                                    ProfPlan &bull; LessonPlan &amp; Progress Record
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Secure Setup</span>
                        </div>
                    </div>
                </div>

                {/* PROGRESS TRACKER */}
                <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-3 sm:px-7">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                                {step}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">
                                Step {step} of 3
                            </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{stepTitle}</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* BODY CONTENT AREA */}
                <div className="min-h-0 flex-1 overflow-y-auto">

                    {/* ========================================================
                        STEP 1: TEACHER PROFILE
                    ======================================================== */}
                    {step === 1 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<UserCheck className="h-6 w-6" />}
                                eyebrow="Step 1 of 3"
                                title="Welcome, Educator! Enter Your Details"
                                description="Your profile personalises your teaching diary, institutional progress register, and lesson plans."
                            />

                            {/* HIGHLIGHTED INSTRUCTION CARD */}
                            <div className="mt-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-indigo-50/90 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-indigo-950">
                                            Instant Personalisation
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800">
                                            Your name, institution, and department will be automatically embedded onto every official Lesson Plan, Progress Diary, and Timetable printout.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
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
                                        onChange={(e) => updateProfile('mobile', e.target.value.replace(/\D/g, ''))}
                                        placeholder="e.g. 9861012345"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Designation / Post">
                                    <input
                                        type="text"
                                        value={profile.designation}
                                        onChange={(e) => updateProfile('designation', e.target.value)}
                                        placeholder="e.g. Lecturer / Assistant Professor / Reader / PGT / Headmaster"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Institution / College / School Name">
                                    <input
                                        type="text"
                                        value={profile.college}
                                        onChange={(e) => updateProfile('college', e.target.value)}
                                        placeholder="e.g. People's College, Buguda"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Subject / Department">
                                    <input
                                        type="text"
                                        value={profile.department}
                                        onChange={(e) => updateProfile('department', e.target.value)}
                                        placeholder="e.g. Odia, English, Botany, Political Science, Physics"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: EDUCATIONAL LEVELS
                    ======================================================== */}
                    {step === 2 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<GraduationCap className="h-6 w-6" />}
                                eyebrow="Step 2 of 3"
                                title="Which Educational Levels Do You Teach?"
                                description="Select all categories applicable to you. You can choose multiple levels if you teach composite or combined classes."
                            />

                            {/* HIGHLIGHTED INSTRUCTION CARD */}
                            <div className="mt-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-violet-50/40 to-indigo-50/90 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                        <Info className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-indigo-950">
                                            Designed for Composite &amp; Standalone Educators
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800">
                                            If you teach in a composite college (taking both <strong>+2 Higher Secondary</strong> and <strong>UG Degree</strong> classes), or school taking both <strong>ME and High School</strong>, select all that apply. We will populate them together!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2.5">
                                {ODISHA_TIERS.map((tier) => {
                                    const isSelected = selectedTiers.includes(tier.id);
                                    return (
                                        <div
                                            key={tier.id}
                                            onClick={() => toggleTier(tier.id)}
                                            className={`group relative flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5 transition cursor-pointer select-none ${
                                                isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-200/50'
                                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
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
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                            {tier.title}
                                                        </h3>
                                                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
                                                            {tier.badge}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                                        {tier.subtitle}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 ring-1 ring-slate-200/80">
                                                {tier.classes.length} classes
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: ASSIGNED CLASSES (WITH INLINE EDIT & DELETE)
                    ======================================================== */}
                    {step === 3 && (
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <StepHeading
                                icon={<Users className="h-6 w-6" />}
                                eyebrow="Step 3 of 3"
                                title="Your Assigned Academic Groups"
                                description="Review, customize, or refine the classes you teach before opening your timetable."
                            />

                            {/* PROMINENT HIGHLIGHT INSTRUCTION CARD */}
                            <div className="mt-5 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-50 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-indigo-950">
                                            We populated these based on your chosen levels!
                                        </p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-indigo-900 font-medium">
                                            Click the <strong className="font-extrabold text-indigo-700">Pencil icon</strong> to add your stream or section (e.g. change <em>&ldquo;+2 1st Year (XI)&rdquo;</em> to <em>&ldquo;+2 1st Year (Science)&rdquo;</em>). Use the <strong className="font-extrabold text-red-700">Trash icon</strong> to remove any class you do not teach.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* CLASS LIST HEADER CONTROLS */}
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700">
                                    {assignedClasses.length} {assignedClasses.length === 1 ? 'Academic Group' : 'Academic Groups'} Configured
                                </span>
                                <button
                                    type="button"
                                    onClick={resetClassesFromTiers}
                                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                                >
                                    <RotateCcw className="h-3 w-3" /> Reset to standard
                                </button>
                            </div>

                            {/* CLASS CARDS CONTAINER */}
                            <div className="mt-2.5 max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5">
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
                                                className={`flex items-center justify-between gap-2 rounded-xl p-2.5 transition ${
                                                    isEditing
                                                        ? 'bg-indigo-50 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                        : 'bg-white border border-slate-200 shadow-sm hover:border-indigo-200'
                                                }`}
                                            >
                                                {isEditing ? (
                                                    /* INLINE EDIT MODE */
                                                    <div className="flex items-center gap-1.5 w-full">
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
                                                            className="flex-1 rounded-lg border-2 border-indigo-500 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => saveEditing(idx)}
                                                            title="Save changes"
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditing}
                                                            title="Cancel edit"
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* DISPLAY MODE (EDIT + DELETE ACTION BUTTONS) */
                                                    <>
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-black text-indigo-700">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="truncate text-xs sm:text-sm font-bold text-slate-800">
                                                                {className}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditing(idx)}
                                                                title={`Edit ${className}`}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeClass(idx)}
                                                                title={`Delete ${className}`}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* ADD CUSTOM / SPECIAL BATCH */}
                            <div className="mt-3.5">
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Add Special Batch / Custom Class
                                </label>
                                <div className="flex gap-2">
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
                                        placeholder="e.g. +2 1st Year (Vocational - Sec B) or PG Sem 2"
                                        className="min-w-0 flex-1 rounded-xl border border-indigo-200 bg-indigo-50/20 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomClass}
                                        disabled={!customClassInput.trim()}
                                        className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40 transition"
                                    >
                                        <Plus className="h-4 w-4" /> Add
                                    </button>
                                </div>
                            </div>

                            {/* PROMINENT SYLLABUS ADVISORY CARD */}
                            <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 p-4 text-left shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-emerald-950">
                                            Next: Subjects &amp; Units in Syllabus Module
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-900">
                                            No typing required here! Once setup completes, you can attach specific subjects, chapters, and topics class-wise anytime inside the dedicated <strong>Syllabus Module</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ERROR NOTIFICATION */}
                {errorMessage && (
                    <div className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                            <CircleHelp className="h-4 w-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* BOTTOM NAVIGATION FOOTER */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-7">
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={goBack}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                type="button"
                                onClick={goToStep2}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                            >
                                Select Educational Levels <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={buildClassesFromTiers}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                            >
                                Populate Classes ({selectedTiers.length} Levels Selected) <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={completeSetup}
                                disabled={saving}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-4 text-xs font-black text-white shadow-xl shadow-indigo-200 transition hover:opacity-95 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                                        Finalising Workspace…
                                    </>
                                ) : (
                                    <>
                                        Complete &amp; Launch Timetable <ArrowRight className="h-4 w-4" />
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
   REUSABLE UI HELPERS
============================================================ */

const inputClass = `
    w-full
    rounded-xl
    border-2
    border-indigo-200/80
    bg-indigo-50/20
    px-4
    py-3
    text-xs sm:text-sm
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
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                    {eyebrow}
                </p>
                <h2 className="mt-1 text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900">
                    {title}
                </h2>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
                    {description}
                </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                {icon}
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
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </span>
            {children}
        </label>
    );
}