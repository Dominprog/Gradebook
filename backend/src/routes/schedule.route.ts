import { Router, Response } from 'express'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/
const ROOM_REGEX = /^[А-ЯЁа-яёA-Za-z0-9][А-ЯЁа-яёA-Za-z0-9\-\.]*$/

function validateSlot(startTime: string, endTime: string, dayOfWeek: number, room?: string): string | null {
  if (!TIME_REGEX.test(startTime))
    return 'Время начала должно быть в формате ЧЧ:ММ (например, 09:00)'
  if (!TIME_REGEX.test(endTime))
    return 'Время окончания должно быть в формате ЧЧ:ММ (например, 10:30)'
  const day = Number(dayOfWeek)
  if (!Number.isInteger(day) || day < 0 || day > 6)
    return 'День недели должен быть от 0 (Пн) до 6 (Вс)'
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if (sh * 60 + sm >= eh * 60 + em)
    return 'Время начала должно быть раньше времени окончания'
  if (room && room.trim()) {
    const r = room.trim()
    if (r.length > 15) return 'Номер аудитории не должен превышать 15 символов'
    if (!ROOM_REGEX.test(r)) return 'Аудитория: только буквы, цифры и дефис (например: 101, А-201, Б304)'
  }
  return null
}

router.get('/group-subject/:gsId', async (req: AuthRequest, res: Response) => {
  const gsId = Number(req.params.gsId)
  if (isNaN(gsId)) { res.status(400).json({ error: 'Неверный ID' }); return }
  const slots = await prisma.scheduleSlot.findMany({
    where: { groupSubjectId: gsId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
  res.json(slots)
})

router.get('/', async (req: AuthRequest, res: Response) => {
  let gsIds: number[] = []
  if (req.userRole === 'STUDENT') {
    const student = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!student?.groupId) { res.json([]); return }
    const gsList = await prisma.groupSubject.findMany({ where: { groupId: student.groupId } })
    gsIds = gsList.map((gs: { id: number }) => gs.id)
  } else {
    const gsList = await prisma.groupSubject.findMany({ where: { teacherId: req.userId } })
    gsIds = gsList.map((gs: { id: number }) => gs.id)
  }
  const slots = await prisma.scheduleSlot.findMany({
    where: { groupSubjectId: { in: gsIds } },
    include: {
      groupSubject: {
        include: {
          subject: true,
          group: true,
          teacher: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
  res.json(slots)
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { groupSubjectId, dayOfWeek, startTime, endTime, room } = req.body
  if (groupSubjectId === undefined || dayOfWeek === undefined || !startTime || !endTime) {
    res.status(400).json({ error: 'Заполните все обязательные поля' }); return
  }
  const err = validateSlot(String(startTime), String(endTime), Number(dayOfWeek), room)
  if (err) { res.status(400).json({ error: err }); return }

  const gs = await prisma.groupSubject.findUnique({ where: { id: Number(groupSubjectId) } })
  if (!gs) { res.status(404).json({ error: 'Предмет/группа не найдены' }); return }

  const slot = await prisma.scheduleSlot.create({
    data: {
      groupSubjectId: Number(groupSubjectId),
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      room: room?.trim() || ''
    },
    include: { groupSubject: { include: { subject: true, group: true } } }
  })
  res.status(201).json(slot)
})

router.put('/:id', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }
  const { dayOfWeek, startTime, endTime, room } = req.body
  if (dayOfWeek === undefined || !startTime || !endTime) {
    res.status(400).json({ error: 'Заполните все обязательные поля' }); return
  }
  const err = validateSlot(String(startTime), String(endTime), Number(dayOfWeek), room)
  if (err) { res.status(400).json({ error: err }); return }

  const existing = await prisma.scheduleSlot.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Слот не найден' }); return }

  const updated = await prisma.scheduleSlot.update({
    where: { id },
    data: { dayOfWeek: Number(dayOfWeek), startTime, endTime, room: room?.trim() || '' },
    include: { groupSubject: { include: { subject: true, group: true } } }
  })
  res.json(updated)
})

router.delete('/:id', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }

  const slot = await prisma.scheduleSlot.findUnique({
    where: { id },
    include: { lessons: true }
  })
  if (!slot) { res.status(404).json({ error: 'Слот не найден' }); return }

  const lessonIds = slot.lessons.map((l: { id: number }) => l.id)
  if (lessonIds.length > 0) {
    await prisma.journalEntry.deleteMany({ where: { lessonId: { in: lessonIds } } })
    await prisma.lesson.deleteMany({ where: { scheduleSlotId: id } })
  }
  await prisma.scheduleSlot.delete({ where: { id } })
  res.status(204).send()
})

export default router
