import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req: AuthRequest, res: Response) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
  res.json(subjects)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const trimmed = String(req.body.name || '').trim()
  if (!trimmed) {
    res.status(400).json({ error: 'Название предмета обязательно' }); return
  }
  if (trimmed.length < 2) {
    res.status(400).json({ error: 'Название предмета должно содержать не менее 2 символов' }); return
  }
  if (trimmed.length > 100) {
    res.status(400).json({ error: 'Название предмета не должно превышать 100 символов' }); return
  }
  const existing = await prisma.subject.findFirst({ where: { name: trimmed } })
  if (existing) {
    res.status(409).json({ error: 'Предмет с таким названием уже существует' }); return
  }
  const subject = await prisma.subject.create({ data: { name: trimmed } })
  res.status(201).json(subject)
})

export default router
