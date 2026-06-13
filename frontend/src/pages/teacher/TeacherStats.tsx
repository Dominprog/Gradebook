import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Card, Row, Col, Button, Spin, Empty, Progress } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { getGroupSubjectJournal } from '../../api/journal'
import { getGroupSubjectById } from '../../api/subjects'
import { User, Lesson, JournalEntry, GroupSubject } from '../../types'
import dayjs from 'dayjs'

function MiniBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 10, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
      <span style={{ minWidth: 28, fontWeight: 700, color, fontSize: 13 }}>{value}</span>
    </div>
  )
}

export default function TeacherStats() {
  const { groupSubjectId } = useParams<{ groupSubjectId: string }>()
  const navigate = useNavigate()
  const gsId = Number(groupSubjectId)

  const [gs, setGs] = useState<GroupSubject | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getGroupSubjectJournal(gsId),
      getGroupSubjectById(gsId)
    ]).then(([jRes, gsRes]) => {
      setLessons(jRes.data.lessons)
      setStudents(jRes.data.students)
      setEntries(jRes.data.entries)
      setGs(gsRes.data)
    }).finally(() => setLoading(false))
  }, [gsId])

  const getStudentStats = (studentId: number) => {
    const studentEntries = entries.filter(e => e.studentId === studentId)
    const graded = studentEntries.filter(e => e.grade !== null)
    const avg = graded.length ? graded.reduce((s, e) => s + (e.grade ?? 0), 0) / graded.length : 0
    const absent = studentEntries.filter(e => e.status === 'ABSENT').length
    const late = studentEntries.filter(e => e.status === 'LATE').length
    const attended = studentEntries.length - absent
    const attendance = studentEntries.length > 0 ? Math.round((attended / studentEntries.length) * 100) : 0
    return { avg: Math.round(avg * 10) / 10, absent, late, attendance, count: graded.length }
  }

  const exportCSV = () => {
    const header = 'Студент,Средний балл,Оценок,Пропусков,Опозданий,Посещаемость %\n'
    const rows = students.map(s => {
      const st = getStudentStats(s.id)
      return [s.name, st.avg, st.count, st.absent, st.late, st.attendance].join(',')
    }).join('\n')
    const csv = '\uFEFF' + header + rows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `статистика_${gs?.subject?.name || 'группы'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  const allGraded = entries.filter(e => e.grade !== null)
  const groupAvg = allGraded.length ? allGraded.reduce((s, e) => s + (e.grade ?? 0), 0) / allGraded.length : 0

  const sortedStudents = [...students].sort((a, b) => {
    const avgA = getStudentStats(a.id).avg
    const avgB = getStudentStats(b.id).avg
    return avgB - avgA
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Статистика: {gs?.subject?.name} — {gs?.group?.name}
        </Typography.Title>
      </div>

      <Button icon={<DownloadOutlined />} onClick={exportCSV} style={{ marginBottom: 20 }}>
        Экспорт CSV
      </Button>

      {students.length === 0 && <Empty description="Нет данных" />}

      {students.length > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" title="Общая статистика группы">
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: '#1677ff' }}>{groupAvg.toFixed(1)}</div>
                <div style={{ color: '#888', fontSize: 13 }}>Средний балл группы</div>
                <div style={{ marginTop: 16 }}>
                  <Progress
                    percent={Math.round((groupAvg / 10) * 100)}
                    strokeColor={groupAvg >= 7 ? '#52c41a' : groupAvg >= 5 ? '#faad14' : '#ff4d4f'}
                    showInfo={false}
                  />
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>{lessons.length}</div>
                    <div style={{ color: '#888' }}>Занятий</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>{students.length}</div>
                    <div style={{ color: '#888' }}>Студентов</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Card size="small" title="Рейтинг студентов (по среднему баллу)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedStudents.map((student, idx) => {
                  const stats = getStudentStats(student.id)
                  const color = stats.avg >= 7 ? '#52c41a' : stats.avg >= 5 ? '#faad14' : stats.avg > 0 ? '#ff4d4f' : '#d9d9d9'
                  return (
                    <div key={student.id} style={{ opacity: student.isExpelled ? 0.4 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: student.isNew ? '#1677ff' : '#333', fontWeight: student.isNew ? 600 : 400 }}>
                          {idx + 1}. {student.name}
                          {student.isExpelled && <span style={{ marginLeft: 6, fontSize: 11, color: '#ff4d4f' }}>отч.</span>}
                          {student.isNew && <span style={{ marginLeft: 6, fontSize: 11, color: '#1677ff' }}>new</span>}
                        </span>
                        <span style={{ fontSize: 12, color: '#888' }}>
                          Пр: {stats.absent} | Оп: {stats.late} | Посещ: {stats.attendance}%
                        </span>
                      </div>
                      <MiniBar value={stats.avg} color={color} />
                    </div>
                  )
                })}
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
