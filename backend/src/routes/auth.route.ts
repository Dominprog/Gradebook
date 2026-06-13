import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/db'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email и пароль обязательны' }); return
  }
  if (!EMAIL_RE.test(String(email))) {
    res.status(400).json({ error: 'Некорректный формат email' }); return
  }
  if (String(password).length < 1) {
    res.status(400).json({ error: 'Введите пароль' }); return
  }

  const user = await prisma.user.findUnique({ where: { email: String(email) }, include: { group: true } })
  if (!user) {
    res.status(401).json({ error: 'Неверный email или пароль' }); return
  }
  const valid = await bcrypt.compare(String(password), user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Неверный email или пароль' }); return
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, groupId: user.groupId, group: user.group }
  })
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { group: true } })
  if (!user) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, groupId: user.groupId, group: user.group })
})

export default router
