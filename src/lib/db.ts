import Dexie, { Table } from 'dexie';

export interface ClassEntity {
  id: string;
  name: string;
  stream?: string;
  [key: string]: any;
}

export interface CourseEntity {
  id: string;
  name: string;
  code?: string;
  semester?: string;
  classId?: string;
  [key: string]: any;
}

export interface TopicEntity {
  id: string;
  courseId?: string;
  unitNumber?: number | string;
  unit?: number | string;
  name?: string;
  title?: string;
  plannedDate?: string;
  [key: string]: any;
}

export interface SlotEntity {
  id: string;
  day: string | number;
  period?: number;
  start: string;
  end: string;
  courseId: string;
  classId?: string;
  room?: string;
  semesterClass?: string;
  [key: string]: any;
}

export interface LogEntity {
  id: string;
  date: string;
  slotId?: string;
  courseId: string;
  topicId?: string;
  plannedTopicName?: string;
  covered?: string;
  status?: string;
  classSource?: string;
  classType?: string;
  hours?: number;
  attendance?: number;
  room?: string;
  semester?: string;
  remarks?: string;
  [key: string]: any;
}

export interface HolidayEntity {
  id: string;
  date: string;
  name: string;
  type?: string;
  description?: string;
  [key: string]: any;
}

export class ProfPlanDatabase extends Dexie {
  classes!: Table<ClassEntity, string>;
  courses!: Table<CourseEntity, string>;
  topics!: Table<TopicEntity, string>;
  slots!: Table<SlotEntity, string>;
  logs!: Table<LogEntity, string>;
  holidays!: Table<HolidayEntity, string>;

  constructor() {
    super('ProfPlanDB');
    this.version(1).stores({
      classes: 'id, name, stream',
      courses: 'id, name, code, classId',
      topics: 'id, courseId',
      slots: 'id, day, period, courseId',
      logs: 'id, date, slotId, courseId, status',
      holidays: 'id, date'
    });
  }
}

export const db = new ProfPlanDatabase();