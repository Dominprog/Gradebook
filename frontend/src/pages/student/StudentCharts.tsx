import { useEffect, useState } from 'react'
import { Typography, Card, Row, Col, Spin, Empty, Select, Progress, Statistic } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { getMyGroupSubjects } from '../../api/subjects'
import { getStudentJournal } from '../../api/journal'
import { GroupSubject, JournalEntry } from '../../types'
import dayjs from 'dayjs'

const TYPE_COLOR: Record<string, string> = { LECTURE: '#1677ff', LAB: '#722ed1', PRACTICE: '#52c41a', TEST: '#f5222d' }
const TYPE_LABEL: Record<string, string> = { LECTURE: 'Лекции', LAB: 'Лабораторные', PRACTICE: 'Практики', TEST: 'Контрольные' }

function MiniBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 12, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.5s' }} />
      </div>
      <span style={{ minWidth: 28, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function GradeTimeline({ entries }: { entries: JournalEntry[] }) {
  const graded = entries.filter(e => e.grade !== null).slice(-20)
  if (graded.length === 0) return <div style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>Нет оценок</div>

  const maxHeight = 140
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: maxHeight, padding: '0 4px' }}>
        {graded.map((e, i) => {
          const g = e.grade ?? 0
          const h = Math.round((g / 10) * maxHeight)
          const color = g >= 7 ? '#52c41a' : g >= 5 ? '#faad14' : '#ff4d4f'
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color }}>{g}</div>
              <div title={`${dayjs(e.lesson?.date).format('DD.MM')} — ${g}`}
                style={{ width: '100%', height: h, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.4s', opacity: 0.85 }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {graded.map((e, i) => (
          <div key={i} style={{ flex: 1, fontSize: 9, color: '#aaa', textAlign: 'center', overflow: 'hidden' }}>
            {dayjs(e.lesson?.date).format('DD.MM')}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6 }}>
        Последние {graded.length} оценок
      </div>
    </div>
  )
}

export default function StudentCharts() {
  const navigate = useNavigate()
  const [groupSubjects, setGroupSubjects] = useState<GroupSubject[]>([])
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [selectedGs, setSelectedGs] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyGroupSubjects().then(async r => {
      setGroupSubjects(r.data)
      const all: JournalEntry[] = []
      for (const gs of r.data) {
        const res = await getStudentJournal(gs.id)
        all.push(...res.data)
      }
      setAllEntries(all)
      if (r.data.length > 0) setSelectedGs(r.data[0].id)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  const filteredEntries = selectedGs ? allEntries.filter(e => e.lesson?.scheduleSlot?.groupSubject?.id === selectedGs) : allEntries

  const graded = allEntries.filter(e => e.grade !== null)
  const overallAvg = graded.length ? (graded.reduce((s, e) => s + (e.grade ?? 0), 0) / graded.length) : 0
  const totalAbsent = allEntries.filter(e => e.status === 'ABSENT').length
  const totalLate = allEntries.filter(e => e.status === 'LATE').length
  const attendance = allEntries.length > 0 ? Math.round(((allEntries.length - totalAbsent) / allEntries.length) * 100) : 100

  const subjectStats = groupSubjects.map(gs => {
    const gsEntries = allEntries.filter(e => e.lesson?.scheduleSlot?.groupSubject?.id === gs.id)
    const gsGraded = gsEntries.filter(e => e.grade !== null)
    const avg = gsGraded.length ? gsGraded.reduce((s, e) => s + (e.grade ?? 0), 0) / gsGraded.length : 0
    return { gs, avg: Math.round(avg * 10) / 10, count: gsGraded.length }
  })

  const typeStats = ['LAB', 'TEST', 'PRACTICE', 'LECTURE'].map(type => {
    const typeEntries = filteredEntries.filter(e => e.lesson?.type === type && e.grade !== null)
    const avg = typeEntries.length ? typeEntries.reduce((s, e) => s + (e.grade ?? 0), 0) / typeEntries.length : 0
    return { type, avg: Math.round(avg * 10) / 10, count: typeEntries.length }
  }).filter(t => t.count > 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Typography.Title level={3} style={{ margin: 0 }}>Графики успеваемости</Typography.Title>
      </div>

      {allEntries.length === 0 && <Empty description="Нет данных для отображения" />}

      {allEntries.length > 0 && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Средний балл" value={overallAvg.toFixed(1)} valueStyle={{ color: '#1677ff', fontSize: 28 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Посещаемость" value={attendance} suffix="%" valueStyle={{ color: attendance >= 80 ? '#52c41a' : '#ff4d4f', fontSize: 28 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Пропусков" value={totalAbsent} valueStyle={{ color: '#ff4d4f', fontSize: 28 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Опозданий" value={totalLate} valueStyle={{ color: '#faad14', fontSize: 28 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Средний балл по предметам" size="small">
                {subjectStats.length === 0 && <div style={{ color: '#aaa', padding: 12 }}>Нет оценок</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                  {subjectStats.map(({ gs, avg, count }) => (
                    <div key={gs.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{gs.subject?.name}</span>
                        <span style={{ color: '#888', fontSize: 12 }}>{count} оценок</span>
                      </div>
                      <MiniBar
                        value={avg}
                        color={avg >= 7 ? '#52c41a' : avg >= 5 ? '#faad14' : avg > 0 ? '#ff4d4f' : '#d9d9d9'}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                title="Динамика оценок"
                size="small"
                extra={
                  <Select
                    size="small"
                    value={selectedGs}
                    onChange={setSelectedGs}
                    style={{ minWidth: 130 }}
                  >
                    {groupSubjects.map(gs => (
                      <Select.Option key={gs.id} value={gs.id}>{gs.subject?.name}</Select.Option>
                    ))}
                  </Select>
                }
              >
                <GradeTimeline entries={filteredEntries} />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Посещаемость" size="small">
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '8px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress type="circle" percent={attendance} size={100}
                      strokeColor={attendance >= 80 ? '#52c41a' : attendance >= 60 ? '#faad14' : '#ff4d4f'}
                      format={p => <span style={{ fontSize: 16, fontWeight: 700 }}>{p}%</span>}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>Посещаемость</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#888' }}>Присутствовал</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{allEntries.length - totalAbsent}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#888' }}>Пропустил</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}>{totalAbsent}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#888' }}>Опоздал</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14' }}>{totalLate}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            {typeStats.length > 0 && (
              <Col xs={24} md={12}>
                <Card title="По типу занятий" size="small">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                    {typeStats.map(({ type, avg, count }) => (
                      <div key={type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                          <span style={{ color: TYPE_COLOR[type] }}>{TYPE_LABEL[type]}</span>
                          <span style={{ color: '#888', fontSize: 12 }}>{count} оценок</span>
                        </div>
                        <MiniBar value={avg} color={TYPE_COLOR[type]} />
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}
    </div>
  )
}
