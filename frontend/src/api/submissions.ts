import client from './client'
import { LabSubmission } from '../types'

export const getSubmissions = (labWorkId?: number) =>
  client.get<LabSubmission[]>('/submissions', { params: { labWorkId } })

export const createSubmission = (data: FormData) =>
  client.post<LabSubmission>('/submissions', data, { headers: { 'Content-Type': 'multipart/form-data' } })

export const reviewSubmission = (id: number, data: { grade?: number; comment?: string }) =>
  client.patch<LabSubmission>(`/submissions/${id}/review`, data)
