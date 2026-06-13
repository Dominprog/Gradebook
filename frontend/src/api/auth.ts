import client from './client'
import { User } from '../types'

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { email, password })

export const getMe = () =>
  client.get<User>('/auth/me')
