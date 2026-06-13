export type Role = 'STUDENT' | 'TEACHER'
export type LessonType = 'LECTURE' | 'LAB' | 'PRACTICE' | 'TEST'
export type AttendStatus = 'PRESENT' | 'ABSENT' | 'LATE'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  groupId: number | null
  group?: Group | null
  isExpelled?: boolean
  isNew?: boolean
}

export interface Group {
  id: number
  name: string
}

export interface Subject {
  id: number
  name: string
}

export interface GroupSubject {
  id: number
  groupId: number
  subjectId: number
  teacherId: number
  group?: Group
  subject?: Subject
  teacher?: Pick<User, 'id' | 'name'>
}

export interface ScheduleSlot {
  id: number
  groupSubjectId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string
  groupSubject?: GroupSubject
}

export interface Lesson {
  id: number
  scheduleSlotId: number
  date: string
  topic: string | null
  type: LessonType
  scheduleSlot?: ScheduleSlot
}

export interface JournalEntry {
  id: number
  lessonId: number
  studentId: number
  teacherId: number
  grade: number | null
  status: AttendStatus
  student?: Pick<User, 'id' | 'name' | 'isExpelled' | 'isNew'>
  lesson?: Lesson
}

export interface LabWork {
  id: number
  groupSubjectId: number
  title: string
  description: string | null
  dueDate: string | null
  isTeam: boolean
  materialsUrl: string | null
  createdAt: string
  groupSubject?: GroupSubject
  teams?: LabTeam[]
}

export interface LabTeam {
  id: number
  labWorkId: number
  members: LabTeamMember[]
}

export interface LabTeamMember {
  id: number
  teamId: number
  studentId: number
  student?: Pick<User, 'id' | 'name'>
}

export interface LabSubmission {
  id: number
  labWorkId: number
  studentId: number
  fileUrl: string | null
  submittedAt: string
  grade: number | null
  comment: string | null
  reviewedAt: string | null
  student?: Pick<User, 'id' | 'name'>
  labWork?: LabWork
}
