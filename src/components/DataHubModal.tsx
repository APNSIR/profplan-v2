'use client';

import { useRef, useState } from 'react';
import { exportProfPlanBackup, restoreProfPlanBackup } from '@/lib/backup';
import { exportTeachingRegisterCSV } from '@/lib/exportRegister';
import { syncToGoogleDrive, restoreFromGoogleDrive } from '@/lib/gdrive';
import {
    Download,
    Upload,
    FileSpreadsheet,
    ShieldCheck,
    X,
    AlertCircle,
    Cloud,
    CloudDownload,
    RefreshCw
} from 'lucide-react';

interface DataHubModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DataHubModal({ isOpen, onClose }: DataHubModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [actionLabel, setActionLabel] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!isOpen) return null;

    // 1. Google Drive Cloud Sync
    const handleGoogleDriveSync = async () => {
        setLoading(true);
        setActionLabel('Connecting to Google Drive...');
        setStatusMessage(null);
        try {
            const res = await syncToGoogleDrive();
            if (res.success) {
                setStatusMessage({ type: 'success', text: res.message });
            } else {
                setStatusMessage({ type: 'error', text: res.message });
            }
        } catch (err: any) {
            console.error('Google Drive Sync error:', err);
            setStatusMessage({ type: 'error', text: err.message || 'Google Drive sync failed.' });
        } finally {
            setLoading(false);
            setActionLabel(null);
        }
    };

    // 2. Google Drive Cloud Restore
    const handleGoogleDriveRestore = async () => {
        if (!window.confirm('Restore your academic records from Google Drive? This will update your timetable, courses, and logs.')) {
            return;
        }

        setLoading(true);
        setActionLabel('Restoring from Google Drive...');
        setStatusMessage(null);
        try {
            const res = await restoreFromGoogleDrive();
            if (res.success) {
                setStatusMessage({ type: 'success', text: res.message });
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                setStatusMessage({ type: 'error', text: res.message });
            }
        } catch (err: any) {
            console.error('Google Drive Restore error:', err);
            setStatusMessage({ type: 'error', text: err.message || 'Google Drive restore failed.' });
        } finally {
            setLoading(false);
            setActionLabel(null);
        }
    };

    // 3. Local Full JSON Backup
    const handleExportBackup = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            await exportProfPlanBackup();
            setStatusMessage({ type: 'success', text: 'Local JSON snapshot downloaded.' });
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Backup failed.' });
        } finally {
            setLoading(false);
        }
    };

    // 4. Teaching Register CSV (Excel)
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

    // 5. Restore from local JSON file
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
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Academic Data &amp; Cloud Hub</h3>
                            <p className="text-xs text-slate-500 font-medium">Google Drive cloud sync &amp; official departmental registers</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Notifications & Progress */}
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

                {loading && actionLabel && (
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                        <span>{actionLabel}</span>
                    </div>
                )}

                {/* Actions Grid */}
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">

                    {/* 1. GOOGLE DRIVE SYNC & BACKUP */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-2 border-blue-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                                    <Cloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">Google Drive Cloud Storage</h4>
                                    <p className="text-[11px] text-blue-800/80 font-medium">Private AppData backup linked to your Google Account</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleGoogleDriveSync}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm transition active:scale-95"
                            >
                                <Cloud className="w-3.5 h-3.5" />
                                Sync to Drive
                            </button>

                            <button
                                type="button"
                                onClick={handleGoogleDriveRestore}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-blue-50 disabled:opacity-50 text-blue-900 border border-blue-300 text-xs font-extrabold rounded-xl shadow-sm transition active:scale-95"
                            >
                                <CloudDownload className="w-3.5 h-3.5 text-blue-700" />
                                Restore from Drive
                            </button>
                        </div>
                    </div>

                    {/* 2. Full JSON Backup (Local Disk) */}
                    <button
                        type="button"
                        onClick={handleExportBackup}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl transition group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                                <Download className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-slate-900">Export Full JSON Snapshot</h4>
                                <p className="text-[11px] text-slate-500 font-medium">Download complete offline copy to your PC</p>
                            </div>
                        </div>
                    </button>

                    {/* 3. Departmental CSV Register */}
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl transition group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
                                <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-slate-900">Export Teaching Register (Excel / CSV)</h4>
                                <p className="text-[11px] text-slate-500 font-medium">Chronological register formatted for college compliance</p>
                            </div>
                        </div>
                    </button>

                    {/* 4. Restore from Local Snapshot */}
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                                <Upload className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-amber-950">Restore from Local JSON</h4>
                                <p className="text-[11px] text-amber-800/80 font-medium">Load file from your computer</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-sm transition"
                        >
                            Select File
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

                <div className="pt-2 text-right border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}