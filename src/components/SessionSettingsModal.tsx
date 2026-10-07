'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { getActiveAcademicSession, saveActiveAcademicSession, getCurrentAcademicSession } from '@/lib/store';

export default function SessionSettingsModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [sessionInput, setSessionInput] = useState(() => getActiveAcademicSession());
    const [successMsg, setSuccessMsg] = useState(false);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionInput.trim()) return;

        saveActiveAcademicSession(sessionInput);
        setSuccessMsg(true);
        setTimeout(() => {
            setSuccessMsg(false);
            onClose();
        }, 700);
    };

    const handleResetToAuto = () => {
        const auto = getCurrentAcademicSession();
        setSessionInput(auto);
        saveActiveAcademicSession(auto);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-[30px] border border-white/20 bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-5 animate-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                Academic Session Settings
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Customize your institutional session label &amp; boundaries
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {successMsg ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-bold">Session updated successfully! Refreshing...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Active Academic Session / Year *
                            </label>
                            <input
                                type="text"
                                value={sessionInput}
                                onChange={(e) => setSessionInput(e.target.value)}
                                placeholder="e.g. 2026-2027 or 2026-27"
                                required
                                autoFocus
                                className="w-full px-4 py-3 text-sm font-black text-slate-900 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                            />
                            <p className="mt-1 text-[11px] text-slate-500 font-medium">
                                Auto-calculated default is <strong className="text-slate-800">{getCurrentAcademicSession()}</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleResetToAuto}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset to Auto
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition"
                                >
                                    Save Session
                                </button>
                            </div>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}