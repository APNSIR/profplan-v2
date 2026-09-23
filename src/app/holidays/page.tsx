'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { load, save, ProfPlanData } from '@/lib/store';
import PageGuide from '@/components/PageGuide';
import {
    SunMedium,
    Plus,
    Trash2,
    Calendar,
    Sparkles,
    ArrowLeft,
    CheckCircle2,
    X,
    CalendarOff,
    Briefcase,
    Pencil,
    Settings2,
} from 'lucide-react';

export default function HolidayPage() {
    const [mounted, setMounted] = useState(false);

    const [data, setData] = useState<ProfPlanData>({
        courses: [],
        units: [],
        topics: [],
        slots: [],
        logs: [],
        holidays: [],
        classes: [],
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAnnualCalendarOpen, setIsAnnualCalendarOpen] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

    const [filterCategory, setFilterCategory] = useState<
        'All' | 'Holidays' | 'Leaves'
    >('All');

    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        date: new Date().toLocaleDateString('en-CA'),
        type: 'Casual Leave (CL)',
        description: '',
    });

    /* ---------------------------------------------------------
       HELPERS
    --------------------------------------------------------- */

    const isPersonalLeave = (type: string) => {
        return (
            type.includes('Leave') ||
            type.includes('(CL)') ||
            type.includes('(EL)') ||
            type.includes('(DL') ||
            type.includes('(SCL)')
        );
    };

    const resetForm = () => {
        setForm({
            name: '',
            date: new Date().toLocaleDateString('en-CA'),
            type: 'Casual Leave (CL)',
            description: '',
        });

        setEditingId(null);
    };

    /* ---------------------------------------------------------
       LOAD DATA
    --------------------------------------------------------- */

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

    /* ---------------------------------------------------------
       PRESET HOLIDAYS
    --------------------------------------------------------- */

    const handleLoadSampleHolidays = () => {
        const currentYear = new Date().getFullYear();
        const stamp = Date.now();

        const sampleHolidays = [
            {
                id: `h_1_${stamp}`,
                name: 'Republic Day',
                date: `${currentYear}-01-26`,
                type: 'Gazetted Holiday',
                description: 'National Holiday',
            },
            {
                id: `h_2_${stamp + 1}`,
                name: 'Maha Shivaratri',
                date: `${currentYear}-02-15`,
                type: 'Gazetted Holiday',
                description: 'Festival Holiday',
            },
            {
                id: `h_3_${stamp + 2}`,
                name: 'Holi',
                date: `${currentYear}-03-04`,
                type: 'Gazetted Holiday',
                description: 'Festival Holiday',
            },
            {
                id: `h_4_${stamp + 3}`,
                name: 'Utkal Divas',
                date: `${currentYear}-04-01`,
                type: 'Gazetted Holiday',
                description: 'Odisha State Foundation Day',
            },
            {
                id: `h_5_${stamp + 4}`,
                name: 'Independence Day',
                date: `${currentYear}-08-15`,
                type: 'Gazetted Holiday',
                description: 'National Holiday',
            },
            {
                id: `h_6_${stamp + 5}`,
                name: 'Ganesh Puja',
                date: `${currentYear}-08-27`,
                type: 'Local / Festival Holiday',
                description: 'Institutional Celebration & Holiday',
            },
            {
                id: `h_7_${stamp + 6}`,
                name: 'Gandhi Jayanti',
                date: `${currentYear}-10-02`,
                type: 'Gazetted Holiday',
                description: 'National Holiday',
            },
            {
                id: `h_8_${stamp + 7}`,
                name: 'Durga Puja / Dussehra Vacation',
                date: `${currentYear}-10-20`,
                type: 'Institutional / Vacation Break',
                description: 'Autumn Vacation',
            },
            {
                id: `h_9_${stamp + 8}`,
                name: 'Diwali',
                date: `${currentYear}-11-08`,
                type: 'Gazetted Holiday',
                description: 'Festival of Lights',
            },
            {
                id: `h_10_${stamp + 9}`,
                name: 'Christmas Day',
                date: `${currentYear}-12-25`,
                type: 'Gazetted Holiday',
                description: 'Gazetted Holiday',
            },
        ];

        const existingDates = new Set(
            (data.holidays || []).map((h: any) => h.date)
        );

        const newToAdd = sampleHolidays.filter(
            (holiday) => !existingDates.has(holiday.date)
        );

        const updatedData = {
            ...data,
            holidays: [
                ...(data.holidays || []),
                ...newToAdd,
            ],
        } as ProfPlanData;

        save(updatedData);
        setData(updatedData);

        setSuccessMsg(
            newToAdd.length
                ? `${newToAdd.length} preset holidays added to the annual calendar.`
                : 'The preset holidays are already present in your calendar.'
        );

        setIsAnnualCalendarOpen(true);
    };

    /* ---------------------------------------------------------
       ADD / EDIT
    --------------------------------------------------------- */

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.date) {
            return;
        }

        const newEntry = {
            id: editingId || `h_${Date.now()}`,
            name: form.name.trim(),
            date: form.date,
            type: form.type,
            description:
                form.description.trim() ||
                (isPersonalLeave(form.type)
                    ? 'Approved Teacher Leave'
                    : 'Institutional Non-Instructional Day'),
        };

        let updatedEntries;

        if (editingId) {
            updatedEntries = (data.holidays || []).map((item: any) =>
                item.id === editingId ? newEntry : item
            );
        } else {
            updatedEntries = [
                ...(data.holidays || []),
                newEntry,
            ];
        }

        updatedEntries.sort(
            (a: any, b: any) =>
                new Date(a.date).getTime() -
                new Date(b.date).getTime()
        );

        const updatedData = {
            ...data,
            holidays: updatedEntries,
        } as ProfPlanData;

        save(updatedData);
        setData(updatedData);

        setIsAddModalOpen(false);

        setSuccessMsg(
            editingId
                ? `"${newEntry.name}" has been updated successfully.`
                : `"${newEntry.name}" has been added to your calendar.`
        );

        resetForm();
    };

    /* ---------------------------------------------------------
       EDIT
    --------------------------------------------------------- */

    const handleEditEntry = (item: any) => {
        setEditingId(item.id);

        setForm({
            name: item.name || '',
            date: item.date || '',
            type: item.type || 'Gazetted Holiday',
            description: item.description || '',
        });

        setIsAnnualCalendarOpen(false);
        setIsAddModalOpen(true);
    };

    /* ---------------------------------------------------------
       DELETE
    --------------------------------------------------------- */

    const handleDeleteEntry = (id: string) => {
        const holiday = (data.holidays || []).find(
            (item: any) => item.id === id
        );

        if (
            !window.confirm(
                `Delete "${holiday?.name || 'this record'}"?`
            )
        ) {
            return;
        }

        const updatedData = {
            ...data,
            holidays: (data.holidays || []).filter(
                (item: any) => item.id !== id
            ),
        } as ProfPlanData;

        save(updatedData);
        setData(updatedData);

        setSuccessMsg(
            `"${holiday?.name || 'Record'}" has been deleted.`
        );
    };

    /* ---------------------------------------------------------
       FILTERED RECORDS
    --------------------------------------------------------- */

    const filteredEntries = useMemo(() => {
        return [...(data.holidays || [])]
            .filter((item: any) => {
                if (filterCategory === 'All') {
                    return true;
                }

                if (filterCategory === 'Leaves') {
                    return isPersonalLeave(item.type || '');
                }

                return !isPersonalLeave(item.type || '');
            })
            .sort(
                (a: any, b: any) =>
                    new Date(a.date).getTime() -
                    new Date(b.date).getTime()
            );
    }, [data.holidays, filterCategory]);

    /* ---------------------------------------------------------
       COUNTS
    --------------------------------------------------------- */

    const holidayCount = useMemo(
        () =>
            (data.holidays || []).filter(
                (item: any) =>
                    !isPersonalLeave(item.type || '')
            ).length,
        [data.holidays]
    );

    const leaveCount = useMemo(
        () =>
            (data.holidays || []).filter((item: any) =>
                isPersonalLeave(item.type || '')
            ).length,
        [data.holidays]
    );

    const annualHolidays = useMemo(() => {
        return [...(data.holidays || [])]
            .filter(
                (item: any) =>
                    !isPersonalLeave(item.type || '')
            )
            .sort(
                (a: any, b: any) =>
                    new Date(a.date).getTime() -
                    new Date(b.date).getTime()
            );
    }, [data.holidays]);

    /* ---------------------------------------------------------
       LOADING
    --------------------------------------------------------- */

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="animate-pulse text-sm font-bold text-slate-500">
                    Loading Holidays &amp; Leave Register...
                </div>
            </div>
        );
    }

    /* ---------------------------------------------------------
       PAGE
    --------------------------------------------------------- */

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-16">

            {/* BACK BUTTON */}

            <div className="flex items-center justify-between">
                <Link
                    href="/today"
                    className="group inline-flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-md active:scale-95"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 transition group-hover:bg-blue-600 group-hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </div>

                    <div className="text-left">
                        <span className="block text-xs font-black text-slate-800">
                            Back to Today Dashboard
                        </span>

                        <span className="block text-[10px] font-semibold text-slate-400">
                            Return to Daily Workspace
                        </span>
                    </div>
                </Link>
            </div>

            {/* HERO */}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-xl md:p-8">

                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                    <div className="max-w-2xl">

                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            Academic Calendar &amp; Teacher Leave Tracker
                        </div>

                        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                            Holidays &amp; Leave Register
                        </h1>

                        <p className="mt-2 text-xs leading-relaxed text-blue-100/90 md:text-sm">
                            Manage institutional holidays, vacation breaks,
                            and individual teacher leave in one academic
                            calendar.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-2">

                        <button
                            type="button"
                            onClick={() =>
                                setIsAnnualCalendarOpen(true)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20 active:scale-95"
                        >
                            <Calendar className="h-4 w-4 text-amber-300" />
                            Annual Calendar
                        </button>

                        <button
                            type="button"
                            onClick={handleLoadSampleHolidays}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-100 transition hover:bg-amber-500/25 active:scale-95"
                        >
                            <Sparkles className="h-4 w-4" />
                            Load Preset
                        </button>

                    </div>

                </div>
            </section>

            {/* GUIDE */}

            <PageGuide
                guideKey="holidays_leave"
                title="Holidays & Leave Register: Quick Guide"
                summary="Manage institutional calendar dates and teacher leaves so your academic records remain synchronized."
                steps={[
                    {
                        step: '1. Add Calendar / Leave',
                        desc: 'Log institutional holidays, vacations or personal leaves.',
                        onClick: () => {
                            resetForm();
                            setIsAddModalOpen(true);
                        },
                    },
                    {
                        step: '2. Automatic Routine Pause',
                        desc: "See today's scheduled classes and how holidays or leaves affect your daily teaching plan.",
                        href: '/today',
                    },
                    {
                        step: '3. Inspection & Audit Sync',
                        desc: 'Review holiday and leave records with your academic teaching records in Reports.',
                        href: '/reports',
                    },
                ]}
            />

            {/* SUCCESS */}

            {successMsg && (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-sm">

                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold">
                            {successMsg}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSuccessMsg(null)}
                        className="font-bold text-emerald-700 hover:underline"
                    >
                        Dismiss
                    </button>

                </div>
            )}

            {/* CENTRAL CONTROL AREA */}

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                    {/* GREEN ADD BUTTON */}

                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                        className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-500 hover:to-green-500 hover:shadow-lg active:translate-y-0"
                    >
                        <Plus className="h-4 w-4 transition group-hover:rotate-90" />
                        Add Holiday / Leave
                    </button>

                    {/* DIVIDER */}

                    <div className="hidden h-9 w-px bg-slate-200 lg:block" />

                    {/* FILTER BUTTONS */}

                    <div className="flex flex-1 items-center gap-2 overflow-x-auto">

                        <button
                            type="button"
                            onClick={() =>
                                setFilterCategory('All')
                            }
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-95 ${filterCategory === 'All'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            All Records
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                                {(data.holidays || []).length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setFilterCategory('Holidays')
                            }
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-95 ${filterCategory === 'Holidays'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                    : 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                }`}
                        >
                            <SunMedium className="h-3.5 w-3.5" />
                            Institutional Holidays
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                                {holidayCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setFilterCategory('Leaves')
                            }
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-95 ${filterCategory === 'Leaves'
                                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                                    : 'border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
                                }`}
                        >
                            <Briefcase className="h-3.5 w-3.5" />
                            Teacher Leaves
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                                {leaveCount}
                            </span>
                        </button>

                    </div>

                    <div className="whitespace-nowrap text-xs font-black text-slate-500">
                        Showing {filteredEntries.length} records
                    </div>

                </div>
            </div>

            {/* RECORDS */}

            {filteredEntries.length === 0 ? (

                <div className="space-y-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">

                    <CalendarOff className="mx-auto h-12 w-12 text-slate-300" />

                    <div>
                        <h3 className="text-base font-black text-slate-800">
                            No Calendar Records
                        </h3>

                        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                            Add a holiday or teacher leave, or open the
                            Annual Calendar to manage your academic year's
                            holiday list.
                        </p>
                    </div>

                    <div className="flex justify-center gap-2">

                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setIsAddModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500"
                        >
                            <Plus className="h-4 w-4" />
                            Add First Entry
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setIsAnnualCalendarOpen(true)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <Calendar className="h-4 w-4" />
                            Annual Calendar
                        </button>

                    </div>

                </div>

            ) : (

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

                    {filteredEntries.map((item: any) => {

                        const itemDate = new Date(
                            `${item.date}T00:00:00`
                        );

                        const formattedDate =
                            itemDate.toLocaleDateString(
                                'en-IN',
                                {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                }
                            );

                        const isLeave = isPersonalLeave(
                            item.type || ''
                        );

                        return (
                            <div
                                key={item.id}
                                className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${isLeave
                                        ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white hover:border-indigo-400'
                                        : 'border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white hover:border-amber-400'
                                    }`}
                            >

                                <div
                                    className={`absolute left-0 top-0 h-full w-1 ${isLeave
                                            ? 'bg-indigo-500'
                                            : 'bg-amber-500'
                                        }`}
                                />

                                <div className="space-y-3">

                                    <div className="flex items-start justify-between gap-2">

                                        <span
                                            className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${isLeave
                                                    ? 'border-indigo-200 bg-indigo-100 text-indigo-900'
                                                    : 'border-amber-200 bg-amber-100 text-amber-900'
                                                }`}
                                        >
                                            {item.type || 'Holiday'}
                                        </span>

                                        <div className="flex gap-1 opacity-60 transition group-hover:opacity-100">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEditEntry(item)
                                                }
                                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteEntry(
                                                        item.id
                                                    )
                                                }
                                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>

                                        </div>

                                    </div>

                                    <h3 className="text-base font-black leading-snug text-slate-900">
                                        {item.name}
                                    </h3>

                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">

                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                            <Calendar className="h-4 w-4" />
                                        </div>

                                        <span>
                                            {formattedDate}
                                        </span>

                                    </div>

                                    {item.description && (
                                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] italic leading-relaxed text-slate-500">
                                            {item.description}
                                        </p>
                                    )}

                                </div>

                            </div>
                        );
                    })}

                </div>
            )}

            {/* ---------------------------------------------------------
               ANNUAL CALENDAR MODAL
            --------------------------------------------------------- */}

            {isAnnualCalendarOpen && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">

                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

                        {/* HEADER */}

                        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                                    <Calendar className="h-5 w-5" />
                                </div>

                                <div>
                                    <h2 className="text-lg font-black text-slate-900">
                                        Annual Holiday Calendar
                                    </h2>

                                    <p className="text-xs font-medium text-slate-500">
                                        Manage institutional holidays for the academic year
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsAnnualCalendarOpen(false)
                                }
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>

                        </div>

                        {/* TOOLBAR */}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">

                            <div className="flex items-center gap-2">

                                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
                                    {annualHolidays.length} Holidays
                                </span>

                                <span className="text-xs font-semibold text-slate-400">
                                    {new Date().getFullYear()} Calendar
                                </span>

                            </div>

                            <div className="flex gap-2">

                                <button
                                    type="button"
                                    onClick={handleLoadSampleHolidays}
                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Load Preset
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setIsAnnualCalendarOpen(false);
                                        setIsAddModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Holiday
                                </button>

                            </div>

                        </div>

                        {/* LIST */}

                        <div className="overflow-y-auto bg-slate-50/70 p-5">

                            {annualHolidays.length === 0 ? (

                                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">

                                    <CalendarOff className="mx-auto h-10 w-10 text-slate-300" />

                                    <h3 className="mt-3 text-sm font-black text-slate-800">
                                        Annual Calendar is Empty
                                    </h3>

                                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                                        Load the preset calendar or add your
                                        institution's holidays manually.
                                    </p>

                                </div>

                            ) : (

                                <div className="space-y-2.5">

                                    {annualHolidays.map(
                                        (item: any, index: number) => {

                                            const itemDate = new Date(
                                                `${item.date}T00:00:00`
                                            );

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md sm:flex-row sm:items-center"
                                                >

                                                    {/* DATE */}

                                                    <div className="flex shrink-0 items-center gap-3 sm:w-40">

                                                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-200">

                                                            <span className="text-[9px] font-black uppercase">
                                                                {itemDate.toLocaleDateString(
                                                                    'en-IN',
                                                                    {
                                                                        month: 'short',
                                                                    }
                                                                )}
                                                            </span>

                                                            <span className="text-base font-black leading-none">
                                                                {itemDate.getDate()}
                                                            </span>

                                                        </div>

                                                        <div>

                                                            <p className="text-xs font-black text-slate-800">
                                                                {itemDate.toLocaleDateString(
                                                                    'en-IN',
                                                                    {
                                                                        weekday: 'long',
                                                                    }
                                                                )}
                                                            </p>

                                                            <p className="text-[10px] font-semibold text-slate-400">
                                                                {index + 1} of{' '}
                                                                {
                                                                    annualHolidays.length
                                                                }
                                                            </p>

                                                        </div>

                                                    </div>

                                                    {/* DETAILS */}

                                                    <div className="min-w-0 flex-1">

                                                        <div className="flex flex-wrap items-center gap-2">

                                                            <h4 className="text-sm font-black text-slate-900">
                                                                {item.name}
                                                            </h4>

                                                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-900">
                                                                {item.type}
                                                            </span>

                                                        </div>

                                                        {item.description && (
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                {item.description}
                                                            </p>
                                                        )}

                                                    </div>

                                                    {/* ACTIONS */}

                                                    <div className="flex items-center gap-1 sm:opacity-50 sm:transition sm:group-hover:opacity-100">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleEditEntry(
                                                                    item
                                                                )
                                                            }
                                                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                            title="Edit Holiday"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteEntry(
                                                                    item.id
                                                                )
                                                            }
                                                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                                            title="Delete Holiday"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>

                                                    </div>

                                                </div>
                                            );
                                        }
                                    )}

                                </div>
                            )}

                        </div>

                        {/* FOOTER */}

                        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">

                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                <Settings2 className="h-3.5 w-3.5" />
                                You can edit or remove individual holidays.
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsAnnualCalendarOpen(false)
                                }
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                            >
                                Done
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* ---------------------------------------------------------
               ADD / EDIT MODAL
            --------------------------------------------------------- */}

            {isAddModalOpen && (

                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">

                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

                        {/* HEADER */}

                        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-5">

                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    {editingId
                                        ? 'Edit Holiday / Leave'
                                        : 'Add Holiday / Leave'}
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    {editingId
                                        ? 'Update this calendar record.'
                                        : 'Add a date to your academic calendar.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    resetForm();
                                }}
                                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>

                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={handleSaveEntry}
                            className="space-y-4 p-6"
                        >

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                                    Category{' '}
                                    <span className="text-rose-500">
                                        *
                                    </span>
                                </label>

                                <select
                                    value={form.type}
                                    onChange={(e) => {
                                        const selectedType =
                                            e.target.value;

                                        setForm((prev) => ({
                                            ...prev,
                                            type: selectedType,
                                            name:
                                                prev.name ||
                                                (isPersonalLeave(
                                                    selectedType
                                                )
                                                    ? selectedType
                                                    : ''),
                                        }));
                                    }}
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                >

                                    <optgroup label="Teacher Personal & Academic Leaves">

                                        <option value="Casual Leave (CL)">
                                            Casual Leave (CL)
                                        </option>

                                        <option value="Earned Leave (EL)">
                                            Earned Leave (EL)
                                        </option>

                                        <option value="Duty Leave (DL / Deputation)">
                                            Duty Leave (DL / Deputation)
                                        </option>

                                        <option value="Academic Leave / Conference">
                                            Academic Leave / Conference
                                        </option>

                                        <option value="Medical / Commuted Leave">
                                            Medical / Commuted Leave
                                        </option>

                                        <option value="Special Casual Leave (SCL)">
                                            Special Casual Leave (SCL)
                                        </option>

                                    </optgroup>

                                    <optgroup label="Institutional Calendar Holidays">

                                        <option value="Gazetted Holiday">
                                            Gazetted Holiday
                                        </option>

                                        <option value="Institutional / Vacation Break">
                                            Institutional / Vacation Break
                                        </option>

                                        <option value="Local / Festival Holiday">
                                            Local / Festival Holiday
                                        </option>

                                        <option value="Restricted Holiday">
                                            Restricted Holiday
                                        </option>

                                    </optgroup>

                                </select>

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                                    Title / Occasion / Reason{' '}
                                    <span className="text-rose-500">
                                        *
                                    </span>
                                </label>

                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    placeholder="e.g. Raja Parba / Casual Leave"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                                    Date{' '}
                                    <span className="text-rose-500">
                                        *
                                    </span>
                                </label>

                                <input
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            date: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                            <div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                                    Note / Description{' '}
                                    <span className="font-medium text-slate-400">
                                        (Optional)
                                    </span>
                                </label>

                                <input
                                    type="text"
                                    value={form.description}
                                    placeholder="e.g. Govt Notification / Sanctioned Leave"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description:
                                                e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                            {/* BUTTONS */}

                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        resetForm();
                                    }}
                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-emerald-500 active:scale-95"
                                >
                                    <CheckCircle2 className="h-4 w-4" />

                                    {editingId
                                        ? 'Update Entry'
                                        : 'Save Entry'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}