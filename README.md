# ProfPlan v2
A mobile-first academic lesson-plan and progress-register starter for People’s College Buguda.

## Run
1. Install Node.js LTS.
2. Extract the project.
3. Open a terminal in this folder.
4. Run `npm install`.
5. Copy `.env.example` to `.env.local`.
6. Add Supabase URL/key if you want cloud persistence.
7. Run `npm run dev`.
8. Open http://localhost:3000.

## Current working modules
- Today dashboard with timetable-driven classes and 1-click completion.
- Daily progress log with status, class type, topic, hours, attendance and remarks.
- Syllabus tracker with planned-vs-actual hours.
- Compliance report with CSV export and browser PDF printing.
- LocalStorage persistence for low-connectivity/offline use.
- Supabase PostgreSQL migration with teacher-level RLS policies.

## Next production work
Connect the UI forms to Supabase, add authentication/role dashboards, institutional master setup, holiday-aware working-day calculations, conflict detection, true XLSX/PDF generation, sync queue conflict resolution, and Principal/HOD inspection workflows.
