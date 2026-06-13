import client from './client'
import { ScheduleSlot } from '../types'

export const getSchedule = () =>
  client.get<ScheduleSlot[]>('/schedule')

export const getSlotsByGroupSubject = (gsId: number) =>
  client.get<ScheduleSlot[]>(`/schedule/group-subject/${gsId}`)

export const createSlot = (data: {
  groupSubjectId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string
}) => client.post<ScheduleSlot>('/schedule', data)

export const updateSlot = (id: number, data: {
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string
}) => client.put<ScheduleSlot>(`/schedule/${id}`, data)

export const deleteSlot = (id: number) =>
  client.delete(`/schedule/${id}`)
