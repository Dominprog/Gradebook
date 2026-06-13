import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const teacherHash = await bcrypt.hash('teacher123', 10)
  const studentHash = await bcrypt.hash('student123', 10)

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@mail.com' },
    update: {},
    create: { name: 'Иван Петрович', email: 'teacher@mail.com', passwordHash: teacherHash, role: 'TEACHER' }
  })

  const group = await prisma.group.upsert({
    where: { name: 'ИС-21' },
    update: {},
    create: { name: 'ИС-21' }
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@mail.com' },
    update: {},
    create: { name: 'Алиса Смирнова', email: 'alice@mail.com', passwordHash: studentHash, role: 'STUDENT', groupId: group.id, isNew: true }
  })
  const bob = await prisma.user.upsert({
    where: { email: 'bob@mail.com' },
    update: {},
    create: { name: 'Боб Иванов', email: 'bob@mail.com', passwordHash: studentHash, role: 'STUDENT', groupId: group.id }
  })
  const carol = await prisma.user.upsert({
    where: { email: 'carol@mail.com' },
    update: {},
    create: { name: 'Карина Козлова', email: 'carol@mail.com', passwordHash: studentHash, role: 'STUDENT', groupId: group.id }
  })
  const dave = await prisma.user.upsert({
    where: { email: 'dave@mail.com' },
    update: {},
    create: { name: 'Дмитрий Попов', email: 'dave@mail.com', passwordHash: studentHash, role: 'STUDENT', groupId: group.id, isExpelled: true }
  })

  const mathSub = await prisma.subject.upsert({ where: { name: 'Математика' }, update: {}, create: { name: 'Математика' } })
  const progSub = await prisma.subject.upsert({ where: { name: 'Программирование' }, update: {}, create: { name: 'Программирование' } })
  const dbSub = await prisma.subject.upsert({ where: { name: 'Базы данных' }, update: {}, create: { name: 'Базы данных' } })

  const mathGs = await prisma.groupSubject.upsert({
    where: { groupId_subjectId: { groupId: group.id, subjectId: mathSub.id } },
    update: {},
    create: { groupId: group.id, subjectId: mathSub.id, teacherId: teacher.id }
  })
  const progGs = await prisma.groupSubject.upsert({
    where: { groupId_subjectId: { groupId: group.id, subjectId: progSub.id } },
    update: {},
    create: { groupId: group.id, subjectId: progSub.id, teacherId: teacher.id }
  })
  await prisma.groupSubject.upsert({
    where: { groupId_subjectId: { groupId: group.id, subjectId: dbSub.id } },
    update: {},
    create: { groupId: group.id, subjectId: dbSub.id, teacherId: teacher.id }
  })

  const mathSlot = await prisma.scheduleSlot.create({
    data: { groupSubjectId: mathGs.id, dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: '101' }
  })
  const progSlot = await prisma.scheduleSlot.create({
    data: { groupSubjectId: progGs.id, dayOfWeek: 1, startTime: '10:45', endTime: '12:15', room: '202' }
  })

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)

  const lesson1 = await prisma.lesson.create({
    data: { scheduleSlotId: mathSlot.id, date: twoWeeksAgo, topic: 'Пределы функций', type: 'LECTURE' }
  })
  const lesson2 = await prisma.lesson.create({
    data: { scheduleSlotId: mathSlot.id, date: lastWeek, topic: 'Производные', type: 'PRACTICE' }
  })
  const lesson3 = await prisma.lesson.create({
    data: { scheduleSlotId: progSlot.id, date: twoWeeksAgo, topic: 'Лабораторная 1: Массивы', type: 'LAB' }
  })
  const lesson4 = await prisma.lesson.create({
    data: { scheduleSlotId: progSlot.id, date: lastWeek, topic: 'Контрольная 1', type: 'TEST' }
  })

  const entries = [
    { lessonId: lesson1.id, studentId: alice.id, teacherId: teacher.id, grade: 5, status: 'PRESENT' },
    { lessonId: lesson1.id, studentId: bob.id, teacherId: teacher.id, grade: 4, status: 'PRESENT' },
    { lessonId: lesson1.id, studentId: carol.id, teacherId: teacher.id, grade: null, status: 'LATE' },
    { lessonId: lesson1.id, studentId: dave.id, teacherId: teacher.id, grade: null, status: 'ABSENT' },
    { lessonId: lesson2.id, studentId: alice.id, teacherId: teacher.id, grade: 5, status: 'PRESENT' },
    { lessonId: lesson2.id, studentId: bob.id, teacherId: teacher.id, grade: 3, status: 'PRESENT' },
    { lessonId: lesson2.id, studentId: carol.id, teacherId: teacher.id, grade: 4, status: 'PRESENT' },
    { lessonId: lesson2.id, studentId: dave.id, teacherId: teacher.id, grade: null, status: 'ABSENT' },
    { lessonId: lesson3.id, studentId: alice.id, teacherId: teacher.id, grade: 5, status: 'PRESENT' },
    { lessonId: lesson3.id, studentId: bob.id, teacherId: teacher.id, grade: null, status: 'PRESENT' },
    { lessonId: lesson3.id, studentId: carol.id, teacherId: teacher.id, grade: 3, status: 'PRESENT' },
    { lessonId: lesson4.id, studentId: alice.id, teacherId: teacher.id, grade: 5, status: 'PRESENT' },
    { lessonId: lesson4.id, studentId: bob.id, teacherId: teacher.id, grade: 4, status: 'PRESENT' },
    { lessonId: lesson4.id, studentId: carol.id, teacherId: teacher.id, grade: 5, status: 'LATE' },
  ]

  for (const entry of entries) {
    await prisma.journalEntry.upsert({
      where: { lessonId_studentId: { lessonId: entry.lessonId, studentId: entry.studentId } },
      update: {},
      create: entry
    })
  }

  const lab1 = await prisma.labWork.create({
    data: {
      groupSubjectId: progGs.id,
      title: 'Лабораторная работа №1',
      description: 'Реализовать алгоритмы сортировки: пузырьковая, быстрая, сортировка слиянием.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isTeam: false
    }
  })

  const lab2 = await prisma.labWork.create({
    data: {
      groupSubjectId: progGs.id,
      title: 'Лабораторная работа №2',
      description: 'Разработать REST API для управления задачами (командная работа).',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isTeam: true
    }
  })

  await prisma.labTeam.create({
    data: {
      labWorkId: lab2.id,
      members: { create: [{ studentId: alice.id }, { studentId: bob.id }] }
    }
  })

  await prisma.labSubmission.upsert({
    where: { labWorkId_studentId: { labWorkId: lab1.id, studentId: alice.id } },
    update: {},
    create: {
      labWorkId: lab1.id,
      studentId: alice.id,
      grade: 5,
      comment: 'Отличная работа! Все алгоритмы реализованы верно.',
      reviewedAt: new Date()
    }
  })

  await prisma.labSubmission.upsert({
    where: { labWorkId_studentId: { labWorkId: lab1.id, studentId: bob.id } },
    update: {},
    create: { labWorkId: lab1.id, studentId: bob.id }
  })

  console.log('\n✅ База данных заполнена!\n')
  console.log('👤 Преподаватель:  teacher@mail.com  /  teacher123')
  console.log('👤 Студент:        alice@mail.com    /  student123')
  console.log('👤 Студент:        bob@mail.com      /  student123')
  console.log('👤 Студент:        carol@mail.com    /  student123')
  console.log('👤 Студент (отч.): dave@mail.com     /  student123\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
