// src/lib/exportUtils.ts

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
 * Transforms raw logs into inspection-grade rows by joining Course, Slot, and Class data,
 * complete with precise period timings and room numbers.
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

      const timeRange = slot?.start && slot?.end
        ? `${slot.start} - ${slot.end}`
        : log.actualStart && log.actualEnd
        ? `${log.actualStart} - ${log.actualEnd}`
        : '—';

      // Fixed: Explicitly checks log.room first, then fallback to slot.room
      const roomLocation = log.room || slot?.room || '—';

      const className = classObj
        ? `${classObj.name}${classObj.stream ? ` (${classObj.stream})` : ''}`
        : log.semester || 'All Classes';

      return {
        'Date': log.date || '',
        'Day': getDayName(log.date),
        'Period': periodNumber,
        'Timing': timeRange,
        'Room': roomLocation,
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
 * Standard column width configuration for inspection-ready spreadsheets (including Room & Timing).
 */
const standardColumnWidths = [
  { wch: 12 }, // Date
  { wch: 12 }, // Day
  { wch: 14 }, // Period
  { wch: 16 }, // Timing
  { wch: 14 }, // Room
  { wch: 22 }, // Class / Semester
  { wch: 26 }, // Subject / Paper
  { wch: 14 }, // Paper Code
  { wch: 28 }, // Planned Topic
  { wch: 30 }, // Topic Actually Covered
  { wch: 12 }, // Status
  { wch: 12 }, // Hours Taken
  { wch: 12 }, // Attendance
  { wch: 24 }, // Remarks
];

/**
 * Export daily teaching records directly to Excel with Room and Timings.
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
    { Field: 'Institution Name', Value: profile?.college || "People's College, Buguda" },
    { Field: 'Department', Value: profile?.department || 'English' },
    { Field: 'Faculty Name', Value: profile?.name || 'Atmaprakash Nayak' },
    { Field: 'Designation', Value: profile?.designation || 'Head of Department & Lecturer in English' },
    { Field: 'Generated Date', Value: new Date().toLocaleDateString('en-IN') },
    { Field: 'Total Logged Hours', Value: (data.logs || []).reduce((acc: number, curr: any) => acc + (Number(curr.hours) || 0), 0).toFixed(2) },
    { Field: 'Total Classes Delivered', Value: (data.logs || []).filter((l: any) => l.status === 'Taken' || l.status === 'Compensated' || l.status === 'completed' || l.status === 'partial').length }
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
 * Export official inspection-ready PDF document of the daily register
 * complete with institution header, teacher metadata, room numbers, timings, and 4-tier signature blocks.
 */
export function exportLogsToPDF(
  logs: Log[],
  title = 'Daily Progress Register',
  profile?: UserProfile | null,
  data?: ProfPlanData,
  fileName = 'ProfPlan_Official_Register.pdf'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Official Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('APNSIR FOUNDATION — ACADEMIC PROGRESS REGISTER', pageWidth / 2, 8.5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Inspection-Ready Official Compliance & Verification Document', pageWidth / 2, 15.5, { align: 'center' });

  // 2. Document Title & Teacher Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 14, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const teacherName = profile?.name || 'Atmaprakash Nayak';
  const designation = profile?.designation || 'Head of Department & Lecturer in English';
  const collegeName = profile?.college || "People's College, Buguda";
  const deptName = profile?.department || 'English';

  doc.text(`Teacher Name: ${teacherName} (${designation})`, 14, 36);
  doc.text(`Institution: ${collegeName} | Department: ${deptName}`, 14, 42);
  doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | Total Logged Periods: ${logs.length}`, 14, 48);

  // 3. Table Data Mapping integrating Period, Timing & Room
  const enrichedRows = buildEnrichedLogRows(logs, data);
  const tableHeaders = [['Sl.', 'Date', 'Period & Timing', 'Room', 'Class / Semester', 'Actually Covered', 'Status', 'Hours']];
  const tableData = enrichedRows.map((r: any, index: number) => [
    index + 1,
    r['Date'],
    `${r['Period']}\n(${r['Timing']})`,
    r['Room'],
    r['Class / Semester'],
    r['Topic Actually Covered'] || r['Planned Topic'],
    r['Status'],
    Number(r['Hours Taken'] || 0).toFixed(2)
  ]);

  autoTable(doc, {
    startY: 54,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [30, 58, 138], // Deep Blue 900
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: { 
      fontSize: 7.5, 
      textColor: [15, 23, 42] 
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 16 },
      4: { cellWidth: 34 },
      5: { cellWidth: 44 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 14 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: (hookData: any) => {
      // Footer Page Numbers
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${hookData.pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  });

  // 4. Official Sign-Off & Verification Block (4 Signatures)
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 25;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL VERIFICATION & SIGN-OFF', 14, finalY);

  finalY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const colWidth = (pageWidth - 28) / 4;
  
  const signatures = [
    { title: "Teacher's Signature", subtitle: teacherName },
    { title: "HOD Signature", subtitle: "Head of Department" },
    { title: "Academic Bursar", subtitle: "Bursar / Coordinator" },
    { title: "Principal Signature", subtitle: "Principal / Head of Institution" }
  ];

  signatures.forEach((sig, idx) => {
    const startX = 14 + (idx * colWidth);
    const centerX = startX + (colWidth / 2);
    
    doc.setLineWidth(0.4);
    doc.setDrawColor(120, 120, 120);
    doc.line(startX + 4, finalY + 14, startX + colWidth - 4, finalY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(sig.title, centerX, finalY + 19, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(sig.subtitle, centerX, finalY + 23.5, { align: 'center' });
  });

  doc.save(fileName);
}