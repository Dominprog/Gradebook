import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../config/db'
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_RE = /^[А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z'\-]*(\s[А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z'\-]*)+$/

function validateName(raw: string): string | null {
  const name = raw.trim()
  if (!name) return 'Введите фамилию и имя'
  if (/\d/.test(name)) return 'ФИ не может содержать цифры'
  if (!NAME_RE.test(name)) return 'Введите фамилию и имя через пробел (только буквы)'
  if (name.length > 100) return 'ФИ не должно превышать 100 символов'
  return null
}

router.get('/', requireTeacher, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    include: { group: true },
    orderBy: { name: 'asc' }
  })
  res.json(users.map((u: typeof users[0]) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    groupId: u.groupId,
    group: u.group,
    isExpelled: u.isExpelled,
    isNew: u.isNew
  })))
})

router.post('/', requireTeacher, async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, groupId } = req.body

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Заполните все обязательные поля' }); return
  }

  const nameErr = validateName(String(name))
  if (nameErr) { res.status(400).json({ error: nameErr }); return }

  if (!EMAIL_RE.test(String(email).trim())) {
    res.status(400).json({ error: 'Некорректный формат email' }); return
  }

  if (String(password).length < 4) {
    res.status(400).json({ error: 'Пароль должен содержать не менее 4 символов' }); return
  }

  const validRoles = ['STUDENT', 'TEACHER']
  if (!validRoles.includes(String(role))) {
    res.status(400).json({ error: 'Роль должна быть STUDENT или TEACHER' }); return
  }

  const existing = await prisma.user.findUnique({ where: { email: String(email).trim() } })
  if (existing) {
    res.status(409).json({ error: 'Пользователь с таким email уже существует' }); return
  }

  const hash = await bcrypt.hash(String(password), 10)
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: String(email).trim(),
      passwordHash: hash,
      role: String(role),
      groupId: groupId ? Number(groupId) : null,
      isNew: true
    }
  })
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role })
})

router.patch('/:id', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }

  const { isExpelled, isNew, name, email } = req.body
  const updateData: Record<string, unknown> = {}

  if (isExpelled !== undefined) updateData.isExpelled = Boolean(isExpelled)
  if (isNew !== undefined) updateData.isNew = Boolean(isNew)

  if (name !== undefined) {
    const nameErr = validateName(String(name))
    if (nameErr) { res.status(400).json({ error: nameErr }); return }
    updateData.name = String(name).trim()
  }

  if (email !== undefined) {
    if (!EMAIL_RE.test(String(email).trim())) {
      res.status(400).json({ error: 'Некорректный формат email' }); return
    }
    const conflict = await prisma.user.findFirst({ where: { email: String(email).trim(), NOT: { id } } })
    if (conflict) {
      res.status(409).json({ error: 'Пользователь с таким email уже существует' }); return
    }
    updateData.email = String(email).trim()
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: 'Нет полей для обновления' }); return
  }

  const user = await prisma.user.update({ where: { id }, data: updateData })
  res.json({ id: user.id, name: user.name, email: user.email, isExpelled: user.isExpelled, isNew: user.isNew })
})

router.delete('/:id', requireTeacher, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Неверный ID' }); return }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }

  await prisma.journalEntry.deleteMany({ where: { studentId: id } })
  await prisma.labTeamMember.deleteMany({ where: { studentId: id } })
  await prisma.labSubmission.deleteMany({ where: { studentId: id } })
  await prisma.user.delete({ where: { id } })

  res.status(204).send()
})

export default router
