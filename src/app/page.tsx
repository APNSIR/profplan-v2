'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, Users, ShieldCheck } from 'lucide-react';

export default function Home() {
    // When landing on the home page, temporarily suppress the global modal
    useEffect(() => {
        try {
            const profile = JSON.parse(localStorage.getItem('profplan_profile') || '{}');
            if (!profile.onboarded) {
                localStorage.setItem('profplan_landing_active', 'true');
            }
        } catch {
            // Ignore
        }

        return () => {
            localStorage.removeItem('profplan_landing_active');
        };
    }, []);

    const handleLaunch = () => {
        localStorage.removeItem('profplan_landing_active');
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col justify-between px-6 py-10 overflow-y-auto selection:bg-indigo-500 selection:text-white">
            
            {/* Top Navigation / Brand with APNSIR Logo */}
            <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-sm border border-slate-700">
                        <Image
                            src="/apnsir-logo.png"
                            alt="APNSIR Foundation Logo"
                            width={44}
                            height={44}
                            priority
                            className="h-full w-full object-contain rounded-full"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                            APNSIR Foundation Initiative
                        </p>
                        <p className="text-sm font-bold text-white">
                            ODISHATEACHERS.COM
                        </p>
                    </div>
                </div>

                <Link
                    href="/timetable"
                    onClick={handleLaunch}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-indigo-500 transition cursor-pointer"
                >
                    Open App <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </header>

            {/* Hero Section */}
            <div className="max-w-3xl mx-auto text-center my-auto py-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Welcome to Odisha Teachers' Platform (OTC)
                </div>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
                    Digital Excellence for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Every Educator in Odisha.</span>
                </h1>

                <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    <strong>E-Lesson Plan-cum-Progress Register</strong> is a gift from <strong>APNSIR FOUNDATION</strong> to the teaching fraternity. It is a smart, simple digital companion for teachers — designed to plan lessons, organise teaching, record classroom progress, and keep the academic year on track.
                </p>

                {/* Main CTA Button with exact requested text */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/timetable"
                        onClick={handleLaunch}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-indigo-900/50 hover:-translate-y-0.5 hover:shadow-2xl transition cursor-pointer text-center"
                    >
                        Open E-Lesson Plan-cum-Progress Register App (ProfPlan) <ArrowRight className="h-5 w-5 shrink-0" />
                    </Link>
                </div>

                {/* Feature Highlights */}
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                    <Link href="/syllabus" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 mb-3">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Syllabus Management</h3>
                        <p className="mt-1 text-xs text-slate-400">Seamlessly configure semesters, major/minor papers, and learning units.</p>
                    </Link>

                    <Link href="/timetable" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 mb-3">
                            <Users className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Weekly Routine</h3>
                        <p className="mt-1 text-xs text-slate-400">Map out instructional periods with built-in conflict checking and room allocation.</p>
                    </Link>

                    <Link href="/today" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-3">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Secure & Private</h3>
                        <p className="mt-1 text-xs text-slate-400">Your professional records remain private and secure on your local device.</p>
                    </Link>
                </div>
            </div>

            {/* Footer with branding line */}
            <footer className="max-w-5xl mx-auto w-full pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
                <p>© {new Date().getFullYear()} APNSIR Foundation Initiative. All rights reserved.</p>
                <p className="text-indigo-400 font-bold tracking-wider">Odishateachers.com | APNSIR FOUNDATION</p>
            </footer>

        </div>
    );
}