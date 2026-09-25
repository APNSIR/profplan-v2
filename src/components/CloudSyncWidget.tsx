'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudUpload, CloudDownload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { syncToGoogleDrive, restoreFromGoogleDrive, getStoredToken } from '@/lib/gdrive';

export default function CloudSyncWidget() {
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const savedTime = localStorage.getItem('profplan_last_gdrive_sync');
    if (savedTime) {
      setLastSyncTime(new Date(savedTime).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }, []);

  const handleBackup = async () => {
    setSyncing(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await syncToGoogleDrive();
      if (res.success) {
        const now = new Date().toISOString();
        localStorage.setItem('profplan_last_gdrive_sync', now);
        setLastSyncTime(new Date(now).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }));
        setStatusMessage(res.message);
      } else {
        setIsError(true);
        setStatusMessage(res.message);
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err.message || 'Drive sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Restore academic records from your Google Drive? This will update your local register.')) {
      return;
    }

    setRestoring(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await restoreFromGoogleDrive();
      if (res.success) {
        setStatusMessage(res.message);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setIsError(true);
        setStatusMessage(res.message);
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err.message || 'Failed to restore from Drive');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 text-white shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide text-white uppercase">Google Drive Sync</h4>
            <p className="text-[10px] text-slate-400 font-medium">Private AppData • Zero Cost</p>
          </div>
        </div>

        {lastSyncTime && (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            Synced {lastSyncTime}
          </span>
        )}
      </div>

      {statusMessage && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-semibold ${
            isError
              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          )}
          <span className="leading-snug">{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={handleBackup}
          disabled={syncing || restoring}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow transition disabled:opacity-50"
        >
          {syncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CloudUpload className="w-3.5 h-3.5" />
          )}
          {syncing ? 'Backing up...' : 'Backup Now'}
        </button>

        <button
          type="button"
          onClick={handleRestore}
          disabled={syncing || restoring}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 shadow transition disabled:opacity-50"
        >
          {restoring ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CloudDownload className="w-3.5 h-3.5" />
          )}
          {restoring ? 'Restoring...' : 'Restore'}
        </button>
      </div>
    </div>
  );
}
