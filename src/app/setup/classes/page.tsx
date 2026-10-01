'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    GraduationCap,
    Plus,
    Trash2,
    Home,
    Layers,
    Sparkles,
    Info,
    ShieldCheck,
    Pencil
} from 'lucide-react';
import { load, save, loadProfile, UserProfile, ProfPlanData } from '@/lib/store';

function getHierarchyRank(className: string = ''): number {
    const lower = String(className || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (/\bclass\s+(i|ii|iii|iv|v)\b/.test(lower) || /\bprimary\b/.test(lower)) return 1;
    if (/\bclass\s+(vi|vii|viii)\b/.test(lower) || /\bupper\s+primary\b/.test(lower)) return 2;
    if (/\bclass\s+(ix|x)\b/.test(lower) || /\bsecondary\b/.test(lower)) return 3;
    if (/\+2\b/.test(lower) || /\bclass\s+(xi|xii)\b/.test(lower) || /\bxi\b/.test(lower) || /\bxii\b/.test(lower)) return 4;
    if (/\bug\b/.test(lower) || /\bsemester\b/.test(lower) || /\bba\b/.test(lower) || /\bbsc\b/.test(lower)) return 5;
    if (/\bpg\b/.test(lower) || /\bmaster\b/.test(lower)) return 6;
    return 7;
}

function sortClassesByHierarchy(classesList: ProfPlanData['classes']) {
    if (!Array.isArray(classesList)) return [];
    return [...classesList].sort((a, b) => {
        const nameA = String(a?.name || '');
        const nameB = String(b?.name || '');
        const rankA = getHierarchyRank(nameA);
        const rankB = getHierarchyRank(nameB);
        if (rankA !== rankB) return rankA - rankB;
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

export default function ManageClassesPage() {
    const router = useRouter();
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

    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Form / Addition States
    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts Stream');
    const [customStreamInput, setCustomStreamInput] = useState('');

    // Inline Editing States
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editNameVal, setEditNameVal] = useState('');
    const [editStreamVal, setEditStreamVal] = useState('');

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const editRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const store = load();
        if (store) {
            setData({
                ...store,
                classes: sortClassesByHierarchy(store.classes || [])
            });
        }
        const prof = loadProfile();
        if (prof) setProfile(prof);

        const refresh = () => {
            const updated = load();
            if (updated) {
                setData({
                    ...updated,
                    classes: sortClassesByHierarchy(updated.classes || [])
                });
            }
        };

        window.addEventListener('profplan-change', refresh);
        return () => window.removeEventListener('profplan-change', refresh);
    }, []);

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newClassName.trim();
        const stream = newClassStream === 'Other / Custom' ? customStreamInput.trim() : newClassStream;

        if (!name) {
            setErrorMessage('Please enter a class or semester name.');
            return;
        }

        const duplicate = (data.classes || []).some(
            (c: any) => c.name.trim().toLowerCase() === name.toLowerCase() && c.stream === stream
        );

        if (duplicate) {
            setErrorMessage(`"${name}" (${stream}) is already added in your workspace.`);
            return;
        }

        const newClassObj = {
            id: 'cls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name,
            stream: stream || 'General / Academic'
        };

        const updatedClasses = sortClassesByHierarchy([...(data.classes || []), newClassObj]);
        const updatedData = { ...data, classes: updatedClasses };

        save(updatedData);
        setData(updatedData);

        setNewClassName('');
        setCustomStreamInput('');
        setErrorMessage(null);
        setSuccessMessage(`✓ Successfully added "${name}" (${stream}) to your academic workspaces.`);

        setTimeout(() => setSuccessMessage(null), 4000);
        inputRef.current?.focus();
    };

    const startEditing = (cls: any) => {
        setEditingClassId(cls.id);
        setEditNameVal(cls.name || '');
        setEditStreamVal(cls.stream || 'Arts Stream');
        setTimeout(() => editRef.current?.focus(), 50);
    };

    const saveEditing = (clsId: string) => {
        const name = editNameVal.trim();
        const stream = editStreamVal.trim();

        if (!name) {
            setErrorMessage('Class name cannot be blank.');
            return;
        }

        const updatedClasses = sortClassesByHierarchy(
            (data.classes || []).map((c: any) => {
                if (c.id === clsId) {
                    return { ...c, name, stream };
                }
                return c;
            })
        );

        const updatedData = { ...data, classes: updatedClasses };
        save(updatedData);
        setData(updatedData);

        setEditingClassId(null);
        setErrorMessage(null);
        setSuccessMessage(`✓ Updated workspace details successfully.`);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const deleteClass = (cls: any) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${cls.name}" (${cls.stream || 'General'})?\n\nThis will remove all associated subjects, units, and timetable slots.`
        );
        if (!confirmed) return;

        const updatedClasses = (data.classes || []).filter((c: any) => c.id !== cls.id);
        const updatedData = { ...data, classes: updatedClasses };
        save(updatedData);
        setData(updatedData);
        setSuccessMessage(`Removed "${cls.name}" from your workspaces.`);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-sm font-bold text-slate-500 animate-pulse">
                    Loading Workspace Manager...
                </div>
            </div>
        );
    }

    const classCount = (data.classes || []).length;
    const formattedCount = classCount < 10 ? `0${classCount}` : String(classCount);

    return (
        <div className="space-y-6 pb-20 max-w-4xl mx-auto px-4 sm:px-6 pt-2">

            {/* NAVIGATIONAL BACK BAR */}
            <div className="flex items-center justify-between pt-2">
                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400/60 shadow-sm transition cursor-pointer"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                    <Home className="w-4 h-4" />
                    Go to Today Page
                </Link>
            </div>

            {/* MASTER APNSIR HERO HEADER */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

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
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                An Initiative by APNSIR FOUNDATION
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
                                Academic Workspace Manager
                            </h1>

                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 font-medium">
                                Manage your class groups, streams, and semester registers for official inspection.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 px-5 py-3 backdrop-blur-md text-left sm:text-center shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                            Configured Workspaces
                        </p>
                        <p className="mt-0.5 text-2xl sm:text-3xl font-black text-white">
                            {formattedCount}
                        </p>
                    </div>
                </div>
            </section>

            {/* SUMMARY CARD GUIDANCE */}
            <section className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50/50 to-indigo-50 p-6 shadow-sm space-y-3">
                <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                        <Info className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-indigo-950">
                            Dear educator, you have already added {formattedCount} classes as follows:
                        </h2>
                        <p className="text-xs font-medium leading-relaxed text-indigo-900 mt-1">
                            Your active classes are listed below in hierarchy order. To edit, click the <strong className="text-indigo-950">EDIT</strong> button; to add new classes, use the form below.
                        </p>
                    </div>
                </div>
            </section>

            {/* NOTIFICATIONS */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 flex items-center gap-3 shadow-md animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-extrabold">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center justify-between shadow-sm animate-in fade-in">
                    <span className="font-bold">{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)} className="font-extrabold text-rose-700 underline cursor-pointer">Dismiss</button>
                </div>
            )}

            {/* BLUE CONTAINER: ARRANGED LIST OF CLASSES */}
            <section className="rounded-3xl border-2 border-blue-900/40 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                            <Layers className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white">
                                Your Configured Workspaces
                            </h3>
                            <p className="text-xs text-blue-200/80">
                                Hierarchy-sorted for daily lesson planning &amp; inspection
                            </p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black text-amber-300 border border-white/20 backdrop-blur-sm">
                        {classCount} Total
                    </span>
                </div>

                {classCount === 0 ? (
                    <div className="py-12 text-center text-blue-200/70 text-xs font-medium italic">
                        No classes or semesters added yet. Use the form below to add your first workspace!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {(data.classes || []).map((cls: any, idx: number) => {
                            const isEditing = editingClassId === cls.id;

                            return (
                                <div
                                    key={cls.id}
                                    className={`rounded-2xl p-4 transition flex flex-col justify-between gap-3 ${
                                        isEditing
                                            ? 'bg-white text-slate-900 border-2 border-amber-400 ring-4 ring-amber-400/20 shadow-lg'
                                            : 'bg-white/10 hover:bg-white/15 border border-white/20 text-white backdrop-blur-sm shadow-sm'
                                    }`}
                                >
                                    {isEditing ? (
                                        <div className="space-y-3 w-full">
                                            <div className="space-y-2">
                                                <input
                                                    ref={editRef}
                                                    type="text"
                                                    value={editNameVal}
                                                    onChange={(e) => setEditNameVal(e.target.value)}
                                                    placeholder="Class Name"
                                                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-indigo-600 bg-white text-slate-900 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={editStreamVal}
                                                    onChange={(e) => setEditStreamVal(e.target.value)}
                                                    placeholder="Stream / Faculty"
                                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 outline-none"
                                                />
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingClassId(null)}
                                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => saveEditing(cls.id)}
                                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow cursor-pointer"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-white truncate">
                                                        {cls.name}
                                                    </h4>
                                                    <p className="text-[11px] font-semibold text-blue-200 truncate">
                                                        {cls.stream || 'General / Academic'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(cls)}
                                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteClass(cls)}
                                                    className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600/80 rounded-xl transition cursor-pointer"
                                                    title="Delete class"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ADD NEW CLASS FORM SECTION */}
            <section className="overflow-hidden rounded-[32px] border-2 border-indigo-200 bg-white shadow-2xl">
                
                {/* APNSIR BRAND HEADER BAR */}
                <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-4 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
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
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300 block">
                                    OdishaTeachers.com
                                </span>
                                <h3 className="text-base font-black text-white tracking-tight">
                                    Add New Class or Semester
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Expansion Studio</span>
                        </div>
                    </div>
                </div>

                {/* FORM CONTAINER */}
                <div className="p-6 sm:p-8 space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
                    
                    {/* ADVISORY CARD */}
                    <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50/60 to-indigo-50 p-4 shadow-sm flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mt-0.5">
                            <Info className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-indigo-950">
                                Expand Your Academic Workspaces
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800 font-medium">
                                Register an additional teaching batch or semester below to immediately unlock custom syllabus planning and timetable scheduling.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleAddClass} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Class / Semester Name *
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="e.g. BA 3rd Semester, Class VIII, +2 2nd Year Science"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    required
                                    className="w-full rounded-2xl border-2 border-indigo-200/90 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition shadow-2xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Stream / Faculty *
                                </label>
                                <select
                                    value={newClassStream}
                                    onChange={(e) => setNewClassStream(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-indigo-200/90 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition cursor-pointer shadow-2xs"
                                >
                                    <option value="Arts Stream">Arts Stream</option>
                                    <option value="Science Stream">Science Stream</option>
                                    <option value="Commerce Stream">Commerce Stream</option>
                                    <option value="Vocational">Vocational</option>
                                    <option value="General / Academic">General / Academic</option>
                                    <option value="Other / Custom">Other / Custom</option>
                                </select>
                            </div>
                        </div>

                        {newClassStream === 'Other / Custom' && (
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Enter Custom Stream Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science / Fine Arts"
                                    value={customStreamInput}
                                    onChange={(e) => setCustomStreamInput(e.target.value)}
                                    required
                                    className="w-full rounded-2xl border-2 border-indigo-200/90 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition shadow-2xs"
                                />
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-slate-200/60">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:opacity-95 px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-indigo-200 transition transform active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> Add Class to Register
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}