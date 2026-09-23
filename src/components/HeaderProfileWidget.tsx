'use client';

import React, { useState, useEffect } from 'react';
import { loadProfile, UserProfile } from '@/lib/store';
import ProfileModal from '@/components/ProfileModal';
import { User, ShieldCheck } from 'lucide-react';

export default function HeaderProfileWidget() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        setProfile(loadProfile());

        const refresh = () => setProfile(loadProfile());
        window.addEventListener('profplan-profile-change', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('profplan-profile-change', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition transform active:scale-95 text-left shadow-sm"
                title="View and edit your educator profile & photo"
            >
                {/* AVATAR CIRCLE */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0 border border-white/40 group-hover:border-white transition">
                    {profile?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.photo}
                            alt={profile.name || 'Educator Photo'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-4 h-4 text-white" />
                    )}
                </div>

                {/* NAME & INSTITUTION DETAILS */}
                <div className="hidden sm:block">
                    <span className="block text-xs font-black text-white leading-tight truncate max-w-[150px] md:max-w-[190px]">
                        {profile?.name || 'Set Educator Profile'}
                    </span>
                    <span className="block text-[10px] font-semibold text-blue-200 leading-tight truncate max-w-[150px] md:max-w-[190px]">
                        {profile?.designation ? `${profile.designation} · ` : ''}
                        {profile?.college || 'Set School / College'}
                    </span>
                </div>
            </button>

            {/* INTERACTIVE PROFILE MODAL */}
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </>
    );
}