import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string }
    req.userId = payload.id
    req.userRole = payload.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'TEACHER') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

export function requireStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'STUDENT') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
