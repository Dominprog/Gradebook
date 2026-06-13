import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'
import upload from '../middleware/upload'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const gsId = req.query.groupSubjectId ? Number(req.query.groupSubjectId) : undefined
  const labs = await prisma.labWork.findMany({
    where: gsId ? { groupSubjectId: gsId } : {},
    include: {
      groupSubject: {
        include: { subject: true, group: true, teacher: { select: { id: true, name: true } } }
      },
      teams: {
        include: { members: { include: { student: { select: { id: true, name: true } } } } }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  res.json(labs)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const lab = await prisma.labWork.findUnique({
    where: { id },
    include: {
      groupSubject: {
        include: { subject: true, group: true, teacher: { select: { id: true, name: true } } }
      },
      teams: {
        include: { members: { include: { student: { select: { id: true, name: true } } } } }
      }
    }
  })
  if (!lab) { res.status(404).json({ error: 'Not found' }); return }
  res.json(lab)
})

router.post('/', requireTeacher, upload.single('materials'), async (req: AuthRequest, res: Response) => {
  const { groupSubjectId, title, description, dueDate, isTeam } = req.body
  if (!groupSubjectId || !title) {
    res.status(400).json({ error: 'groupSubjectId и название обязательны' })
    return
  }
  const lab = await prisma.labWork.create({
    data: {
      groupSubjectId: Number(groupSubjectId),
      title: String(title),
      description: description ? String(description) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      isTeam: isTeam === 'true' || isTeam === true || isTeam === '1',
      materialsUrl: req.file ? `/uploads/${req.file.filename}` : null
    }
  })
  res.status(201).json(lab)
})

router.patch('/:id', requireTeacher, upload.single('materials'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { title, description, dueDate, isTeam } = req.body
  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = String(title)
  if (description !== undefined) data.description = description ? String(description) : null
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (isTeam !== undefined) data.isTeam = isTeam === 'true' || isTeam === true || isTeam === '1'
  if (req.file) data.materialsUrl = `/uploads/${req.file.filename}`
  const lab = await prisma.labWork.update({ where: { id }, data })
  res.json(lab)
})

router.post('/:id/teams', requireTeacher, async (req: AuthRequest, res: Response) => {
  const labWorkId = Number(req.params.id)
  const { studentIds } = req.body
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ error: 'studentIds обязателен' })
    return
  }
  const team = await prisma.labTeam.create({
    data: {
      labWorkId,
      members: { create: (studentIds as number[]).map(sid => ({ studentId: Number(sid) })) }
    },
    include: { members: { include: { student: { select: { id: true, name: true } } } } }
  })
  res.status(201).json(team)
})

export default router
