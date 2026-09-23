'use client';

import React, { useState, useEffect, useRef } from 'react';
import { loadProfile, saveProfile, UserProfile } from '@/lib/store';
import { User, Camera, ShieldCheck, X, Check } from 'lucide-react';

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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.name.trim() || !profile.college.trim()) {
            alert('Please enter your Name and Institution Name.');
            return;
        }

        const finalInstitutionType = profile.institutionType === 'Other' ? customInstitutionType : profile.institutionType;
        const finalDesignation = profile.designation === 'Other' ? customDesignation : profile.designation;

        saveProfile({
            ...profile,
            institutionType: finalInstitutionType as any,
            designation: finalDesignation,
            onboarded: true
        });

        setSavedNotice(true);
        setTimeout(() => {
            setSavedNotice(false);
            onClose();
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-900" />
                        <h2 className="text-base font-black text-slate-900">Educator &amp; Institutional Profile</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4 text-slate-900">
                    {/* AVATAR UPLOAD */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 shadow-md bg-slate-100 flex items-center justify-center">
                                {profile.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-slate-500" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-blue-950 hover:bg-blue-900 text-white rounded-full shadow-lg transition transform hover:scale-105"
                                title="Upload Photo"
                            >
                                <Camera className="w-4 h-4" />
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
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Full Name &amp; Title *</label>
                                <input
                                    required
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    placeholder="e.g. Dr. A. P. Nayak / Prof. S. Panda"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Designation / Role *</label>
                                <select
                                    required
                                    value={profile.designation}
                                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
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
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">Institution Category *</label>
                            <select
                                value={profile.institutionType}
                                onChange={(e) => setProfile({ ...profile, institutionType: e.target.value as any })}
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
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
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
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
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Department / Stream / Section</label>
                                <input
                                    type="text"
                                    value={profile.department || ''}
                                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                    placeholder="e.g. Dept. of English / Arts Stream"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Employee / Teacher ID</label>
                                <input
                                    type="text"
                                    value={profile.employeeId || ''}
                                    onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                                    placeholder="e.g. EMP-2026-089"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Mobile Contact</label>
                                <input
                                    type="tel"
                                    value={profile.mobile}
                                    onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">Official Email ID</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    placeholder="teacher@institution.edu.in"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1.5"
                        >
                            {savedNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4" />}
                            {savedNotice ? 'Saved!' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}