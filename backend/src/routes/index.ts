import { Router } from 'express'
import authRouter from './auth.route'
import usersRouter from './users.route'
import groupsRouter from './groups.route'
import subjectsRouter from './subjects.route'
import groupSubjectsRouter from './groupSubjects.route'
import scheduleRouter from './schedule.route'
import lessonsRouter from './lessons.route'
import journalRouter from './journal.route'
import labsRouter from './labs.route'
import submissionsRouter from './submissions.route'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', usersRouter)
router.use('/groups', groupsRouter)
router.use('/subjects', subjectsRouter)
router.use('/group-subjects', groupSubjectsRouter)
router.use('/schedule', scheduleRouter)
router.use('/lessons', lessonsRouter)
router.use('/journal', journalRouter)
router.use('/labs', labsRouter)
router.use('/submissions', submissionsRouter)

export default router
