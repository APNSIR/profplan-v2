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
 * PROFPLAN LOCAL STORAGE
 * =========================================================
 *
 * ProfPlan is a local-first application.
 *
 * Academic data is created by the educator through onboarding
 * and the application itself. There are NO demo/default
 * classes, subjects, units, topics or timetable entries.
 *
 * This is important because an educator's workspace must never
 * contain artificial "ghost" academic groups.
 */

const STORAGE_KEY = 'profplan_v2_data';
const PROFILE_KEY = 'profplan_v2_profile';

/*
 * =========================================================
 * EMPTY INITIAL WORKSPACE
 * =========================================================
 *
 * A brand-new ProfPlan installation starts with zero academic
 * records. The educator creates the actual classes/semesters
 * they teach during onboarding.
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
 * LOAD ACADEMIC DATA
 * =========================================================
 */

export function load(): ProfPlanData {
    /*
     * During Next.js server rendering there is no browser
     * localStorage. Return an empty workspace.
     */
    if (typeof window === 'undefined') {
        return EMPTY_DATA;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        /*
         * First launch / cleared storage.
         *
         * Save an empty workspace rather than inserting demo
         * classes or sample syllabus data.
         */
        if (!raw) {
            save(EMPTY_DATA);
            return EMPTY_DATA;
        }

        const parsed: unknown = JSON.parse(raw);

        /*
         * Protect the application from malformed or unexpected
         * localStorage data.
         */
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

        /*
         * Every collection is independently validated.
         *
         * We intentionally fall back to [] rather than to
         * default/demo records.
         */
        return {
            classes: Array.isArray(data.classes)
                ? data.classes
                : [],

            courses: Array.isArray(data.courses)
                ? data.courses
                : [],

            units: Array.isArray(data.units)
                ? data.units
                : [],

            topics: Array.isArray(data.topics)
                ? data.topics
                : [],

            slots: Array.isArray(data.slots)
                ? data.slots
                : [],

            logs: Array.isArray(data.logs)
                ? data.logs
                : [],

            holidays: Array.isArray(data.holidays)
                ? data.holidays
                : [],
        };
    } catch (e) {
        console.error(
            'Failed to load ProfPlan data from localStorage:',
            e
        );

        /*
         * If storage is corrupted or unreadable, start clean.
         * Never recreate demo academic data.
         */
        return EMPTY_DATA;
    }
}

/*
 * =========================================================
 * SAVE ACADEMIC DATA
 * =========================================================
 */

export function save(data: ProfPlanData): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );

        /*
         * Notify open ProfPlan views that academic data changed.
         */
        window.dispatchEvent(
            new Event('profplan-change')
        );
    } catch (e) {
        console.error(
            'Failed to save ProfPlan data to localStorage:',
            e
        );
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

        if (!raw) {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            console.warn(
                'Invalid ProfPlan profile data in localStorage.'
            );

            return null;
        }

        return parsed as UserProfile;
    } catch (e) {
        console.error(
            'Failed to load user profile:',
            e
        );

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
        localStorage.setItem(
            PROFILE_KEY,
            JSON.stringify(profile)
        );

        /*
         * Notify open ProfPlan views that the educator profile
         * has changed.
         */
        window.dispatchEvent(
            new Event('profplan-profile-change')
        );
    } catch (e) {
        console.error(
            'Failed to save user profile:',
            e
        );
    }
}

/*
 * =========================================================
 * CURRENT ACADEMIC SESSION
 * =========================================================
 *
 * Academic session is considered to begin in June.
 *
 * June 2026 → 2026-2027
 * May 2027  → 2026-2027
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