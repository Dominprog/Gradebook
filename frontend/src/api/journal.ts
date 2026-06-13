import client from './client'
import { JournalEntry, Lesson, User } from '../types'

export interface JournalResponse {
  lessons: Lesson[]
  students: User[]
  entries: JournalEntry[]
  groupId: number | null
  groupName?: string
}

export const getGroupSubjectJournal = (gsId: number) =>
  client.get<JournalResponse>(`/journal/group-subject/${gsId}`)

export const getStudentJournal = (gsId?: number) =>
  client.get<JournalEntry[]>('/journal/student', { params: { groupSubjectId: gsId } })

export const upsertEntry = (data: {
  lessonId: number
  studentId: number
  grade?: number | null
  status?: string
}) => client.post<JournalEntry>('/journal', data)
