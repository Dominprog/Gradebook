import client from './client'
import { LabWork } from '../types'

export const getLabs = (gsId?: number) =>
  client.get<LabWork[]>('/labs', { params: { groupSubjectId: gsId } })

export const getLab = (id: number) =>
  client.get<LabWork>(`/labs/${id}`)

export const createLab = (data: FormData) =>
  client.post<LabWork>('/labs', data, { headers: { 'Content-Type': 'multipart/form-data' } })

export const updateLab = (id: number, data: FormData) =>
  client.patch<LabWork>(`/labs/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })

export const createTeam = (labId: number, studentIds: number[]) =>
  client.post(`/labs/${labId}/teams`, { studentIds })
