'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { loadProfile, saveProfile, UserProfile } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
import { User, Camera, ShieldCheck, X, Check, Sparkles } from 'lucide-react';

const INSTITUTION_TYPES = [
    'Degree / Autonomous College',
    'University / PG Department',
    'Higher Secondary (+2) / Junior College',
    'School (Secondary / Elementary)',
    'Other'
];

const DESIGNATION_PRESETS = [
    'Assistant Professor',
    'Associate Professor',
    'Professor / HOD',
    'Reader',
    'Lecturer',
    'Junior Lecturer (+2)',
    'Post Graduate Teacher (PGT)',
    'Trained Graduate Teacher (TGT)',
    'Teacher',
    'Assistant Teacher',
    'Guest / Visiting Faculty',
    'Demonstrator / Lab Instructor',
    'Other'
];

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        designation: 'Assistant Professor',
        mobile: '',
        email: '',
        institutionType: 'Degree / Autonomous College',
        college: '',
        department: '',
        employeeId: '',
        photo: '',
        onboarded: false
    });

    const [customInstitutionType, setCustomInstitutionType] = useState('');
    const [customDesignation, setCustomDesignation] = useState('');
    const [savedNotice, setSavedNotice] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const current = loadProfile();
            if (current) {
                setProfile(current);
                if (current.institutionType && !INSTITUTION_TYPES.includes(current.institutionType)) {
                    setCustomInstitutionType(current.institutionType);
                    setProfile(prev => ({ ...prev, institutionType: 'Other' as any }));
                }
                if (current.designation && !DESIGNATION_PRESETS.includes(current.designation)) {
                    setCustomDesignation(current.designation);
                    setProfile(prev => ({ ...prev, designation: 'Other' }));
                }
            }
        }
    }, [isOpen]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Please select an image smaller than 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({ ...prev, photo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.name.trim() || !profile.college.trim()) {
            alert('Please enter your Name and Institution Name.');
            return;
        }

        setIsSaving(true);

        const finalInstitutionType = profile.institutionType === 'Other' ? customInstitutionType : profile.institutionType;
        const finalDesignation = profile.designation === 'Other' ? customDesignation : profile.designation;

        const updatedProfile: UserProfile = {
            ...profile,
            institutionType: finalInstitutionType as any,
            designation: finalDesignation,
            onboarded: true
        };

        // 1. Instant local write (Zero latency & 100% offline reliability)
        saveProfile(updatedProfile);

        // 2. Background Supabase mirror (Non-blocking zero-cost cloud sync)
        try {
            if (supabase && updatedProfile.mobile) {
                await supabase.from('profiles').upsert(
                    {
                        full_name: updatedProfile.name,
                        phone: updatedProfile.mobile,
                        email: updatedProfile.email || null,
                        school_name: updatedProfile.college,
                        designation: updatedProfile.designation,
                        department: updatedProfile.department || null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'phone' }
                );
            }
        } catch (err) {
            console.error('Supabase profile mirror warning (offline mode active):', err);
        }

        setIsSaving(false);
        setSavedNotice(true);
        setTimeout(() => {
            setSavedNotice(false);
            onClose();
        }, 600);
    };

    if (!isOpen) return null;

    const currentDesignationDisplay = profile.designation === 'Other' ? customDesignation : profile.designation;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-xl rounded-[32px] bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* APNSIR BRAND HEADER */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-6 py-4 text-white">
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
                                <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                    <span>An Initiative by APNSIR Foundation</span>
                                </div>
                                <h3 className="text-base font-black text-white tracking-tight">
                                    Educator Credentials Hub
                                </h3>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MODAL BODY */}
                <div className="overflow-y-auto px-6 py-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
                    
                    {/* LIVE INSPECTION SIGNATURE PREVIEW */}
                    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-md relative overflow-hidden">
                        <Sparkles className="absolute right-3 top-3 w-16 h-16 text-indigo-400/10" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">
                            Live Official Inspection Signature Preview
                        </span>
                        <p className="text-sm sm:text-base font-black text-white mt-1">
                            {profile.name.trim() || 'Dr. Atmaprakash Nayak'}
                        </p>
                        <p className="text-xs text-indigo-200 font-semibold mt-0.5">
                            {currentDesignationDisplay} · {profile.department || 'Department'} · {profile.college || 'Institution Name'}
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4 text-slate-900">
                        
                        {/* AVATAR UPLOAD */}
                        <div className="flex flex-col items-center justify-center space-y-2 pt-1">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100 shadow-md bg-slate-100 flex items-center justify-center">
                                    {profile.photo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-8 h-8 text-slate-400" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2 bg-blue-950 hover:bg-blue-900 text-white rounded-full shadow-lg transition transform hover:scale-105 cursor-pointer"
                                    title="Upload Photo"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                            <span className="text-[11px] font-semibold text-slate-600">Tap camera icon to upload profile photo</span>
                        </div>

                        {/* FORM INPUTS */}
                        <div className="space-y-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Full Name &amp; Title *</label>
                                    <input
                                        required
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        placeholder="e.g. Dr. A. P. Nayak / Prof. S. Panda"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Designation / Role *</label>
                                    <select
                                        required
                                        value={profile.designation}
                                        onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer"
                                    >
                                        {DESIGNATION_PRESETS.map((d) => (
                                            <option key={d} value={d} className="bg-white text-slate-900">{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {profile.designation === 'Other' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Specify Designation *</label>
                                    <input
                                        required
                                        type="text"
                                        value={customDesignation}
                                        onChange={(e) => setCustomDesignation(e.target.value)}
                                        placeholder="Enter custom designation"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Institution Category *</label>
                                <select
                                    value={profile.institutionType}
                                    onChange={(e) => setProfile({ ...profile, institutionType: e.target.value as any })}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer"
                                >
                                    {INSTITUTION_TYPES.map((type) => (
                                        <option key={type} value={type} className="bg-white text-slate-900">{type}</option>
                                    ))}
                                </select>
                            </div>

                            {profile.institutionType === 'Other' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Specify Institution Type *</label>
                                    <input
                                        required
                                        type="text"
                                        value={customInstitutionType}
                                        onChange={(e) => setCustomInstitutionType(e.target.value)}
                                        placeholder="Enter custom institution type"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">School / College / University Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={profile.college}
                                    onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                                    placeholder="e.g. People's College, Buguda / Ravenshaw University"
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Department / Stream / Section</label>
                                    <input
                                        type="text"
                                        value={profile.department || ''}
                                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                        placeholder="e.g. Dept. of English / Arts Stream"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Employee / Teacher ID</label>
                                    <input
                                        type="text"
                                        value={profile.employeeId || ''}
                                        onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                                        placeholder="e.g. EMP-2026-089"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Mobile Contact *</label>
                                    <input
                                        required
                                        type="tel"
                                        maxLength={10}
                                        value={profile.mobile}
                                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value.replace(/\D/g, '') })}
                                        placeholder="9861012345"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Official Email ID</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        placeholder="teacher@institution.edu.in"
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {savedNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : savedNotice ? 'Saved!' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}