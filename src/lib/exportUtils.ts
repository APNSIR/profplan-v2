// src/lib/exportUtils.ts

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Log } from './types';
import { ProfPlanData, UserProfile } from './store';

export function exportLogsToExcel(logs: Log[], fileName = 'Daily_Progress_Report.xlsx') {
    const worksheetData = logs.map((log: any) => ({
        Date: log.date,
        Status: log.status,
        'Class Type': log.type || log.classType || 'Regular Lecture',
        'Covered Content': log.covered || log.plannedTopicName || '',
        'Hours Taken': log.hours,
        Attendance: log.attendance ?? 0,
        Remarks: log.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Logs');
    XLSX.writeFile(workbook, fileName);
}

export function exportComplianceReportToXLSX(
    data: ProfPlanData,
    profile?: UserProfile | null,
    fileName = 'Academic_Compliance_Report.xlsx'
) {
    const wb = XLSX.utils.book_new();

    const metaData = [
        { Field: 'Institution Name', Value: profile?.college || 'People’s College, Buguda' },
        { Field: 'Department', Value: profile?.department || '' },
        { Field: 'Faculty Name', Value: profile?.name || '' },
        { Field: 'Designation', Value: profile?.designation || '' },
        { Field: 'Generated Date', Value: new Date().toLocaleDateString() }
    ];
    const metaWS = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, metaWS, 'Overview');

    const logsData = (data.logs || []).map((log: any) => ({
        Date: log.date,
        Status: log.status,
        'Class Type': log.type || log.classType || 'Regular Lecture',
        'Covered Content': log.covered || log.plannedTopicName || '',
        'Hours Taken': log.hours,
        Attendance: log.attendance ?? 0,
        Remarks: log.remarks || '',
    }));
    const logsWS = XLSX.utils.json_to_sheet(logsData);
    XLSX.utils.book_append_sheet(wb, logsWS, 'Daily Logs');

    const classesWS = XLSX.utils.json_to_sheet(data.classes || []);
    XLSX.utils.book_append_sheet(wb, classesWS, 'Classes');

    const holidaysWS = XLSX.utils.json_to_sheet(data.holidays || []);
    XLSX.utils.book_append_sheet(wb, holidaysWS, 'Holidays');

    XLSX.writeFile(wb, fileName);
}

export function exportLogsToPDF(logs: Log[], title = 'Daily Progress Register') {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

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