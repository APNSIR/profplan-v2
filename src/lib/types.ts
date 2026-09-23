// src/lib/types.ts

export type InstitutionType =
  | 'school'
  | 'college'
  | 'university'
  | 'other';

export type Course = {
  id: string;
  name: string;
  classId?: string;
  semester?: string;
  semesterClass?: string;
  code?: string;
  hours?: number;
  targetHours?: number;
  department?: string;
};

export type Unit = {
  id: string;
  courseId: string;
  title: string;
  name?: string;
  unitNumber?: number;
  order?: number;
  plannedStart?: string;
  plannedEnd?: string;
  plannedClasses?: number;
};

export type Topic = {
  id: string;
  courseId?: string;
  unitId: string;
  title: string;
  name?: string;
  order?: number;
  plannedClasses?: number;
  completedClasses?: number;
};

export type Slot = {
  id: string;
  day:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';

  courseId: string;
  classId?: string;

  start: string;
  end: string;

  room?: string;
};

export type Log = {
  id: string;
  date: string;
  courseId: string;
  classId?: string;
  unitId?: string;
  topicId?: string;

  start?: string;
  end?: string;

  hours?: number;
  remarks?: string;

  status?: 'completed' | 'partial' | 'cancelled';
};

export type Holiday = {
  id: string;
  date: string;
  name: string;
  description?: string;
};

export type ClassItem = {
  id: string;
  name: string;
  stream?: string;
};

export type ProfPlanData = {
  classes: ClassItem[];
  courses: Course[];
  units: Unit[];
  topics: Topic[];
  slots: Slot[];
  logs: Log[];
  holidays: Holiday[];
};

export type UserProfile = {
  name: string;
  designation: string;
  mobile: string;
  email: string;

  institutionType: InstitutionType | string;

  college: string;
  department: string;

  employeeId?: string;
  photo?: string;

  onboarded: boolean;
};