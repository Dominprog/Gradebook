import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography, Button, Modal, Form, Input, Select,
  DatePicker, message, Spin, Tooltip, Alert, Tag,
  Popconfirm, Space, Divider
} from 'antd'
import {
  PlusOutlined, ArrowLeftOutlined, BookOutlined,
  DownloadOutlined, TeamOutlined, EditOutlined,
  UserDeleteOutlined, UserAddOutlined, CheckCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { getGroupSubjectJournal, upsertEntry, JournalResponse } from '../../api/journal'
import { createLesson } from '../../api/lessons'
import { getSlotsByGroupSubject } from '../../api/schedule'
import { createUser, updateUser, deleteUser } from '../../api/users'
import { User, AttendStatus, ScheduleSlot } from '../../types'
import GradeCell from '../../components/GradeCell'
import GradeModal from '../../components/GradeModal'
import dayjs from 'dayjs'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const TYPE_COLOR: Record<string, string> = { LECTURE: '#1677ff', LAB: '#722ed1', PRACTICE: '#52c41a', TEST: '#f5222d' }
const TYPE_SHORT: Record<string, string> = { LECTURE: 'Лек', LAB: 'Лаб', PRACTICE: 'Пр', TEST: 'Кон' }

const NAME_RE = /^[А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z'\-]*(\s[А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z'\-]*)+$/

const nameValidator = (_: unknown, value: string) => {
  if (!value || !value.trim()) return Promise.reject(new Error('Введите фамилию и имя'))
  if (/\d/.test(value)) return Promise.reject(new Error('ФИ не может содержать цифры'))
  if (!NAME_RE.test(value.trim())) return Promise.reject(new Error('Введите фамилию и имя через пробел (только буквы)'))
  return Promise.resolve()
}

type JournalData = JournalResponse
interface ContextMenu { x: number; y: number; lessonId: number; studentId: number }

export default function TeacherJournal() {
  const { groupSubjectId } = useParams<{ groupSubjectId: string }>()
  const navigate = useNavigate()
  const gsId = Number(groupSubjectId)

  const [data, setData] = useState<JournalData>({ lessons: [], students: [], entries: [], groupId: null })
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null)
  const [lessonForm] = Form.useForm()

  const [gradeModal, setGradeModal] = useState<{ lessonId: number; studentId: number; studentName: string; current: number | null } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  const [studentsOpen, setStudentsOpen] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<User | null>(null)
  const [studentSaving, setStudentSaving] = useState(false)
  const [addStudentForm] = Form.useForm()
  const [editStudentForm] = Form.useForm()

  const load = useCallback(async () => {
    try {
      const r = await getGroupSubjectJournal(gsId)
      setData(r.data)
    } finally {
      setLoading(false)
    }
  }, [gsId])

  useEffect(() => {
    load()
    getSlotsByGroupSubject(gsId).then(r => {
      setSlots(r.data)
      if (r.data.length > 0) setSelectedSlotId(r.data[0].id)
    }).catch(() => {})
  }, [gsId, load])

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const sortedStudents = [...data.students].sort((a, b) => {
    if (!!a.isExpelled === !!b.isExpelled) return a.name.localeCompare(b.name, 'ru')
    return a.isExpelled ? 1 : -1
  })

  const activeStudents = sortedStudents.filter(s => !s.isExpelled)
  const expelledStudents = sortedStudents.filter(s => s.isExpelled)

  const getEntry = (lessonId: number, studentId: number) =>
    data.entries.find(e => e.lessonId === lessonId && e.studentId === studentId)

  const handleSetStatus = async (lessonId: number, studentId: number, status: AttendStatus) => {
    try {
      await upsertEntry({ lessonId, studentId, status })
      load()
    } catch {
      message.error('Ошибка сохранения')
    }
  }

  const handleGradeConfirm = async (grade: number | null) => {
    if (!gradeModal) return
    try {
      await upsertEntry({ lessonId: gradeModal.lessonId, studentId: gradeModal.studentId, grade })
      setGradeModal(null)
      load()
      message.success('Оценка сохранена')
    } catch {
      message.error('Ошибка сохранения')
    }
  }

  const handleAddLesson = async (values: { date: dayjs.Dayjs; topic?: string; type: string }) => {
    if (!selectedSlotId) {
      message.error('Нет расписания. Добавьте слот в разделе «Расписание».')
      return
    }
    try {
      await createLesson({
        scheduleSlotId: selectedSlotId,
        date: values.date.toISOString(),
        topic: values.topic?.trim() || undefined,
        type: values.type
      })
      setAddOpen(false)
      lessonForm.resetFields()
      load()
      message.success('Занятие добавлено')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при добавлении')
    }
  }

  const handleAddStudent = async (values: { name: string; email: string; password: string }) => {
    if (!data.groupId) { message.error('Не удалось определить группу'); return }
    setStudentSaving(true)
    try {
      await createUser({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: 'STUDENT',
        groupId: data.groupId
      })
      setAddStudentOpen(false)
      addStudentForm.resetFields()
      await load()
      message.success('Студент добавлен в группу')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при добавлении')
    } finally {
      setStudentSaving(false)
    }
  }

  const handleEditStudent = async (values: { name: string }) => {
    if (!editingStudent) return
    setStudentSaving(true)
    try {
      await updateUser(editingStudent.id, { name: values.name.trim() })
      setEditingStudent(null)
      editStudentForm.resetFields()
      await load()
      message.success('Данные студента обновлены')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при обновлении')
    } finally {
      setStudentSaving(false)
    }
  }

  const handleExpell = async (student: User, expell: boolean) => {
    setStudentSaving(true)
    try {
      await updateUser(student.id, { isExpelled: expell })
      await load()
      message.success(expell ? `${student.name} отчислен(а)` : `${student.name} восстановлен(а)`)
    } catch {
      message.error('Ошибка при обновлении')
    } finally {
      setStudentSaving(false)
    }
  }

  const handleDeleteStudent = async (student: User) => {
    setStudentSaving(true)
    try {
      await deleteUser(student.id)
      await load()
      message.success(`${student.name} удалён из системы`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при удалении')
    } finally {
      setStudentSaving(false)
    }
  }

  const openEditStudent = (student: User) => {
    setEditingStudent(student)
    editStudentForm.setFieldsValue({ name: student.name })
  }

  const exportCSV = () => {
    const subjectName = data.lessons[0]?.scheduleSlot?.groupSubject?.subject?.name || 'журнал'
    const header = 'Студент,Дата,Тема,Тип,Оценка,Статус\n'
    const rows: string[] = []
    for (const student of sortedStudents) {
      for (const lesson of data.lessons) {
        const entry = getEntry(lesson.id, student.id)
        rows.push([
          student.name,
          dayjs(lesson.date).format('DD.MM.YYYY'),
          lesson.topic || '',
          TYPE_SHORT[lesson.type] || lesson.type,
          entry?.grade ?? '',
          entry?.status === 'ABSENT' ? 'Н' : entry?.status === 'LATE' ? 'О' : ''
        ].join(','))
      }
    }
    const csv = '\uFEFF' + header + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${subjectName}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const getHighlightBg = (rowIdx: number, colIdx: number) => {
    if (!hoveredCell) return undefined
    if (hoveredCell.row === rowIdx && hoveredCell.col === colIdx) return '#bae0ff'
    if (hoveredCell.row === rowIdx || hoveredCell.col === colIdx) return '#e6f4ff'
    return undefined
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spin size="large" />
    </div>
  )

  const subjectName = data.lessons[0]?.scheduleSlot?.groupSubject?.subject?.name
  const groupName = data.groupName || data.lessons[0]?.scheduleSlot?.groupSubject?.group?.name

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          {subjectName || 'Журнал'} {groupName && `— ${groupName}`}
        </Typography.Title>
      </div>

      {slots.length === 0 && (
        <Alert
          type="warning" showIcon
          message="Нет расписания для этого предмета"
          description='Перейдите в «Расписание» и добавьте слот.'
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)} disabled={slots.length === 0}>
          Добавить занятие
        </Button>
        <Button icon={<TeamOutlined />} onClick={() => setStudentsOpen(true)}>
          Студенты
          {data.students.length > 0 && (
            <Tag color={expelledStudents.length > 0 ? 'orange' : 'blue'} style={{ marginLeft: 6, marginRight: 0 }}>
              {activeStudents.length}
              {expelledStudents.length > 0 && ` / ${expelledStudents.length} отч.`}
            </Tag>
          )}
        </Button>
        <Button icon={<BookOutlined />} onClick={() => navigate(`/teacher/subject-program/${gsId}`)}>
          Программа предмета
        </Button>
        {data.lessons.length > 0 && (
          <Button icon={<DownloadOutlined />} onClick={exportCSV}>Экспорт CSV</Button>
        )}
      </div>

      <div style={{ marginBottom: 10, fontSize: 12, color: '#aaa', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>🖱️ <strong>Левая кнопка</strong> — выставить оценку</span>
        <span>🖱️ <strong>Правая кнопка</strong> — статус (Н/О)</span>
        {expelledStudents.length > 0 && (
          <span style={{ color: '#ff7875' }}>⚠️ Отчисленные — в конце списка</span>
        )}
      </div>

      {data.lessons.length === 0 && slots.length > 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px dashed #d9d9d9', color: '#aaa' }}>
          Занятий нет. Нажмите «Добавить занятие».
        </div>
      )}

      {data.lessons.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #f0f0f0', background: '#fff' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', background: '#fafafa', borderBottom: '2px solid #f0f0f0', textAlign: 'left', position: 'sticky', left: 0, zIndex: 2, minWidth: 200, fontWeight: 600 }}>
                  Студент
                </th>
                {data.lessons.map((lesson, colIdx) => (
                  <th
                    key={lesson.id}
                    onMouseEnter={() => setHoveredCell({ row: -1, col: colIdx })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ padding: '6px 4px', borderBottom: '2px solid #f0f0f0', background: hoveredCell?.col === colIdx ? '#e6f4ff' : '#fafafa', textAlign: 'center', minWidth: 48, cursor: 'default', transition: 'background 0.1s' }}
                  >
                    <Tooltip title={lesson.topic || TYPE_SHORT[lesson.type]}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{dayjs(lesson.date).format('DD.MM')}</div>
                      <div style={{ fontSize: 10, color: TYPE_COLOR[lesson.type] }}>{TYPE_SHORT[lesson.type]}</div>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, rowIdx) => {
                const isExpelled = !!student.isExpelled
                const isFirst = rowIdx === activeStudents.length && isExpelled && expelledStudents.length > 0
                return (
                  <>
                    {isFirst && (
                      <tr key="divider-expelled">
                        <td colSpan={data.lessons.length + 1} style={{ padding: '4px 16px', background: '#fff1f0', borderBottom: '1px solid #ffa39e', borderTop: '2px solid #ffa39e', fontSize: 11, color: '#cf1322', fontWeight: 600 }}>
                          ▼ Отчисленные студенты
                        </td>
                      </tr>
                    )}
                    <tr key={student.id}>
                      <td
                        onMouseEnter={() => setHoveredCell({ row: rowIdx, col: -1 })}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{ padding: '6px 16px', borderBottom: '1px solid #f5f5f5', background: hoveredCell?.row === rowIdx ? '#e6f4ff' : '#fff', opacity: isExpelled ? 0.45 : 1, position: 'sticky', left: 0, zIndex: 1, minWidth: 200, transition: 'background 0.1s' }}
                      >
                        <span style={{ color: student.isNew ? '#1677ff' : '#333', fontWeight: student.isNew ? 600 : 400 }}>
                          {student.name}
                        </span>
                        {isExpelled && <span style={{ marginLeft: 6, fontSize: 10, color: '#ff4d4f', background: '#fff1f0', padding: '1px 6px', borderRadius: 4 }}>отч.</span>}
                        {student.isNew && <span style={{ marginLeft: 6, fontSize: 10, color: '#1677ff', background: '#e6f4ff', padding: '1px 6px', borderRadius: 4 }}>new</span>}
                      </td>
                      {data.lessons.map((lesson, colIdx) => {
                        const entry = getEntry(lesson.id, student.id)
                        return (
                          <GradeCell
                            key={lesson.id}
                            grade={entry?.grade ?? null}
                            status={(entry?.status ?? 'PRESENT') as AttendStatus}
                            isExpelled={isExpelled}
                            isNew={student.isNew ?? false}
                            highlightBg={getHighlightBg(rowIdx, colIdx)}
                            onLeftClick={() => setGradeModal({ lessonId: lesson.id, studentId: student.id, studentName: student.name, current: entry?.grade ?? null })}
                            onRightClick={e => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, lessonId: lesson.id, studentId: student.id }) }}
                            onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        )
                      })}
                    </tr>
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {contextMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden', minWidth: 180 }}>
          {[
            { label: 'Н — Отсутствие', status: 'ABSENT' as AttendStatus, color: '#ff4d4f', bg: '#fff1f0' },
            { label: 'О — Опоздание', status: 'LATE' as AttendStatus, color: '#d48806', bg: '#fffbe6' },
            { label: '✓ Убрать статус', status: 'PRESENT' as AttendStatus, color: '#52c41a', bg: '#f6ffed' }
          ].map((item, i) => (
            <div key={item.status} onClick={() => { handleSetStatus(contextMenu.lessonId, contextMenu.studentId, item.status); setContextMenu(null) }}
              style={{ padding: '10px 16px', cursor: 'pointer', color: item.color, fontWeight: 600, fontSize: 13, borderTop: i > 0 ? '1px solid #f5f5f5' : undefined }}
              onMouseEnter={e => (e.currentTarget.style.background = item.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} title="Добавить занятие" onCancel={() => { setAddOpen(false); lessonForm.resetFields() }} onOk={lessonForm.submit} okText="Добавить" cancelText="Отмена" destroyOnClose>
        <Form form={lessonForm} layout="vertical" onFinish={handleAddLesson} style={{ marginTop: 16 }}>
          {slots.length > 1 && (
            <Form.Item label="Пара (слот расписания)">
              <Select style={{ width: '100%' }} value={selectedSlotId} onChange={v => setSelectedSlotId(v)}>
                {slots.map(s => (
                  <Select.Option key={s.id} value={s.id}>{DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime}, ауд. {s.room}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {slots.length === 1 && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6f8fa', borderRadius: 8, fontSize: 13, color: '#555' }}>
              📅 {DAYS[slots[0].dayOfWeek]} {slots[0].startTime}–{slots[0].endTime}, ауд. {slots[0].room}
            </div>
          )}
          <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Укажите дату занятия' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="type" label="Тип занятия" rules={[{ required: true }]} initialValue="LECTURE">
            <Select>
              <Select.Option value="LECTURE">📖 Лекция</Select.Option>
              <Select.Option value="LAB">🔬 Лабораторная</Select.Option>
              <Select.Option value="PRACTICE">✏️ Практика</Select.Option>
              <Select.Option value="TEST">📝 Контрольная</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="topic" label="Тема (необязательно)">
            <Input placeholder="Тема занятия" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      {gradeModal && (
        <GradeModal open studentName={gradeModal.studentName} initialGrade={gradeModal.current} onConfirm={handleGradeConfirm} onCancel={() => setGradeModal(null)} />
      )}

      <Modal
        open={studentsOpen}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span>👥 Управление студентами</span>
            <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={() => { addStudentForm.resetFields(); setAddStudentOpen(true) }}>
              Добавить
            </Button>
          </div>
        }
        footer={null}
        width={640}
        onCancel={() => setStudentsOpen(false)}
        destroyOnClose
      >
        {sortedStudents.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '24px 0' }}>В группе нет студентов</div>
        )}

        {activeStudents.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>Активные — {activeStudents.length}</div>
            {activeStudents.map(student => (
              <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 8, marginBottom: 6, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>{student.name}</span>
                  {student.isNew && <Tag color="blue">Новый</Tag>}
                </div>
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditStudent(student)}>Ред.</Button>
                  <Popconfirm title="Отчислить студента?" description={`${student.name} переместится в конец списка`} onConfirm={() => handleExpell(student, true)} okText="Отчислить" cancelText="Отмена" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<UserDeleteOutlined />} loading={studentSaving}>Отчислить</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Удалить студента?"
                    description={<span style={{ color: '#ff4d4f' }}>Все оценки и данные будут удалены безвозвратно!</span>}
                    onConfirm={() => handleDeleteStudent(student)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={studentSaving} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </>
        )}

        {expelledStudents.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }}>
              <span style={{ fontSize: 12, color: '#ff4d4f' }}>Отчисленные — {expelledStudents.length}</span>
            </Divider>
            {expelledStudents.map(student => (
              <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px dashed #ffa39e', borderRadius: 8, marginBottom: 6, background: '#fff8f8', opacity: 0.75 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#999', textDecoration: 'line-through' }}>{student.name}</span>
                  <Tag color="red">Отч.</Tag>
                </div>
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditStudent(student)}>Ред.</Button>
                  <Popconfirm title="Восстановить студента?" onConfirm={() => handleExpell(student, false)} okText="Восстановить" cancelText="Отмена">
                    <Button size="small" icon={<CheckCircleOutlined />} loading={studentSaving}>Восстановить</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Удалить студента?"
                    description={<span style={{ color: '#ff4d4f' }}>Все оценки и данные будут удалены безвозвратно!</span>}
                    onConfirm={() => handleDeleteStudent(student)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={studentSaving} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </>
        )}
      </Modal>

      <Modal
        open={addStudentOpen}
        title={<span><UserAddOutlined style={{ marginRight: 8 }} />Добавить студента</span>}
        onCancel={() => { setAddStudentOpen(false); addStudentForm.resetFields() }}
        onOk={addStudentForm.submit}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={studentSaving}
        destroyOnClose
      >
        <Form form={addStudentForm} layout="vertical" onFinish={handleAddStudent} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Фамилия и имя"
            rules={[{ required: true }, { validator: nameValidator }]}
            extra="Например: Иванов Иван или Иванов Иван Иванович"
          >
            <Input placeholder="Иванов Иван" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email (например, student@example.com)' }
            ]}
          >
            <Input placeholder="student@example.com" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 4, message: 'Пароль должен содержать не менее 4 символов' }
            ]}
          >
            <Input.Password placeholder="Минимум 4 символа" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!editingStudent}
        title={<span><EditOutlined style={{ marginRight: 8 }} />Редактировать студента</span>}
        onCancel={() => { setEditingStudent(null); editStudentForm.resetFields() }}
        onOk={editStudentForm.submit}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={studentSaving}
        destroyOnClose
      >
        <Form form={editStudentForm} layout="vertical" onFinish={handleEditStudent} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Фамилия и имя"
            rules={[{ required: true }, { validator: nameValidator }]}
            extra="Только буквы, не менее двух слов. Например: Иванов Иван"
          >
            <Input placeholder="Иванов Иван" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
