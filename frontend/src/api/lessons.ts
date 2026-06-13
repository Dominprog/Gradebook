import client from './client'
import { Lesson } from '../types'

export const createLesson = (data: {
  scheduleSlotId: number
  date: string
  topic?: string
  type: string
}) => client.post<Lesson>('/lessons', data)
