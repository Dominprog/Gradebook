import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/group-subject/:gsId', async (req: AuthRequest, res: Response) => {
  const gsId = Number(req.params.gsId)
  if (isNaN(gsId)) { res.status(400).json({ error: 'Неверный ID' }); return }

  const gs = await prisma.groupSubject.findUnique({
    where: { id: gsId },
    include: {
      group: { include: { students: { where: { role: 'STUDENT' }, orderBy: { name: 'asc' } } } }
    }
  })

  if (!gs) { res.status(404).json({ error: 'Not found' }); return }

  const lessons = await prisma.lesson.findMany({
    where: { scheduleSlot: { groupSubjectId: gsId } },
    include: {
      scheduleSlot: {
        include: { groupSubject: { include: { subject: true, group: true } } }
      }
    },
    orderBy: { date: 'asc' }
  })

  const students = gs.group.students

  const entries = lessons.length > 0
    ? await prisma.journalEntry.findMany({
        where: { lessonId: { in: lessons.map((l: { id: number }) => l.id) } }
      })
    : []

  res.json({ lessons, students, entries, groupId: gs.group.id, groupName: gs.group.name })
})

router.get('/student', async (req: AuthRequest, res: Response) => {
  const studentId = req.userRole === 'STUDENT' ? req.userId! : Number(req.query.studentId)
  const gsId = req.query.groupSubjectId ? Number(req.query.groupSubjectId) : undefined

  const entries = await prisma.journalEntry.findMany({
    where: gsId
      ? { studentId, lesson: { scheduleSlot: { groupSubjectId: gsId } } }
      : { studentId },
    include: {
      lesson: {
        include: {
          scheduleSlot: {
            include: { groupSubject: { include: { subject: true } } }
          }
        }
      }
    },
    orderBy: { lesson: { date: 'asc' } }
  })
  res.json(entries)
})

router.get('/lesson/:lessonId', async (req: AuthRequest, res: Response) => {
  const lessonId = Number(req.params.lessonId)
  if (isNaN(lessonId)) { res.status(400).json({ error: 'Неверный ID' }); return }
  const entries = await prisma.journalEntry.findMany({
    where: { lessonId },
    include: { student: { select: { id: true, name: true, isExpelled: true, isNew: true } } }
  })
  res.json(entries)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { lessonId, studentId, grade, status } = req.body
  if (!lessonId || !studentId) {
    res.status(400).json({ error: 'lessonId и studentId обязательны' }); return
  }

  const lessonExists = await prisma.lesson.findUnique({ where: { id: Number(lessonId) } })
  if (!lessonExists) { res.status(404).json({ error: 'Занятие не найдено' }); return }

  if (grade !== undefined && grade !== null) {
    const gradeNum = Number(grade)
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 10) {
      res.status(400).json({ error: 'Оценка должна быть целым числом от 1 до 10' }); return
    }
  }

  const validStatuses = ['PRESENT', 'ABSENT', 'LATE']
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Статус должен быть PRESENT, ABSENT или LATE' }); return
  }

  const updateData: { grade?: number | null; status?: string } = {}
  if (grade !== undefined) updateData.grade = grade !== null ? Number(grade) : null
  if (status !== undefined) updateData.status = status

  const entry = await prisma.journalEntry.upsert({
    where: { lessonId_studentId: { lessonId: Number(lessonId), studentId: Number(studentId) } },
    update: updateData,
    create: {
      lessonId: Number(lessonId),
      studentId: Number(studentId),
      teacherId: req.userId!,
      grade: grade !== undefined && grade !== null ? Number(grade) : null,
      status: status || 'PRESENT'
    },
    include: { student: { select: { id: true, name: true } } }
  })
  res.json(entry)
})

export default router
