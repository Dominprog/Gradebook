import client from './client'
import { Subject, GroupSubject } from '../types'

export const getSubjects = () =>
  client.get<Subject[]>('/subjects')

export const createSubject = (name: string) =>
  client.post<Subject>('/subjects', { name })

export const getMyGroupSubjects = () =>
  client.get<GroupSubject[]>('/group-subjects/my')

export const getAllGroupSubjects = () =>
  client.get<GroupSubject[]>('/group-subjects')

export const getGroupSubjectById = (id: number) =>
  client.get<GroupSubject>(`/group-subjects/${id}`)

export const createGroupSubject = (data: { groupId: number; subjectId: number; teacherId: number }) =>
  client.post<GroupSubject>('/group-subjects', data)
