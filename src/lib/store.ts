// src/lib/store.ts

import type {
    Course,
    Unit,
    Topic,
    Slot,
    Log,
    Holiday,
    ClassItem,
    ProfPlanData,
    UserProfile,
} from './types';
import {
    db,
    ClassEntity,
    CourseEntity,
    TopicEntity,
    SlotEntity,
    LogEntity,
    HolidayEntity,
} from './db';

export type {
    Course,
    Unit,
    Topic,
    Slot,
    Log,
    Holiday,
    ClassItem,
    ProfPlanData,
    UserProfile,
};

/*
 * =========================================================
 * PROFPLAN LOCAL & INDEXED STORAGE
 * =========================================================
 *
 * ProfPlan is a local-first application.
 *
 * Academic data is created by the educator through onboarding
 * and the application itself. There are NO demo/default
 * classes, subjects, units, topics or timetable entries.
 *
 * Dual-Write Architecture:
 * Writes update localStorage synchronously for immediate UI reactivity
 * and mirror asynchronously to IndexedDB (ProfPlanDB) for durable storage.
 */

const STORAGE_KEY = 'profplan_v2_data';
const PROFILE_KEY = 'profplan_v2_profile';

/*
 * =========================================================
 * EMPTY INITIAL WORKSPACE
 * =========================================================
 */

const EMPTY_DATA: ProfPlanData = {
    classes: [],
    courses: [],
    units: [],
    topics: [],
    slots: [],
    logs: [],
    holidays: [],
};

/*
 * =========================================================
 * ASYNC DUAL-WRITE TO INDEXEDDB (BACKGROUND SYNC)
 * =========================================================
 */

export async function syncToIndexedDB(data: ProfPlanData): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        await db.transaction(
            'rw',
            [db.classes, db.courses, db.topics, db.slots, db.logs, db.holidays],
            async () => {
                // 1. Classes
                await db.classes.clear();
                if (data.classes?.length) {
                    const sanitizedClasses: ClassEntity[] = data.classes.map((c: any) => ({
                        ...c,
                        id: String(c.id),
                        name: String(c.name || 'Unnamed Class'),
                        stream: c.stream || 'General',
                    }));
                    await db.classes.bulkPut(sanitizedClasses);
                }

                // 2. Courses
                await db.courses.clear();
                if (data.courses?.length) {
                    const sanitizedCourses: CourseEntity[] = data.courses.map((co: any) => ({
                        ...co,
                        id: String(co.id),
                        name: String(co.name || 'Subject'),
                        code: co.code || '',
                    }));
                    await db.courses.bulkPut(sanitizedCourses);
                }

                // 3. Topics
                await db.topics.clear();
                if (data.topics?.length) {
                    const sanitizedTopics: TopicEntity[] = data.topics.map((t: any) => ({
                        ...t,
                        id: String(t.id),
                        courseId: String(t.courseId || ''),
                    }));
                    await db.topics.bulkPut(sanitizedTopics);
                }

                // 4. Slots (Timetable)
                await db.slots.clear();
                if (data.slots?.length) {
                    const sanitizedSlots: SlotEntity[] = data.slots.map((s: any, idx: number) => ({
                        ...s,
                        id: String(s.id),
                        day: s.day ?? 'Monday',
                        period: Number(s.period) || idx + 1,
                        start: s.start || '09:00',
                        end: s.end || '09:45',
                        courseId: String(s.courseId || ''),
                    }));
                    await db.slots.bulkPut(sanitizedSlots);
                }

                // 5. Logs (Register Entries)
                await db.logs.clear();
                if (data.logs?.length) {
                    const sanitizedLogs: LogEntity[] = data.logs.map((l: any) => ({
                        ...l,
                        id: String(l.id),
                        date: l.date || new Date().toISOString().slice(0, 10),
                        courseId: String(l.courseId || ''),
                        status: l.status === 'completed' ? 'Taken' : l.status || 'Taken',
                    }));
                    await db.logs.bulkPut(sanitizedLogs);
                }

                // 6. Holidays
                await db.holidays.clear();
                if (data.holidays?.length) {
                    const sanitizedHolidays: HolidayEntity[] = data.holidays.map((h: any) => ({
                        ...h,
                        id: String(h.id),
                        date: String(h.date || ''),
                        name: String(h.name || 'Holiday'),
                    }));
                    await db.holidays.bulkPut(sanitizedHolidays);
                }
            }
        );
    } catch (err) {
        console.error('ProfPlan: Background sync to IndexedDB failed:', err);
    }
}

/*
 * =========================================================
 * LOAD ACADEMIC DATA (SYNCHRONOUS FOR FAST MOUNT)
 * =========================================================
 */

export function load(): ProfPlanData {
    if (typeof window === 'undefined') {
        return EMPTY_DATA;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            save(EMPTY_DATA);
            return EMPTY_DATA;
        }

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            console.warn(
                'Invalid ProfPlan localStorage data. Starting with an empty workspace.'
            );
            save(EMPTY_DATA);
            return EMPTY_DATA;
        }

        const data = parsed as Partial<ProfPlanData>;

        return {
            classes: Array.isArray(data.classes) ? data.classes : [],
            courses: Array.isArray(data.courses) ? data.courses : [],
            units: Array.isArray(data.units) ? data.units : [],
            topics: Array.isArray(data.topics) ? data.topics : [],
            slots: Array.isArray(data.slots) ? data.slots : [],
            logs: Array.isArray(data.logs) ? data.logs : [],
            holidays: Array.isArray(data.holidays) ? data.holidays : [],
        };
    } catch (e) {
        console.error('Failed to load ProfPlan data from localStorage:', e);
        return EMPTY_DATA;
    }
}

/*
 * =========================================================
 * LOAD DIRECTLY FROM INDEXEDDB (ASYNC)
 * =========================================================
 */

export async function loadFromDB(): Promise<ProfPlanData> {
    if (typeof window === 'undefined') return EMPTY_DATA;

    try {
        const [classes, courses, topics, slots, logs, holidays] = await Promise.all([
            db.classes.toArray(),
            db.courses.toArray(),
            db.topics.toArray(),
            db.slots.toArray(),
            db.logs.toArray(),
            db.holidays.toArray(),
        ]);

        return {
            classes: (classes as unknown as ClassItem[]) || [],
            courses: (courses as unknown as Course[]) || [],
            units: [], // units are embedded or loaded via topics/courses
            topics: (topics as unknown as Topic[]) || [],
            slots: (slots as unknown as Slot[]) || [],
            logs: (logs as unknown as Log[]) || [],
            holidays: (holidays as unknown as Holiday[]) || [],
        };
    } catch (err) {
        console.error('Failed to load data from IndexedDB:', err);
        return load(); // Fallback to localStorage
    }
}

/*
 * =========================================================
 * SAVE ACADEMIC DATA (DUAL-WRITE)
 * =========================================================
 */

export function save(data: ProfPlanData): void {
    if (typeof window === 'undefined') return;

    try {
        // 1. Immediate synchronous local storage write
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // 2. Dispatch change notification for active reactive hooks
        window.dispatchEvent(new Event('profplan-change'));

        // 3. Asynchronously persist to IndexedDB
        syncToIndexedDB(data);
    } catch (e) {
        console.error('Failed to save ProfPlan data to localStorage:', e);
    }
}

/*
 * =========================================================
 * LOAD EDUCATOR PROFILE
 * =========================================================
 */

export function loadProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;

    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            console.warn('Invalid ProfPlan profile data in localStorage.');
            return null;
        }

        return parsed as UserProfile;
    } catch (e) {
        console.error('Failed to load user profile:', e);
        return null;
    }
}

/*
 * =========================================================
 * SAVE EDUCATOR PROFILE
 * =========================================================
 */

export function saveProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        window.dispatchEvent(new Event('profplan-profile-change'));
    } catch (e) {
        console.error('Failed to save user profile:', e);
    }
}

/*
 * =========================================================
 * CURRENT ACADEMIC SESSION
 * =========================================================
 */

export function getCurrentAcademicSession(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (month >= 5) {
        return `${year}-${year + 1}`;
    }

    return `${year - 1}-${year}`;
}