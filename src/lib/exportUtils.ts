// src/lib/exportUtils.ts

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Log } from './types';
import { ProfPlanData, UserProfile } from './store';

/**
 * Resolves a human-readable day name from a date string (YYYY-MM-DD).
 */
function getDayName(dateStr: string): string {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  return isNaN(dateObj.getTime())
    ? ''
    : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Transforms raw logs into inspection-grade rows by joining Course, Slot, and Class data.
 */
function buildEnrichedLogRows(logs: Log[], data?: ProfPlanData) {
  const courseMap = new Map((data?.courses || []).map((c: any) => [c.id, c]));
  const classMap = new Map((data?.classes || []).map((cls: any) => [cls.id, cls]));
  const slotMap = new Map((data?.slots || []).map((s: any) => [s.id, s]));

  return [...logs]
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((log: any) => {
      const course: any = courseMap.get(log.courseId);
      const slot: any = log.slotId ? slotMap.get(log.slotId) : null;
      const classObj: any = course?.classId ? classMap.get(course.classId) : null;

      const periodNumber = slot?.period
        ? `Period ${slot.period}`
        : log.classSource === 'Extra / Unscheduled Class'
        ? 'Extra Class'
        : 'Special';

      const className = classObj
        ? `${classObj.name}${classObj.stream ? ` (${classObj.stream})` : ''}`
        : log.semester || 'All Classes';

      return {
        'Date': log.date || '',
        'Day': getDayName(log.date),
        'Period': periodNumber,
        'Class / Semester': className,
        'Subject / Paper': course?.name || 'General Lecture',
        'Paper Code': course?.code || '—',
        'Planned Topic': log.plannedTopicName || 'General Curriculum',
        'Topic Actually Covered': log.covered || log.plannedTopicName || '',
        'Status': log.status || 'Taken',
        'Hours Taken': Number(log.hours || 0.75),
        'Attendance': log.attendance !== undefined && log.attendance !== null ? log.attendance : '—',
        'Remarks': log.remarks || '',
      };
    });
}

/**
 * Standard column width configuration for inspection-ready spreadsheets.
 */
const standardColumnWidths = [
  { wch: 12 }, // Date
  { wch: 12 }, // Day
  { wch: 12 }, // Period
  { wch: 22 }, // Class / Semester
  { wch: 26 }, // Subject / Paper
  { wch: 14 }, // Paper Code
  { wch: 30 }, // Planned Topic
  { wch: 34 }, // Topic Actually Covered
  { wch: 12 }, // Status
  { wch: 14 }, // Hours Taken
  { wch: 14 }, // Attendance
  { wch: 28 }, // Remarks
];

/**
 * Export daily teaching records directly to Excel.
 */
export function exportLogsToExcel(
  logs: Log[],
  data?: ProfPlanData,
  fileName = 'Daily_Progress_Report.xlsx'
) {
  const worksheetData = buildEnrichedLogRows(logs, data);

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  worksheet['!cols'] = standardColumnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Logs');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export full institutional compliance workbook containing Overview, Daily Logs, Classes, and Holidays.
 */
export function exportComplianceReportToXLSX(
  data: ProfPlanData,
  profile?: UserProfile | null,
  fileName = 'Academic_Compliance_Report.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // 1. Overview Metadata Sheet
  const metaData = [
    { Field: 'Institution Name', Value: profile?.college || 'College / University Department' },
    { Field: 'Department', Value: profile?.department || '' },
    { Field: 'Faculty Name', Value: profile?.name || '' },
    { Field: 'Designation', Value: profile?.designation || '' },
    { Field: 'Generated Date', Value: new Date().toLocaleDateString('en-IN') },
    { Field: 'Total Logged Hours', Value: (data.logs || []).reduce((acc: number, curr: any) => acc + (Number(curr.hours) || 0), 0).toFixed(2) },
    { Field: 'Total Classes Delivered', Value: (data.logs || []).filter((l: any) => l.status === 'Taken' || l.status === 'Compensated').length }
  ];
  const metaWS = XLSX.utils.json_to_sheet(metaData);
  metaWS['!cols'] = [{ wch: 24 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, metaWS, 'Overview');

  // 2. Enriched Daily Register Sheet
  const logsData = buildEnrichedLogRows(data.logs || [], data);
  const logsWS = XLSX.utils.json_to_sheet(logsData);
  logsWS['!cols'] = standardColumnWidths;
  XLSX.utils.book_append_sheet(wb, logsWS, 'Daily Teaching Register');

  // 3. Classes Sheet
  const classesWS = XLSX.utils.json_to_sheet(data.classes || []);
  classesWS['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, classesWS, 'Classes');

  // 4. Holidays Sheet
  const holidaysWS = XLSX.utils.json_to_sheet(data.holidays || []);
  holidaysWS['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, holidaysWS, 'Holidays');

  XLSX.writeFile(wb, fileName);
}

/**
 * Export printable PDF summary of the daily register.
 */
export function exportLogsToPDF(logs: Log[], title = 'Daily Progress Register') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

  let yPosition = 38;
  logs.forEach((logItem: any, index: number) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    const logType = logItem.type || logItem.classType || 'Regular Lecture';
    const row = `${index + 1}. [${logItem.date}] Status: ${logItem.status} | Type: ${logType} | Hours: ${logItem.hours}`;
    doc.text(row, 14, yPosition);
    yPosition += 6;

    const coveredText = logItem.covered || logItem.plannedTopicName;
    if (coveredText) {
      doc.setTextColor(100);
      doc.text(`   Covered: ${coveredText} (Att: ${logItem.attendance ?? 'N/A'})`, 14, yPosition);
      doc.setTextColor(0);
      yPosition += 8;
    }
  });

  doc.save('Daily_Progress_Register.pdf');
}