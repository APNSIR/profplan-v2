'use client';

import { useRef, useState } from 'react';
import { exportProfPlanBackup, restoreProfPlanBackup } from '@/lib/backup';
import { exportTeachingRegisterCSV } from '@/lib/exportRegister';
import { Download, Upload, FileSpreadsheet, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface DataHubModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DataHubModal({ isOpen, onClose }: DataHubModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!isOpen) return null;

    const handleExportBackup = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            await exportProfPlanBackup();
            setStatusMessage({ type: 'success', text: 'Backup downloaded successfully.' });
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Backup failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            await exportTeachingRegisterCSV();
            setStatusMessage({ type: 'success', text: 'Teaching register CSV downloaded.' });
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Export failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm('Restoring this backup will replace current academic records with the file contents. Proceed?')) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        setStatusMessage(null);
        try {
            const res = await restoreProfPlanBackup(file);
            if (res.success) {
                setStatusMessage({ type: 'success', text: res.message });
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                setStatusMessage({ type: 'error', text: res.message });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Restore failed.' });
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Academic Data &amp; Backup Hub</h3>
                            <p className="text-xs text-slate-500 font-medium">Protect records &amp; export departmental registers</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Notifications */}
                {statusMessage && (
                    <div
                        className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                : 'bg-rose-50 text-rose-900 border border-rose-200'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* Actions Grid */}
                <div className="space-y-3">
                    {/* 1. Complete Backup */}
                    <button
                        type="button"
                        onClick={handleExportBackup}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl transition group text-left"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900">Export Full JSON Backup</h4>
                                <p className="text-xs text-slate-500 font-medium">Includes timetable, courses, units, and all progress logs</p>
                            </div>
                        </div>
                    </button>

                    {/* 2. Departmental CSV Register */}
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl transition group text-left"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900">Export Teaching Register (Excel / CSV)</h4>
                                <p className="text-xs text-slate-500 font-medium">Standard chronological register for NAAC and college compliance</p>
                            </div>
                        </div>
                    </button>

                    {/* 3. Restore Snapshot */}
                    <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-950">Restore from Backup File</h4>
                                    <p className="text-xs text-amber-800/80 font-medium">Load an existing JSON snapshot into this browser</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm transition"
                            >
                                Choose File
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                <div className="pt-2 text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}