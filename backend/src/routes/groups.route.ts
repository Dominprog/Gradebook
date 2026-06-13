import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req: AuthRequest, res: Response) => {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } })
  res.json(groups)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    res.status(400).json({ error: 'Название группы обязательно' }); return
  }
  if (trimmed.length < 2) {
    res.status(400).json({ error: 'Название группы должно содержать не менее 2 символов' }); return
  }
  if (trimmed.length > 50) {
    res.status(400).json({ error: 'Название группы не должно превышать 50 символов' }); return
  }
  const existing = await prisma.group.findFirst({ where: { name: trimmed } })
  if (existing) {
    res.status(409).json({ error: 'Группа с таким названием уже существует' }); return
  }
  const group = await prisma.group.create({ data: { name: trimmed } })
  res.status(201).json(group)
})

router.get('/:id/students', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }
  const students = await prisma.user.findMany({
    where: { groupId: id, role: 'STUDENT' },
    orderBy: { name: 'asc' }
  })
  res.json(students.map((s: { id: number; name: string; email: string; isExpelled: boolean; isNew: boolean }) => ({
    id: s.id, name: s.name, email: s.email,
    isExpelled: s.isExpelled, isNew: s.isNew
  })))
})

export default router
