import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, requireStudent, AuthRequest } from '../middleware/auth'
import upload from '../middleware/upload'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const labWorkId = req.query.labWorkId ? Number(req.query.labWorkId) : undefined
  const studentId = req.userRole === 'STUDENT' ? req.userId : undefined

  const submissions = await prisma.labSubmission.findMany({
    where: {
      ...(labWorkId ? { labWorkId } : {}),
      ...(studentId ? { studentId } : {})
    },
    include: {
      student: { select: { id: true, name: true } },
      labWork: { include: { groupSubject: { include: { subject: true } } } }
    },
    orderBy: { submittedAt: 'desc' }
  })
  res.json(submissions)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const submission = await prisma.labSubmission.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true } }, labWork: true }
  })
  if (!submission) { res.status(404).json({ error: 'Not found' }); return }
  if (req.userRole === 'STUDENT' && submission.studentId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  res.json(submission)
})

router.post('/', requireStudent, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { labWorkId } = req.body
  if (!labWorkId) { res.status(400).json({ error: 'labWorkId обязателен' }); return }

  const submission = await prisma.labSubmission.upsert({
    where: { labWorkId_studentId: { labWorkId: Number(labWorkId), studentId: req.userId! } },
    update: {
      ...(req.file ? { fileUrl: `/uploads/${req.file.filename}` } : {}),
      submittedAt: new Date()
    },
    create: {
      labWorkId: Number(labWorkId),
      studentId: req.userId!,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    },
    include: { student: { select: { id: true, name: true } } }
  })
  res.json(submission)
})

router.patch('/:id/review', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { grade, comment } = req.body
  const data: Record<string, unknown> = { reviewedAt: new Date() }
  if (grade !== undefined) data.grade = Number(grade)
  if (comment !== undefined) data.comment = comment
  const submission = await prisma.labSubmission.update({
    where: { id },
    data,
    include: { student: { select: { id: true, name: true } } }
  })
  res.json(submission)
})

export default router
