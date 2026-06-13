import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Card, Tag, Button, Row, Col, Spin, Empty } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getStudentJournal } from '../../api/journal'
import { getLabs } from '../../api/labs'
import { JournalEntry, LabWork } from '../../types'
import dayjs from 'dayjs'

const TYPE_LABELS: Record<string, string> = { LECTURE: 'Лекция', LAB: 'Лабораторная', PRACTICE: 'Практика', TEST: 'Контрольная' }
const TYPE_COLORS: Record<string, string> = { LECTURE: 'blue', LAB: 'purple', PRACTICE: 'green', TEST: 'red' }

export default function StudentSubject() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [labs, setLabs] = useState<LabWork[]>([])
  const [loading, setLoading] = useState(true)
  const gsId = Number(id)

  useEffect(() => {
    Promise.all([getStudentJournal(gsId), getLabs(gsId)])
      .then(([e, l]) => { setEntries(e.data); setLabs(l.data) })
      .finally(() => setLoading(false))
  }, [gsId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  const subjectName = entries[0]?.lesson?.scheduleSlot?.groupSubject?.subject?.name || 'Предмет'
  const types = ['LAB', 'TEST', 'PRACTICE', 'LECTURE']
  const grouped = types.map(type => ({ type, entries: entries.filter(e => e.lesson?.type === type) })).filter(g => g.entries.length > 0)

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Назад</Button>
      <Typography.Title level={3} style={{ marginBottom: 20 }}>{subjectName}</Typography.Title>

      {grouped.length === 0 && labs.length === 0 && <Empty description="Данных нет" />}

      <Row gutter={[16, 16]}>
        {grouped.map(({ type, entries: typeEntries }) => {
          const graded = typeEntries.filter(e => e.grade !== null)
          const avg = graded.length
            ? (graded.reduce((s, e) => s + (e.grade ?? 0), 0) / graded.length).toFixed(1)
            : '—'
          return (
            <Col xs={24} md={12} key={type}>
              <Card
                size="small"
                title={<Tag color={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Tag>}
                extra={<span style={{ fontSize: 13, color: '#888' }}>Средний: <strong>{avg}</strong></span>}
              >
                {typeEntries.map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <div style={{ fontSize: 13 }}>{dayjs(e.lesson?.date).format('DD.MM.YYYY')}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{e.lesson?.topic || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {e.grade !== null && (
                        <strong style={{ fontSize: 16, color: e.grade >= 4 ? '#52c41a' : '#ff4d4f' }}>{e.grade}</strong>
                      )}
                      {e.grade === null && e.status === 'ABSENT' && <Tag color="red">Н</Tag>}
                      {e.grade === null && e.status === 'LATE' && <Tag color="orange">О</Tag>}
                      {e.grade === null && e.status === 'PRESENT' && <span style={{ color: '#ccc' }}>—</span>}
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          )
        })}
      </Row>

      {labs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={4}>Лабораторные работы</Typography.Title>
          <Row gutter={[16, 16]}>
            {labs.map(lab => {
              const isOverdue = lab.dueDate && new Date(lab.dueDate) < new Date()
              return (
                <Col xs={24} md={12} key={lab.id}>
                  <Card size="small" hoverable onClick={() => navigate(`/student/lab/${lab.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Typography.Text strong>{lab.title}</Typography.Text>
                        {lab.isTeam && <Tag color="purple" style={{ marginLeft: 8, fontSize: 11 }}>Командная</Tag>}
                        {lab.dueDate && (
                          <div style={{ fontSize: 12, marginTop: 4, color: isOverdue ? '#ff4d4f' : '#888' }}>
                            Дедлайн: {dayjs(lab.dueDate).format('DD.MM.YYYY')}
                            {isOverdue && ' ⚠️'}
                          </div>
                        )}
                      </div>
                      <Button type="link" size="small">Подробнее →</Button>
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      )}
    </div>
  )
}
