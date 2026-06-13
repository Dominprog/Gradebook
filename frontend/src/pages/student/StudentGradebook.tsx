import { useEffect, useState } from 'react'
import { Typography, Tabs, Spin, Empty, Statistic, Row, Col, Card, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { DownloadOutlined, BarChartOutlined } from '@ant-design/icons'
import { getMyGroupSubjects } from '../../api/subjects'
import { getStudentJournal } from '../../api/journal'
import { GroupSubject, JournalEntry } from '../../types'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<string, string> = { ABSENT: '#ff4d4f', LATE: '#faad14', PRESENT: 'transparent' }
const STATUS_LABEL: Record<string, string> = { ABSENT: 'Н', LATE: 'О', PRESENT: '' }
const TYPE_LABEL: Record<string, string> = { LECTURE: 'Лекция', LAB: 'Лаб.', PRACTICE: 'Практика', TEST: 'Контр.' }

export default function StudentGradebook() {
  const [groupSubjects, setGroupSubjects] = useState<GroupSubject[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [activeGs, setActiveGs] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getMyGroupSubjects().then(r => {
      setGroupSubjects(r.data)
      if (r.data.length > 0) setActiveGs(r.data[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeGs) return
    getStudentJournal(activeGs).then(r => setEntries(r.data))
  }, [activeGs])

  const graded = entries.filter(e => e.grade !== null)
  const avg = graded.length ? (graded.reduce((s, e) => s + (e.grade ?? 0), 0) / graded.length).toFixed(1) : '—'

  const exportCSV = () => {
    const subjectName = groupSubjects.find(gs => gs.id === activeGs)?.subject?.name || 'журнал'
    const header = 'Дата,Тема,Тип,Оценка,Статус\n'
    const rows = entries.map(e => [
      dayjs(e.lesson?.date).format('DD.MM.YYYY'),
      e.lesson?.topic || '',
      TYPE_LABEL[e.lesson?.type || ''] || '',
      e.grade ?? '',
      STATUS_LABEL[e.status] || ''
    ].join(',')).join('\n')
    const csv = '\uFEFF' + header + rows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${subjectName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Мой журнал</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/student/charts')}>
            Графики
          </Button>
          {entries.length > 0 && (
            <Button icon={<DownloadOutlined />} onClick={exportCSV}>
              Экспорт CSV
            </Button>
          )}
        </div>
      </div>

      <Tabs
        activeKey={String(activeGs)}
        onChange={k => setActiveGs(Number(k))}
        items={groupSubjects.map(gs => ({ key: String(gs.id), label: gs.subject?.name }))}
        style={{ marginBottom: 16 }}
      />

      {entries.length === 0 && <Empty description="Занятий ещё не проводилось" />}

      {entries.length > 0 && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Средний балл" value={avg} valueStyle={{ color: '#1677ff', fontSize: 24 }} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Пропуски" value={entries.filter(e => e.status === 'ABSENT').length} valueStyle={{ color: '#ff4d4f', fontSize: 24 }} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Опоздания" value={entries.filter(e => e.status === 'LATE').length} valueStyle={{ color: '#faad14', fontSize: 24 }} />
              </Card>
            </Col>
          </Row>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Дата</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Тема</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Тип</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, width: 80 }}>Оценка</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, width: 80 }}>Посещ.</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>{dayjs(e.lesson?.date).format('DD.MM.YYYY')}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', color: '#555' }}>{e.lesson?.topic || '—'}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: '#888' }}>{TYPE_LABEL[e.lesson?.type || ''] || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 700, fontSize: 16, color: e.grade ? (e.grade >= 4 ? '#52c41a' : '#ff4d4f') : '#aaa' }}>
                      {e.grade ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 700 }}>
                      {e.status !== 'PRESENT' && (
                        <span style={{ color: STATUS_COLOR[e.status] }}>{STATUS_LABEL[e.status]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
