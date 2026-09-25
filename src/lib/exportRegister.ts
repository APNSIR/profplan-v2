// src/lib/exportRegister.ts

import { load } from './store';
import { db } from './db';

// Extended type definitions to match dynamic runtime properties
interface ProgressLogRecord {
    id?: string;
    date?: string;
    courseId?: string;
    slotId?: string;
    actualStart?: string;
    actualEnd?: string;
    semester?: string;
    plannedTopicName?: string;
    covered?: string;
    status?: string;
    hours?: number | string;
    attendance?: number | string;
    classType?: string;
    remarks?: string;
    [key: string]: unknown;
}

interface TimetableSlotRecord {
    id?: string;
    period?: number | string;
    start?: string;
    end?: string;
    room?: string;
    courseId?: string;
    classId?: string;
    [key: string]: unknown;
}

interface AcademicCourseRecord {
    id?: string;
    name?: string;
    code?: string;
    semester?: string;
    classId?: string;
    [key: string]: unknown;
}

interface AcademicClassRecord {
    id?: string;
    name?: string;
    [key: string]: unknown;
}

/**
 * Cleanly escapes fields for standard CSV/Excel format.
 */
function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
}

/**
 * Generates an institutional Class Register CSV containing all daily teaching logs.
 */
export async function exportTeachingRegisterCSV(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const [logs, courses, classes, slots] = await Promise.all([
            db.logs.toArray(),
            db.courses.toArray(),
            db.classes.toArray(),
            db.slots.toArray(),
        ]);

        const currentLocal = load();
        const activeLogs: ProgressLogRecord[] = logs.length > 0 ? (logs as unknown as ProgressLogRecord[]) : (currentLocal.logs as unknown as ProgressLogRecord[]);
        const activeCourses: AcademicCourseRecord[] = courses.length > 0 ? (courses as unknown as AcademicCourseRecord[]) : (currentLocal.courses as unknown as AcademicCourseRecord[]);
        const activeClasses: AcademicClassRecord[] = classes.length > 0 ? (classes as unknown as AcademicClassRecord[]) : (currentLocal.classes as unknown as AcademicClassRecord[]);
        const activeSlots: TimetableSlotRecord[] = slots.length > 0 ? (slots as unknown as TimetableSlotRecord[]) : (currentLocal.slots as unknown as TimetableSlotRecord[]);

        if (!activeLogs || activeLogs.length === 0) {
            alert('No teaching progress logs found to export.');
            return;
        }

        // Sort chronologically by date and start time
        const sortedLogs = [...activeLogs].sort((a, b) => {
            const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
            if (dateCompare !== 0) return dateCompare;
            return String(a.actualStart || '00:00').localeCompare(String(b.actualStart || '00:00'));
        });

        // Departmental Headers
        const headers = [
            'Date',
            'Period / Time',
            'Class / Semester',
            'Subject / Course',
            'Course Code',
            'Planned Syllabus Topic',
            'Topic Actually Covered',
            'Status',
            'Hours',
            'Attendance',
            'Class Type',
            'Remarks / Deviations'
        ];

        const csvRows: string[] = [headers.map(escapeCSV).join(',')];

        for (const log of sortedLogs) {
            const course = activeCourses.find((c) => c.id === log.courseId);
            const slot = activeSlots.find((s) => s.id === log.slotId);
            const classObj = activeClasses.find((cls) => cls.id === course?.classId);

            const timeRange = log.actualStart && log.actualEnd
                ? `${log.actualStart} - ${log.actualEnd}`
                : (slot?.start && slot?.end ? `${slot.start} - ${slot.end}` : '--');

            const periodLabel = slot?.period ? `P${slot.period} (${timeRange})` : timeRange;

            const row = [
                log.date || '--',
                periodLabel,
                log.semester || classObj?.name || course?.semester || 'General',
                course?.name || 'Non-Instructional / General',
                course?.code || '--',
                log.plannedTopicName || '--',
                log.covered || '--',
                log.status || 'Taken',
                log.hours !== undefined ? String(log.hours) : '0.75',
                log.attendance !== undefined ? String(log.attendance) : '--',
                log.classType || (slot ? 'Regular Scheduled' : 'Extra Session'),
                log.remarks || ''
            ];

            csvRows.push(row.map(escapeCSV).join(','));
        }

        // Add UTF-8 BOM so Excel opens Odia/English characters without distortion
        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ProfPlan_Teaching_Register_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Failed to export CSV register:', err);
        alert('Failed to generate CSV progress register.');
    }
}