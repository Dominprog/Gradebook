import { useEffect, useState } from 'react'
import { Card, Typography, Tag, Row, Col, Spin, Empty } from 'antd'
import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { getSchedule } from '../../api/schedule'
import { ScheduleSlot } from '../../types'

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

export default function StudentHome() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSchedule().then(r => setSlots(r.data)).finally(() => setLoading(false))
  }, [])

  const jsDay = new Date().getDay()
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  const byDay = DAYS.map((day, index) => ({
    day,
    index,
    isToday: index === todayIndex,
    slots: slots.filter(s => s.dayOfWeek === index)
  })).filter(d => d.slots.length > 0)

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 20 }}>Моё расписание</Typography.Title>
      {byDay.length === 0 && <Empty description="Расписание ещё не настроено" />}
      <Row gutter={[16, 16]}>
        {byDay.map(({ day, index, isToday, slots: daySlots }) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              size="small"
              title={
                <span>
                  {day}
                  {isToday && <Tag color="blue" style={{ marginLeft: 8 }}>Сегодня</Tag>}
                </span>
              }
              style={{
                borderColor: isToday ? '#1677ff' : '#f0f0f0',
                boxShadow: isToday ? '0 0 0 1px #1677ff20' : undefined
              }}
            >
              {daySlots.map(slot => (
                <div key={slot.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{slot.groupSubject?.subject?.name}</div>
                  <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 12 }}>
                    <span><ClockCircleOutlined style={{ marginRight: 4 }} />{slot.startTime} – {slot.endTime}</span>
                    <span><EnvironmentOutlined style={{ marginRight: 4 }} />Ауд. {slot.room}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                    {slot.groupSubject?.teacher?.name}
                  </div>
                </div>
              ))}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
