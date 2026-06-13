import client from './client'
import { User, Group } from '../types'

export const getUsers = () =>
  client.get<User[]>('/users')

export const createUser = (data: {
  name: string; email: string; password: string; role: string; groupId?: number
}) => client.post<User>('/users', data)

export const updateUser = (id: number, data: {
  isExpelled?: boolean
  isNew?: boolean
  name?: string
  email?: string
}) => client.patch<User>(`/users/${id}`, data)

export const deleteUser = (id: number) =>
  client.delete(`/users/${id}`)

export const getGroups = () =>
  client.get<Group[]>('/groups')

export const createGroup = (name: string) =>
  client.post<Group>('/groups', { name })

export const getGroupStudents = (groupId: number) =>
  client.get<User[]>(`/groups/${groupId}/students`)
