// src/lib/gdrive.ts

import { db } from './db';
import { load, loadProfile, save, saveProfile, ProfPlanData } from './store';
import { ProfPlanBackupPayload } from './backup';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILE_NAME = 'profplan_cloud_sync.json';
const TOKEN_STORAGE_KEY = 'profplan_gdrive_token';

declare global {
    interface Window {
        google?: any;
    }
}

/**
 * Retrieves the cached access token from sessionStorage if present.
 */
export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Stores the access token in sessionStorage.
 */
export function storeToken(token: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Clears the stored access token.
 */
export function clearStoredToken(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Loads the Google Identity Services (GIS) client script dynamically into the DOM.
 */
export function loadGoogleIdentityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return resolve();
        if (window.google?.accounts?.oauth2) return resolve();

        const existingScript = document.getElementById('google-gis-script');
        if (existingScript) return resolve();

        const script = document.createElement('script');
        script.id = 'google-gis-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
        document.body.appendChild(script);
    });
}

/**
 * Requests an OAuth2 access token for Google Drive AppData scope using standard popup consent.
 */
export async function requestGoogleAccessToken(): Promise<string> {
    await loadGoogleIdentityScript();

    return new Promise((resolve, reject) => {
        if (!CLIENT_ID) {
            return reject(
                new Error(
                    'Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.'
                )
            );
        }

        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        return reject(new Error(tokenResponse.error_description || tokenResponse.error));
                    }
                    storeToken(tokenResponse.access_token);
                    resolve(tokenResponse.access_token);
                },
            });
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err: any) {
            reject(new Error(err?.message || 'Failed to initialize Google authentication client.'));
        }
    });
}

/**
 * Helper to ensure a valid access token exists before API calls.
 */
async function resolveAccessToken(token?: string): Promise<string> {
    if (token) return token;
    const stored = getStoredToken();
    if (stored) return stored;
    return await requestGoogleAccessToken();
}

/**
 * Locates the sync file id inside the hidden AppData folder if it already exists.
 */
async function findSyncFileId(accessToken: string): Promise<string | null> {
    const q = encodeURIComponent(`name = '${SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`);
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) {
        throw new Error(`Google Drive query error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Backs up all Dexie IndexedDB tables, local state, and teacher profile to Google Drive AppData.
 * Returns success status, formatted time, and status message for CloudSyncWidget.
 */
export async function syncToGoogleDrive(
    accessToken?: string
): Promise<{ success: boolean; time: string; message: string }> {
    const token = await resolveAccessToken(accessToken);

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

    const payload: ProfPlanBackupPayload = {
        version: 2,
        appName: 'ProfPlan',
        exportedAt: new Date().toISOString(),
        profile: profile || null,
        data: fullData,
    };

    const existingFileId = await findSyncFileId(token);
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
        name: SYNC_FILE_NAME,
        mimeType: 'application/json',
        ...(existingFileId ? {} : { parents: ['appDataFolder'] }),
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(payload) +
        closeDelimiter;

    const endpoint = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const res = await fetch(endpoint, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
    });

    if (!res.ok) {
        throw new Error(`Google Drive sync upload failed: ${res.statusText}`);
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
        success: true,
        time: timeStr,
        message: `Successfully synced ${fullData.logs.length} teaching logs to Google Drive at ${timeStr}.`,
    };
}

/**
 * Downloads the backup snapshot from Google Drive AppData and restores it into IndexedDB and localStorage.
 */
export async function restoreFromGoogleDrive(accessToken?: string): Promise<{ success: boolean; message: string }> {
    const token = await resolveAccessToken(accessToken);

    const fileId = await findSyncFileId(token);
    if (!fileId) {
        return {
            success: false,
            message: 'No existing backup snapshot was found in your Google Drive AppData folder.',
        };
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Failed to download backup file: ${res.statusText}`);
    }

    const parsed = await res.json();
    if (!parsed || (parsed.appName !== 'ProfPlan' && !parsed.data)) {
        return { success: false, message: 'Invalid file signature: Missing ProfPlan structure.' };
    }

    const payloadData: ProfPlanData = parsed.data || parsed;

    const sanitizedData: ProfPlanData = {
        classes: Array.isArray(payloadData.classes) ? payloadData.classes : [],
        courses: Array.isArray(payloadData.courses) ? payloadData.courses : [],
        units: Array.isArray(payloadData.units) ? payloadData.units : [],
        topics: Array.isArray(payloadData.topics) ? payloadData.topics : [],
        slots: Array.isArray(payloadData.slots) ? payloadData.slots : [],
        logs: Array.isArray(payloadData.logs) ? payloadData.logs : [],
        holidays: Array.isArray(payloadData.holidays) ? payloadData.holidays : [],
    };

    // 1. Transactionally restore IndexedDB (Dexie)
    await db.transaction('rw', [db.classes, db.courses, db.topics, db.slots, db.logs, db.holidays], async () => {
        await Promise.all([
            db.classes.clear(),
            db.courses.clear(),
            db.topics.clear(),
            db.slots.clear(),
            db.logs.clear(),
            db.holidays.clear(),
        ]);

        if (sanitizedData.classes.length) await db.classes.bulkPut(sanitizedData.classes as any);
        if (sanitizedData.courses.length) await db.courses.bulkPut(sanitizedData.courses as any);
        if (sanitizedData.topics.length) await db.topics.bulkPut(sanitizedData.topics as any);
        if (sanitizedData.slots.length) await db.slots.bulkPut(sanitizedData.slots as any);
        if (sanitizedData.logs.length) await db.logs.bulkPut(sanitizedData.logs as any);
        if (sanitizedData.holidays.length) await db.holidays.bulkPut(sanitizedData.holidays as any);
    });

    // 2. Sync to localStorage fallback
    save(sanitizedData);

    // 3. Restore educator profile
    if (parsed.profile) {
        saveProfile(parsed.profile);
    }

    // 4. Notify all components
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profplan-change'));
    }

    return {
        success: true,
        message: `Cloud backup restored successfully with ${sanitizedData.logs.length} teaching logs.`,
    };
}
