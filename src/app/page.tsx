'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Building2, 
  FileCheck2, 
  Laptop 
} from 'lucide-react';

export default function Home() {
    const phoneNumber = "6371421335";
    const corporateAddress = "Qr. No. BL-106, VSS Nagar, Mancheswar, Bhubaneswar, Khorda - 751017, Odisha";

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
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col justify-between px-6 py-6 overflow-y-auto selection:bg-indigo-500 selection:text-white">
            
            {/* Top Navigation / Brand with APNSIR Logo */}
            <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-md border border-slate-700">
                        <Image
                            src="/apnsir-logo.png"
                            alt="APNSIR Foundation Logo"
                            width={48}
                            height={48}
                            priority
                            className="h-full w-full object-contain rounded-full"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                            APNSIR Foundation (An NGO for Teachers)
                        </p>
                        <p className="text-sm font-extrabold text-white tracking-wide">
                            OdishaTeachers<span className="text-orange-500 font-black">.com</span>
                        </p>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                        <Phone className="h-3.5 w-3.5 text-orange-400" />
                        <span className="font-bold">{phoneNumber}</span>
                    </div>
                    <Link
                        href="/timetable"
                        onClick={handleLaunch}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-indigo-500 transition cursor-pointer"
                    >
                        Open App <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <div className="max-w-3xl mx-auto text-center my-auto py-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30 mb-5 shadow-sm">
                    <Sparkles className="h-4 w-4 text-orange-400" /> Welcome to OdishaTeachers.com — An inclusive platform for educators and the community that supports them.
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
                    Digital Excellence for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-white">Every Educator in Odisha.</span>
                </h1>

                {/* Fully Clickable, Perfectly Centered PROFPLAN Product Card (Without Launch App Text) */}
                <Link 
                    href="/timetable" 
                    onClick={handleLaunch}
                    className="group block mt-6 text-slate-200 max-w-2xl mx-auto leading-relaxed bg-gradient-to-b from-white/[0.09] to-white/[0.04] border border-white/20 p-7 rounded-[2rem] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition duration-300 hover:-translate-y-1 hover:border-indigo-500/60 hover:shadow-indigo-500/10 cursor-pointer text-center relative overflow-hidden"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ring-1 ring-indigo-500/30">
                        <Laptop className="h-3.5 w-3.5 text-orange-400" /> Featured Digital Tool
                    </div>
                    <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 text-3xl tracking-tight">PROFPLAN</p>
                    <p className="text-indigo-200 font-bold text-sm mt-1 tracking-wide">E-Lesson Plan-cum-Progress Register</p>
                    <p className="text-orange-400 font-extrabold text-xs mt-3 uppercase tracking-wider">A Gift to the Teaching Fraternity</p>
                    <p className="text-slate-300 text-xs font-medium tracking-wider mt-1.5 italic">Plan • Teach • Record • Progress</p>
                    <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-indigo-300 font-bold tracking-[0.18em] uppercase">
                        An APNSIR FOUNDATION Initiative
                    </div>
                </Link>

                {/* Main CTA Button */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/timetable"
                        onClick={handleLaunch}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-indigo-900/50 hover:-translate-y-0.5 hover:shadow-2xl transition cursor-pointer text-center"
                    >
                        Open E-Lesson Plan-cum-Progress Register App (ProfPlan) <ArrowRight className="h-5 w-5 shrink-0" />
                    </Link>
                </div>

                {/* Feature Highlights Grid */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <Link href="/syllabus" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 mb-2">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <h3 className="text-xs font-bold text-white">Syllabus Management</h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">Configure semesters, papers, and learning units easily.</p>
                    </Link>

                    <Link href="/timetable" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 mb-2">
                            <Users className="h-4 w-4" />
                        </div>
                        <h3 className="text-xs font-bold text-white">Weekly Routine</h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">Map instructional periods with conflict checking.</p>
                    </Link>

                    <Link href="/today" onClick={handleLaunch} className="block rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-indigo-500/50 transition cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-2">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h3 className="text-xs font-bold text-white">Secure & Private</h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">Records remain secure and private on your device.</p>
                    </Link>
                </div>

                {/* Statutory Trust Badges Bar */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-indigo-200">
                    <span className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" /> 12AB & 80G Tax-Exempt Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <Building2 className="h-3.5 w-3.5 text-orange-400" /> CIN: U85500OD2024NPL046895
                    </span>
                </div>
            </div>

            {/* Footer with corporate office address, phone number, and branding */}
            <footer className="max-w-5xl mx-auto w-full pt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-3">
                <div className="text-center sm:text-left">
                    <p>© {new Date().getFullYear()} APNSIR Foundation Initiative. All rights reserved.</p>
                    <p className="text-indigo-300 font-bold tracking-wider mt-0.5">
                        OdishaTeachers<span className="text-orange-500">.com</span> | APNSIR FOUNDATION
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-right">
                    <div className="flex items-center gap-1 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <span>{corporateAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{phoneNumber}</span>
                    </div>
                </div>
            </footer>

        </div>
    );
}