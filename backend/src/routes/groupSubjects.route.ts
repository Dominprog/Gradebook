import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/my', async (req: AuthRequest, res: Response) => {
  if (req.userRole === 'STUDENT') {
    const student = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!student?.groupId) { res.json([]); return }
    const list = await prisma.groupSubject.findMany({
      where: { groupId: student.groupId },
      include: { subject: true, teacher: { select: { id: true, name: true } } }
    })
    res.json(list); return
  }
  const list = await prisma.groupSubject.findMany({
    where: { teacherId: req.userId },
    include: { group: true, subject: true }
  })
  res.json(list)
})

router.get('/', async (req: AuthRequest, res: Response) => {
  const where = req.userRole === 'TEACHER' ? { teacherId: req.userId } : {}
  const list = await prisma.groupSubject.findMany({
    where,
    include: { group: true, subject: true, teacher: { select: { id: true, name: true } } }
  })
  res.json(list)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }
  const gs = await prisma.groupSubject.findUnique({
    where: { id },
    include: { group: true, subject: true, teacher: { select: { id: true, name: true } } }
  })
  if (!gs) { res.status(404).json({ error: 'Not found' }); return }
  res.json(gs)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { groupId, subjectId, teacherId } = req.body
  if (!groupId || !subjectId || !teacherId) {
    res.status(400).json({ error: 'Заполните все поля: группа, предмет, преподаватель' }); return
  }
  const gId = Number(groupId), sId = Number(subjectId), tId = Number(teacherId)
  if (isNaN(gId) || isNaN(sId) || isNaN(tId)) {
    res.status(400).json({ error: 'Неверные ID' }); return
  }
  const existing = await prisma.groupSubject.findFirst({ where: { groupId: gId, subjectId: sId } })
  if (existing) {
    res.status(409).json({ error: 'Этот предмет уже назначен данной группе' }); return
  }
  const gs = await prisma.groupSubject.create({
    data: { groupId: gId, subjectId: sId, teacherId: tId },
    include: { group: true, subject: true }
  })
  res.status(201).json(gs)
})

export default router
