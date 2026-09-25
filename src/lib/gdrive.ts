// src/lib/gdrive.ts

import { load, save, loadProfile, saveProfile, ProfPlanData } from './store';
import { db } from './db';

declare global {
  interface Window {
    google?: any;
  }
}

// You can configure your Google Cloud OAuth Client ID in your .env as NEXT_PUBLIC_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILE_NAME = 'profplan_academic_sync.json';

const TOKEN_KEY = 'profplan_gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'profplan_gdrive_token_expiry';

/**
 * Retrieves a valid, unexpired OAuth access token from localStorage.
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }

  return token;
}

/**
 * Prompts user via Google Identity Services (GIS) token client to obtain an access token.
 */
export async function requestGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      return reject(
        new Error(
          'Google Identity Services script not yet loaded. Please verify your internet connection or layout script.'
        )
      );
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          return reject(new Error(response.error_description || response.error));
        }

        const expiresInMs = (Number(response.expires_in) || 3599) * 1000;
        const expiryTime = Date.now() + expiresInMs;

        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));

        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Locates the existing sync file in Google Drive AppData folder, if present.
 */
async function findExistingSyncFileId(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to query Drive AppData: ${errorText}`);
  }

  const result = await res.json();
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }

  return null;
}

/**
 * Syncs the current local and IndexedDB academic records into Google Drive AppData.
 */
export async function syncToGoogleDrive(): Promise<{ success: boolean; message: string }> {
  try {
    let token = getStoredToken();
    if (!token) {
      token = await requestGoogleAccessToken();
    }

    // Collect latest snapshot from IndexedDB with fallback to localStorage
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
      classes: classes.length > 0 ? (classes as any) : currentLocal.classes || [],
      courses: courses.length > 0 ? (courses as any) : currentLocal.courses || [],
      units: currentLocal.units || [],
      topics: topics.length > 0 ? (topics as any) : currentLocal.topics || [],
      slots: slots.length > 0 ? (slots as any) : currentLocal.slots || [],
      logs: logs.length > 0 ? (logs as any) : currentLocal.logs || [],
      holidays: holidays.length > 0 ? (holidays as any) : currentLocal.holidays || [],
    };

    const payload = {
      version: 2,
      appName: 'ProfPlan',
      exportedAt: new Date().toISOString(),
      profile: profile || null,
      data: fullData,
    };

    const fileContent = JSON.stringify(payload, null, 2);
    const existingFileId = await findExistingSyncFileId(token);

    if (existingFileId) {
      // Update existing sync file
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        }
      );

      if (!updateRes.ok) {
        throw new Error('Failed to update Google Drive sync file.');
      }
    } else {
      // Create new multipart file in appDataFolder
      const metadata = {
        name: SYNC_FILE_NAME,
        parents: ['appDataFolder'],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!createRes.ok) {
        throw new Error('Failed to create new sync file in Google Drive.');
      }
    }

    return {
      success: true,
      message: `Backed up to Google Drive (${fullData.logs.length} progress logs, ${fullData.classes.length} classes).`,
    };
  } catch (err: any) {
    console.error('Google Drive Sync error:', err);
    return {
      success: false,
      message: err.message || 'Google Drive sync failed.',
    };
  }
}

/**
 * Restores academic records and educator profile from Google Drive AppData.
 */
export async function restoreFromGoogleDrive(): Promise<{ success: boolean; message: string }> {
  try {
    let token = getStoredToken();
    if (!token) {
      token = await requestGoogleAccessToken();
    }

    const fileId = await findExistingSyncFileId(token);
    if (!fileId) {
      return {
        success: false,
        message: 'No backup found in your Google Drive AppData folder.',
      };
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error('Failed to download backup file from Google Drive.');
    }

    const parsed = await res.json();
    if (!parsed || (parsed.appName !== 'ProfPlan' && !parsed.data)) {
      return {
        success: false,
        message: 'Invalid backup file structure in Google Drive.',
      };
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

    // Save to local persistence layers
    save(sanitizedData);
    if (parsed.profile) {
      saveProfile(parsed.profile);
    }

    return {
      success: true,
      message: `Restored ${sanitizedData.logs.length} teaching logs and ${sanitizedData.classes.length} classes from Google Drive.`,
    };
  } catch (err: any) {
    console.error('Google Drive Restore error:', err);
    return {
      success: false,
      message: err.message || 'Failed to restore records from Google Drive.',
    };
  }
}