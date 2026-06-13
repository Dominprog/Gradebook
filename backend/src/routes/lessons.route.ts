import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const VALID_TYPES = ['LECTURE', 'LAB', 'PRACTICE', 'TEST']

router.get('/', async (req: AuthRequest, res: Response) => {
  const gsId = req.query.groupSubjectId ? Number(req.query.groupSubjectId) : undefined
  const lessons = await prisma.lesson.findMany({
    where: gsId ? { scheduleSlot: { groupSubjectId: gsId } } : {},
    include: {
      scheduleSlot: {
        include: { groupSubject: { include: { subject: true, group: true } } }
      }
    },
    orderBy: { date: 'asc' }
  })
  res.json(lessons)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { scheduleSlotId, date, topic, type } = req.body

  if (!scheduleSlotId || !date) {
    res.status(400).json({ error: 'scheduleSlotId и дата обязательны' }); return
  }

  // Validate date
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    res.status(400).json({ error: 'Неверный формат даты' }); return
  }

  // Validate type
  const lessonType = type || 'LECTURE'
  if (!VALID_TYPES.includes(lessonType)) {
    res.status(400).json({ error: `Тип занятия должен быть: ${VALID_TYPES.join(', ')}` }); return
  }

  // Validate topic length
  if (topic && String(topic).trim().length > 300) {
    res.status(400).json({ error: 'Тема занятия не должна превышать 300 символов' }); return
  }

  const slotId = Number(scheduleSlotId)
  if (isNaN(slotId)) {
    res.status(400).json({ error: 'Неверный ID слота' }); return
  }

  const slot = await prisma.scheduleSlot.findUnique({
    where: { id: slotId },
    include: {
      groupSubject: {
        include: {
          group: {
            include: {
              students: { where: { role: 'STUDENT', isExpelled: false } }
            }
          }
        }
      }
    }
  })

  if (!slot) {
    res.status(404).json({ error: 'Слот расписания не найден' }); return
  }

  const lesson = await prisma.lesson.create({
    data: {
      scheduleSlotId: slotId,
      date: parsedDate,
      topic: topic ? String(topic).trim() || null : null,
      type: lessonType
    }
  })

  const lessonDate = parsedDate
  const now = new Date()
  const isToday = lessonDate.toDateString() === now.toDateString()

  let defaultStatus = 'PRESENT'
  if (isToday && slot.startTime) {
    const parts = slot.startTime.split(':')
    const slotMinutes = Number(parts[0]) * 60 + Number(parts[1]) + 15
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes > slotMinutes) defaultStatus = 'LATE'
  }

  const students = slot.groupSubject.group.students
  for (const student of students) {
    await prisma.journalEntry.upsert({
      where: { lessonId_studentId: { lessonId: lesson.id, studentId: student.id } },
      update: {},
      create: {
        lessonId: lesson.id,
        studentId: student.id,
        teacherId: req.userId!,
        status: defaultStatus
      }
    })
  }

  res.status(201).json(lesson)
})

router.patch('/:id', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }

  const { topic, type } = req.body

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `Тип должен быть: ${VALID_TYPES.join(', ')}` }); return
  }

  if (topic !== undefined && String(topic).trim().length > 300) {
    res.status(400).json({ error: 'Тема не должна превышать 300 символов' }); return
  }

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      topic: topic !== undefined ? (String(topic).trim() || null) : undefined,
      type: type || undefined
    }
  })
  res.json(lesson)
})

export default router
