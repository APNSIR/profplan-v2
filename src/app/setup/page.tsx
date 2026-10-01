'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    Pencil,
    User,
    PhoneCall,
    Briefcase,
    Building2,
    Users,
    X,
    Award,
    Info,
    PartyPopper
} from 'lucide-react';
import { load, save, loadProfile, saveProfile, UserProfile } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
import type { ClassItem, Course, Unit } from '@/lib/types';

type TierId = 'primary' | 'upper_primary' | 'secondary' | 'higher_secondary' | 'ug' | 'pg';

interface TierOption {
    id: TierId;
    title: string;
    subtitle: string;
    badge: string;
    classes: string[];
}

const ODISHA_TIERS: TierOption[] = [
    { id: 'primary', title: 'Primary School Level', subtitle: 'Class I to Class V (Foundational)', badge: 'Classes 1–5', classes: ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V'] },
    { id: 'upper_primary', title: 'Upper Primary (ME Level)', subtitle: 'Class VI to Class VIII (Middle School)', badge: 'Classes 6–8', classes: ['Class VI', 'Class VII', 'Class VIII'] },
    { id: 'secondary', title: 'Secondary / High School', subtitle: 'Class IX & Class X (BSE Odisha / CBSE / ICSE)', badge: 'Classes 9–10', classes: ['Class IX', 'Class X'] },
    { id: 'higher_secondary', title: 'Higher Secondary / +2 Junior College', subtitle: '+2 1st Year (XI) & +2 2nd Year (XII) — Arts, Science, Commerce, Vocational', badge: '+2 Stream', classes: ['+2 1st Year (XI)', '+2 2nd Year (XII)'] },
    { id: 'ug', title: 'Undergraduate (UG Degree College)', subtitle: 'CBCS 3-Year / 4-Year Honors & Elective Semesters', badge: 'Sem 1–6/8', classes: ['UG Semester 1', 'UG Semester 2', 'UG Semester 3', 'UG Semester 4', 'UG Semester 5', 'UG Semester 6'] },
    { id: 'pg', title: 'Postgraduate (University / Autonomous)', subtitle: '2-Year Masters Degree (Semesters 1 to 4)', badge: 'PG Sem 1–4', classes: ['PG Semester 1', 'PG Semester 2', 'PG Semester 3', 'PG Semester 4'] },
];

/* =========================================================
   ACADEMIC HIERARCHY RANKING (Lower to Higher)
   ========================================================= */
function getHierarchyRank(className: string = ''): number {
    const lower = String(className || '').trim().toLowerCase();

    if (/\bclass\s+(i|ii|iii|iv|v)\b/.test(lower) || /\bprimary\b/.test(lower)) return 1;
    if (/\bclass\s+(vi|vii|viii)\b/.test(lower) || /\bupper\s+primary\b/.test(lower)) return 2;
    if (/\bclass\s+(ix|x)\b/.test(lower) || /\bsecondary\b/.test(lower) || /\bhigh\s+school\b/.test(lower)) return 3;
    if (/\+2\b/.test(lower) || /\bhigher\s+secondary\b/.test(lower) || /\bclass\s+(xi|xii)\b/.test(lower) || /\bxi\b/.test(lower) || /\bxii\b/.test(lower)) return 4;
    if (/\bug\b/.test(lower) || /\bsemester\b/.test(lower) || /\bba\b/.test(lower) || /\bbsc\b/.test(lower) || /\bbcom\b/.test(lower)) return 5;
    if (/\bpg\b/.test(lower) || /\bmaster\b/.test(lower) || /\bpostgraduate\b/.test(lower)) return 6;

    return 7;
}

function sortClassesByHierarchy(classList: string[]): string[] {
    return [...classList].sort((a, b) => {
        const rankA = getHierarchyRank(a);
        const rankB = getHierarchyRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
}

export default function SetupOdysseyPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<number>(1);
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        designation: '',
        mobile: '',
        email: '',
        institutionType: '',
        college: '',
        department: '',
        onboarded: false,
    });

    const [selectedTiers, setSelectedTiers] = useState<TierId[]>(['ug']);
    const [assignedClasses, setAssignedClasses] = useState<string[]>(['UG Semester 1', 'UG Semester 2']);
    const [customClassInput, setCustomClassInput] = useState('');

    // Inline Class Editing & Celebration Toast State
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [celebrationToast, setCelebrationToast] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const editInputRef = useRef<HTMLInputElement | null>(null);
    const customInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setMounted(true);
        try {
            const savedProf = loadProfile();
            if (savedProf) {
                setProfile((prev) => ({ ...prev, ...savedProf }));
            }
        } catch (e) {
            console.error('Profile load error:', e);
        }
    }, []);

    const showToast = (msg: string) => {
        setCelebrationToast(msg);
        setTimeout(() => setCelebrationToast(null), 3500);
    };

    const updateProfile = (field: keyof UserProfile, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setErrorMessage('');
    };

    const toggleTier = (id: TierId) => {
        setSelectedTiers((prev) => {
            const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
            const generated: string[] = [];
            ODISHA_TIERS.forEach((tier) => {
                if (next.includes(tier.id)) generated.push(...tier.classes);
            });
            setAssignedClasses(sortClassesByHierarchy(Array.from(new Set(generated))));
            return next;
        });
    };

    const handleNext = () => {
        if (step === 1) {
            if (!profile.name.trim()) {
                setErrorMessage('Please enter your full name to generate your inspection signature.');
                return;
            }
            const cleanPhone = profile.mobile.replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length < 10) {
                setErrorMessage('Please enter a valid 10-digit mobile or WhatsApp number.');
                return;
            }
        }
        if (step === 3 && assignedClasses.length === 0) {
            setErrorMessage('Please keep or add at least one active class/semester.');
            return;
        }
        setErrorMessage('');
        setStep((prev) => Math.min(4, prev + 1));
    };

    const handleBack = () => {
        setErrorMessage('');
        setStep((prev) => Math.max(1, prev - 1));
    };

    const removeClass = (idx: number) => {
        const removedName = assignedClasses[idx];
        if (editingIndex === idx) {
            setEditingIndex(null);
            setEditingValue('');
        }
        setAssignedClasses((prev) => prev.filter((_, i) => i !== idx));
        showToast(`Removed "${removedName}" from your workspace list.`);
    };

    const startEditing = (idx: number) => {
        setEditingIndex(idx);
        setEditingValue(assignedClasses[idx] || '');
        setErrorMessage('');
    };

    const saveEditing = (idx: number) => {
        const trimmed = editingValue.trim();
        if (!trimmed) {
            setErrorMessage('Class name cannot be empty.');
            return;
        }
        if (assignedClasses.some((c, i) => i !== idx && c.toLowerCase() === trimmed.toLowerCase())) {
            setErrorMessage(`"${trimmed}" already exists in your list.`);
            return;
        }
        setAssignedClasses((prev) => {
            const next = [...prev];
            next[idx] = trimmed;
            return sortClassesByHierarchy(next);
        });
        setEditingIndex(null);
        setEditingValue('');
        setErrorMessage('');
        showToast(`🎉 Successfully updated class to "${trimmed}"!`);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditingValue('');
        setErrorMessage('');
    };

    const addCustomClass = () => {
        const trimmed = customClassInput.trim();
        if (!trimmed) return;
        if (assignedClasses.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            setErrorMessage(`"${trimmed}" is already in your workspace list.`);
            return;
        }
        setAssignedClasses((prev) => sortClassesByHierarchy([...prev, trimmed]));
        setCustomClassInput('');
        setErrorMessage('');
        showToast(`🚀 Fantastic! "${trimmed}" added and hierarchically sorted!`);
        setTimeout(() => customInputRef.current?.focus(), 40);
    };

    const completeSetup = async () => {
        if (saving) return;
        setSaving(true);
        setErrorMessage('');

        try {
            const cleanPhone = profile.mobile.replace(/\D/g, '');
            const completedProfile: UserProfile = {
                ...profile,
                name: profile.name.trim(),
                designation: profile.designation.trim(),
                mobile: cleanPhone,
                college: profile.college.trim(),
                department: profile.department.trim(),
                onboarded: true,
            };

            if (supabase) {
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
            }

            saveProfile(completedProfile);
            const storeData = load();

            const newClasses: ClassItem[] = [];
            const newCourses: Course[] = [];
            const newUnits: Unit[] = [];
            const deptName = completedProfile.department || 'Primary Subject';

            assignedClasses.forEach((cName, idx) => {
                const classId = `cls_${Date.now()}_${idx}`;
                newClasses.push({ id: classId, name: cName });

                const courseId = `crs_${Date.now()}_${idx}`;
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
                        id: `unit_${Date.now()}_${idx}_${uIdx}`,
                        courseId,
                        name: uName,
                        unitNumber: uIdx + 1,
                        order: uIdx,
                    } as Unit);
                });
            });

            save({
                ...storeData,
                classes: [...(storeData.classes || []), ...newClasses],
                courses: [...(storeData.courses || []), ...newCourses],
                units: [...(storeData.units || []), ...newUnits],
            });

            router.replace('/today?setup=1');
        } catch (err) {
            console.error('Setup error:', err);
            setErrorMessage('Failed to bootstrap workspace. Please check your connection.');
            setSaving(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold animate-pulse">
                Loading Setup Studio...
            </div>
        );
    }

    const stepTitles = ['Educator Identity', 'Academic Levels', 'Workspace Architect', 'Curriculum Blueprint'];
    const progress = Math.round((step / 4) * 100);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between px-4 sm:px-8 py-6 relative">
            
            {/* CELEBRATORY POPUP TOAST */}
            {celebrationToast && (
                <div className="fixed top-6 right-6 z-[100] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <PartyPopper className="w-5 h-5 text-amber-300 animate-bounce shrink-0" />
                    <span className="text-xs font-black">{celebrationToast}</span>
                </div>
            )}

            {/* TOP HEADER */}
            <header className="max-w-3xl mx-auto w-full pb-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 overflow-hidden rounded-full bg-white p-0.5 shadow-lg ring-2 ring-indigo-400/40">
                        <Image src="/apnsir-logo.png" alt="APNSIR Logo" width={48} height={48} className="w-full h-full object-contain rounded-full" priority />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                            OdishaTeachers<span className="text-orange-500">.com</span>
                        </h1>
                        <p className="text-[11px] font-bold text-indigo-300">
                            ProfPlan Setup Odyssey • Level {step} of 4
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>{progress}% Completed</span>
                </div>
            </header>

            {/* MAIN CARD CONTAINER */}
            <main className="max-w-2xl mx-auto w-full my-6 bg-white text-slate-900 rounded-[32px] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
                
                {/* PROGRESS BAR */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                            Phase {step}: {stepTitles[step - 1]}
                        </span>
                        <span className="text-xs font-bold text-slate-500">Step {step} / 4</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="p-6 sm:p-8 space-y-5 animate-in fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                                    Personalize Your Progress Register.
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Let&apos;s personalize your professional digital register and official inspection sign-offs.
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                        </div>

                        {/* LIVE SIGNATURE PREVIEW */}
                        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-md relative overflow-hidden">
                            <Sparkles className="absolute right-3 top-3 w-16 h-16 text-indigo-400/10" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">
                                Live Inspection Signature Preview
                            </span>
                            <p className="text-base font-black text-white mt-1">
                                {profile.name.trim() || 'Your Name Here'}
                            </p>
                            <p className="text-xs text-indigo-200 font-medium">
                                {profile.designation.trim() || 'Designation'} · {profile.college.trim() || 'Institution Name'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={profile.name}
                                    onChange={(e) => updateProfile('name', e.target.value)}
                                    placeholder="e.g. Dr. Atmaprakash Nayak"
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                    WhatsApp / Mobile Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={profile.mobile}
                                    onChange={(e) => updateProfile('mobile', e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g. 9861012345"
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                        Designation / Post
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.designation}
                                        onChange={(e) => updateProfile('designation', e.target.value)}
                                        placeholder="e.g. HOD of English"
                                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                        Subject / Department
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.department}
                                        onChange={(e) => updateProfile('department', e.target.value)}
                                        placeholder="e.g. English"
                                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                    Institution / College / School Name
                                </label>
                                <input
                                    type="text"
                                    value={profile.college}
                                    onChange={(e) => updateProfile('college', e.target.value)}
                                    placeholder="e.g. People's College, Buguda"
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white transition"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: ACADEMIC TIERS */}
                {step === 2 && (
                    <div className="p-6 sm:p-8 space-y-4 animate-in fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Select Your Teaching Scope
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Choose your educational levels across Odisha institutions.
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100">
                                <Building2 className="w-6 h-6" />
                            </div>
                        </div>

                        {/* HIGHLIGHTED INSTRUCTION BOX */}
                        <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-50 p-4 shadow-sm flex items-start gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                                <Info className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-extrabold leading-relaxed text-indigo-950">
                                Select all categories applicable to you. You can choose multiple levels if you teach composite or combined classes.
                            </p>
                        </div>

                        <div className="space-y-2.5 pt-1">
                            {ODISHA_TIERS.map((tier) => {
                                const isSelected = selectedTiers.includes(tier.id);
                                return (
                                    <div
                                        key={tier.id}
                                        onClick={() => toggleTier(tier.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition cursor-pointer select-none ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-200'
                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                                                isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                                            }`}>
                                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xs sm:text-sm font-black text-slate-900">{tier.title}</h3>
                                                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-indigo-700 ring-1 ring-indigo-200">
                                                        {tier.badge}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">{tier.subtitle}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 3: WORKSPACE ARCHITECT */}
                {step === 3 && (
                    <div className="p-6 sm:p-8 space-y-4 animate-in fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Architect Your Workspaces
                                </h2>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>

                        {/* HIGHLIGHTED INSTRUCTION BOX */}
                        <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-50 p-4 shadow-sm flex items-start gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                                <Info className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-extrabold leading-relaxed text-indigo-950">
                                Classes and semesters are automatically sorted in hierarchical order (Primary → PG). Edit names or manage your list below.
                            </p>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            {assignedClasses.length === 0 ? (
                                <div className="py-6 text-center text-xs font-bold text-slate-400">
                                    No classes configured. Add a custom class below.
                                </div>
                            ) : (
                                assignedClasses.map((cName, idx) => {
                                    const isEditing = editingIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition ${
                                                isEditing
                                                    ? 'bg-indigo-50 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                    : 'bg-white border-slate-200 shadow-2xs'
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
                                                        className="flex-1 rounded-lg border-2 border-indigo-500 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => saveEditing(idx)}
                                                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-700 transition cursor-pointer"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-black text-slate-800 truncate pr-2">{cName}</span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditing(idx)}
                                                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                                                        >
                                                            <Pencil className="w-3 h-3" /> EDIT
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeClass(idx)}
                                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                                            title="Delete class"
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

                        {/* PROMINENT ADD CONTROLS */}
                        <div className="pt-2 space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-700">
                                To add more classes, type below and click Add:
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
                                    placeholder="e.g. +2 Vocational Sec B"
                                    className="flex-1 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomClass}
                                    disabled={!customClassInput.trim()}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-200 disabled:opacity-40 transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                                >
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: BLUEPRINT */}
                {step === 4 && (
                    <div className="p-6 sm:p-8 space-y-5 animate-in fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Your Curriculum Blueprint
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    How ProfPlan organizes your teaching register for NAAC inspection.
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl ring-1 ring-emerald-100">
                                <Award className="w-6 h-6 text-amber-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-5 text-white shadow-xl space-y-3">
                            <div className="flex items-center gap-2 text-indigo-300 font-black text-xs uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-amber-400" />
                                <span>Structural Hierarchy</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20">
                                    <p className="text-amber-300 font-extrabold text-xs">Classes ({assignedClasses.length})</p>
                                    <p className="text-[11px] text-slate-300 mt-1">Active workspaces.</p>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20">
                                    <p className="text-emerald-300 font-extrabold text-xs">Subjects (Papers)</p>
                                    <p className="text-[11px] text-slate-300 mt-1">With target hours.</p>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3.5 border border-white/20">
                                    <p className="text-violet-300 font-extrabold text-xs">Units &amp; Topics</p>
                                    <p className="text-[11px] text-slate-300 mt-1">Ready for AI planning.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                                <p className="font-black">Ready to launch!</p>
                                <p className="text-emerald-800 mt-0.5">Click below to initialize your workspace and open your Daily Dashboard.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR MESSAGE */}
                {errorMessage && (
                    <div className="mx-6 sm:mx-8 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
                        <CircleHelp className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* FOOTER ACTIONS */}
                <div className="bg-slate-50 px-6 py-4 sm:px-8 border-t border-slate-100 flex items-center justify-between gap-3">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex-1 max-w-xs flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 cursor-pointer"
                        >
                            <span>Next Phase</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={completeSetup}
                            disabled={saving}
                            className="flex-1 max-w-xs flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 transition shadow-xl shadow-indigo-200 cursor-pointer disabled:opacity-50"
                        >
                            {saving ? 'Bootstrapping...' : 'Launch Dashboard'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

            </main>

            {/* FOOTER */}
            <footer className="max-w-3xl mx-auto w-full text-center text-xs text-slate-500">
                <p>&copy; {new Date().getFullYear()} APNSIR Foundation. All rights reserved.</p>
            </footer>

        </div>
    );
}