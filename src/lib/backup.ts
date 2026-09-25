// src/lib/backup.ts

import { db } from './db';
import { load, save, loadProfile, saveProfile, ProfPlanData } from './store';

export interface ProfPlanBackupPayload {
    version: number;
    appName: 'ProfPlan';
    exportedAt: string;
    profile: any;
    data: ProfPlanData;
}

/**
 * Creates and downloads a complete snapshot of all academic data and educator profile.
 */
export async function exportProfPlanBackup(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        // Collect latest data from Dexie with localStorage fallback
        const [classes, courses, topics, slots, logs, holidays] = await Promise.all([
            db.classes.toArray(),
            db.courses.toArray(),
            db.topics.toArray(),
            db.slots.toArray(),
            db.logs.toArray(),
            db.holidays.toArray(),
        ]);

        const currentLocal = load();
        const profile = loadProfile();

        const fullData: ProfPlanData = {
            classes: classes.length > 0 ? (classes as any) : currentLocal.classes,
            courses: courses.length > 0 ? (courses as any) : currentLocal.courses,
            units: currentLocal.units || [],
            topics: topics.length > 0 ? (topics as any) : currentLocal.topics,
            slots: slots.length > 0 ? (slots as any) : currentLocal.slots,
            logs: logs.length > 0 ? (logs as any) : currentLocal.logs,
            holidays: holidays.length > 0 ? (holidays as any) : currentLocal.holidays,
        };

        const backup: ProfPlanBackupPayload = {
            version: 2,
            appName: 'ProfPlan',
            exportedAt: new Date().toISOString(),
            profile: profile || null,
            data: fullData,
        };

        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ProfPlan_Backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Failed to generate backup file:', err);
        throw new Error('Could not export academic backup file.');
    }
}

/**
 * Restores ProfPlan data from a valid backup file into both IndexedDB and localStorage.
 */
export async function restoreProfPlanBackup(file: File): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) {
                    return resolve({ success: false, message: 'File is empty.' });
                }

                const parsed = JSON.parse(text);

                // Sanity check: Ensure valid ProfPlan JSON structure
                if (!parsed || (parsed.appName !== 'ProfPlan' && !parsed.data)) {
                    return resolve({
                        success: false,
                        message: 'Invalid backup file. Missing ProfPlan signature.',
                    });
                }

                const payloadData: ProfPlanData = parsed.data || parsed;

                // Validate minimum structural integrity
                const sanitizedData: ProfPlanData = {
                    classes: Array.isArray(payloadData.classes) ? payloadData.classes : [],
                    courses: Array.isArray(payloadData.courses) ? payloadData.courses : [],
                    units: Array.isArray(payloadData.units) ? payloadData.units : [],
                    topics: Array.isArray(payloadData.topics) ? payloadData.topics : [],
                    slots: Array.isArray(payloadData.slots) ? payloadData.slots : [],
                    logs: Array.isArray(payloadData.logs) ? payloadData.logs : [],
                    holidays: Array.isArray(payloadData.holidays) ? payloadData.holidays : [],
                };

                // 1. Write to localStorage and trigger events
                save(sanitizedData);

                // 2. Restore profile if included
                if (parsed.profile) {
                    saveProfile(parsed.profile);
                }

                resolve({
                    success: true,
                    message: `Backup successfully restored with ${sanitizedData.logs.length} teaching logs and ${sanitizedData.classes.length} classes.`,
                });
            } catch (err: any) {
                console.error('Failed to restore backup:', err);
                resolve({ success: false, message: `Corrupted file: ${err.message || 'Parse error'}` });
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file from disk.'));
        };

        reader.readAsText(file);
    });
}