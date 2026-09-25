import { db, ClassEntity, CourseEntity, TopicEntity, SlotEntity, LogEntity, HolidayEntity } from './db';
import { load } from './store';

export async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;

  const migratedFlag = localStorage.getItem('profplan_indexeddb_migrated');
  if (migratedFlag === 'true') return;

  try {
    const localData = load();
    if (localData) {
      if (Array.isArray(localData.classes) && localData.classes.length > 0) {
        const sanitizedClasses: ClassEntity[] = localData.classes.map((c: any) => ({
          ...c,
          id: String(c.id),
          name: String(c.name || 'Unnamed Class'),
          stream: c.stream || 'General'
        }));
        await db.classes.bulkPut(sanitizedClasses);
      }

      if (Array.isArray(localData.courses) && localData.courses.length > 0) {
        const sanitizedCourses: CourseEntity[] = localData.courses.map((co: any) => ({
          ...co,
          id: String(co.id),
          name: String(co.name || 'Subject'),
          code: co.code || ''
        }));
        await db.courses.bulkPut(sanitizedCourses);
      }

      if (Array.isArray(localData.topics) && localData.topics.length > 0) {
        const sanitizedTopics: TopicEntity[] = localData.topics.map((t: any) => ({
          ...t,
          id: String(t.id),
          courseId: String(t.courseId || '')
        }));
        await db.topics.bulkPut(sanitizedTopics);
      }

      if (Array.isArray(localData.slots) && localData.slots.length > 0) {
        const sanitizedSlots: SlotEntity[] = localData.slots.map((s: any, idx: number) => ({
          ...s,
          id: String(s.id),
          day: s.day ?? 'Monday',
          period: Number(s.period) || idx + 1,
          start: s.start || '09:00',
          end: s.end || '09:45',
          courseId: String(s.courseId || '')
        }));
        await db.slots.bulkPut(sanitizedSlots);
      }

      if (Array.isArray(localData.logs) && localData.logs.length > 0) {
        const sanitizedLogs: LogEntity[] = localData.logs.map((l: any) => ({
          ...l,
          id: String(l.id),
          date: l.date || new Date().toISOString().slice(0, 10),
          courseId: String(l.courseId || ''),
          status: l.status === 'completed' ? 'Taken' : (l.status || 'Taken')
        }));
        await db.logs.bulkPut(sanitizedLogs);
      }

      if (Array.isArray(localData.holidays) && localData.holidays.length > 0) {
        const sanitizedHolidays: HolidayEntity[] = localData.holidays.map((h: any) => ({
          ...h,
          id: String(h.id),
          date: String(h.date || ''),
          name: String(h.name || 'Holiday')
        }));
        await db.holidays.bulkPut(sanitizedHolidays);
      }
    }

    localStorage.setItem('profplan_indexeddb_migrated', 'true');
    console.log('ProfPlan: Data successfully migrated to IndexedDB.');
  } catch (err) {
    console.error('ProfPlan: Migration to IndexedDB failed:', err);
  }
}