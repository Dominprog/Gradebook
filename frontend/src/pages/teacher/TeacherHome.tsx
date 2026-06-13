import { useEffect, useState, useCallback } from 'react'
import {
  Card, Typography, Tag, Row, Col, Button, Modal, Form, Select,
  Input, Spin, Empty, message, Popconfirm, Tooltip
} from 'antd'
import {
  PlusOutlined, ClockCircleOutlined, EnvironmentOutlined,
  EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import { getSchedule, createSlot, updateSlot, deleteSlot } from '../../api/schedule'
import { getAllGroupSubjects } from '../../api/subjects'
import { ScheduleSlot, GroupSubject } from '../../types'

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const ROOM_RE = /^[А-ЯЁа-яёA-Za-z0-9][А-ЯЁа-яёA-Za-z0-9\-\.]*$/

const timeValidator = (_: unknown, value: string) => {
  if (!value) return Promise.reject(new Error('Укажите время'))
  if (!TIME_RE.test(value)) return Promise.reject(new Error('Формат ЧЧ:ММ — например 09:00 или 18:30'))
  return Promise.resolve()
}

const roomValidator = (_: unknown, value: string) => {
  if (!value || !value.trim()) return Promise.resolve()
  const v = value.trim()
  if (v.length > 15) return Promise.reject(new Error('Максимум 15 символов'))
  if (!ROOM_RE.test(v)) return Promise.reject(new Error('Только буквы, цифры и дефис (например: 101, А-201)'))
  return Promise.resolve()
}

export default function TeacherHome() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [groupSubjects, setGroupSubjects] = useState<GroupSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ScheduleSlot | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const jsDay = new Date().getDay()
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1

  const load = useCallback(async () => {
    try {
      const [s, gs] = await Promise.all([getSchedule(), getAllGroupSubjects()])
      setSlots(s.data)
      setGroupSubjects(gs.data)
    } catch {
      message.error('Ошибка загрузки расписания')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditTarget(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (slot: ScheduleSlot) => {
    setEditTarget(slot)
    form.setFieldsValue({
      groupSubjectId: slot.groupSubjectId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    form.resetFields()
    setEditTarget(null)
  }

  const handleSubmit = async (values: {
    groupSubjectId: number; dayOfWeek: number
    startTime: string; endTime: string; room: string
  }) => {
    const [sh, sm] = values.startTime.split(':').map(Number)
    const [eh, em] = values.endTime.split(':').map(Number)
    if (sh * 60 + sm >= eh * 60 + em) {
      message.error('Время начала должно быть раньше времени окончания')
      return
    }
    setSaving(true)
    try {
      if (editTarget) {
        await updateSlot(editTarget.id, {
          dayOfWeek: values.dayOfWeek,
          startTime: values.startTime,
          endTime: values.endTime,
          room: values.room?.trim() || ''
        })
        message.success('Слот обновлён')
      } else {
        await createSlot({
          groupSubjectId: values.groupSubjectId,
          dayOfWeek: values.dayOfWeek,
          startTime: values.startTime,
          endTime: values.endTime,
          room: values.room?.trim() || ''
        })
        message.success('Слот добавлен')
      }
      closeModal()
      load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await deleteSlot(id)
      setSlots(prev => prev.filter(s => s.id !== id))
      message.success('Слот удалён')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error || 'Ошибка при удалении')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>
  )

  const byDay = DAYS.map((day, index) => ({
    day, index,
    isToday: index === todayIndex,
    slots: slots.filter(s => s.dayOfWeek === index).sort((a, b) => a.startTime.localeCompare(b.startTime))
  })).filter(d => d.slots.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Моё расписание</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Добавить слот</Button>
      </div>

      {byDay.length === 0 && <Empty description="Расписание не настроено. Нажмите «Добавить слот»." />}

      <Row gutter={[16, 16]}>
        {byDay.map(({ day, index, isToday, slots: daySlots }) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>{day} {isToday && <Tag color="blue" style={{ marginLeft: 6 }}>Сегодня</Tag>}</span>}
              style={{ borderColor: isToday ? '#1677ff' : '#f0f0f0', boxShadow: isToday ? '0 0 0 2px #e6f4ff' : undefined }}
            >
              {daySlots.map((slot, idx) => (
                <div key={slot.id} style={{ padding: '10px 0', borderBottom: idx < daySlots.length - 1 ? '1px solid #f5f5f5' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{slot.groupSubject?.subject?.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Группа: {slot.groupSubject?.group?.name}</div>
                      <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 12 }}>
                        <span><ClockCircleOutlined style={{ marginRight: 4 }} />{slot.startTime}–{slot.endTime}</span>
                        {slot.room && <span><EnvironmentOutlined style={{ marginRight: 4 }} />Ауд. {slot.room}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginLeft: 8, flexShrink: 0 }}>
                      <Tooltip title="Редактировать">
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(slot)} style={{ color: '#1677ff' }} />
                      </Tooltip>
                      <Popconfirm
                        title="Удалить слот расписания?"
                        description={<span style={{ color: '#ff4d4f', fontSize: 12 }}>Все занятия и оценки<br />будут удалены!</span>}
                        onConfirm={() => handleDelete(slot.id)}
                        okText="Удалить"
                        cancelText="Отмена"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Удалить">
                          <Button size="small" type="text" icon={<DeleteOutlined />} loading={deletingId === slot.id} danger />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        open={modalOpen}
        title={editTarget ? 'Редактировать слот расписания' : 'Добавить слот в расписание'}
        onCancel={closeModal}
        onOk={form.submit}
        okText={editTarget ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {!editTarget && (
            <Form.Item name="groupSubjectId" label="Предмет и группа" rules={[{ required: true, message: 'Выберите предмет и группу' }]}>
              <Select placeholder="Выберите предмет и группу" showSearch filterOption={(input, option) => String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                {groupSubjects.map(gs => (
                  <Select.Option key={gs.id} value={gs.id}>{gs.subject?.name} — {gs.group?.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {editTarget && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6f8fa', borderRadius: 6, fontSize: 13, color: '#555' }}>
              📚 {editTarget.groupSubject?.subject?.name} — {editTarget.groupSubject?.group?.name}
            </div>
          )}
          <Form.Item name="dayOfWeek" label="День недели" rules={[{ required: true, message: 'Выберите день недели' }]}>
            <Select placeholder="Выберите день">
              {DAYS.map((d, i) => <Select.Option key={i} value={i}>{d}</Select.Option>)}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startTime" label="Начало" rules={[{ required: true }, { validator: timeValidator }]} extra="Формат: ЧЧ:ММ">
                <Input placeholder="09:00" maxLength={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Окончание" rules={[{ required: true }, { validator: timeValidator }]} extra="Формат: ЧЧ:ММ">
                <Input placeholder="10:30" maxLength={5} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="room" label="Аудитория" rules={[{ validator: roomValidator }]} extra="Например: 101, А-201, Б304 (не обязательно)">
            <Input placeholder="101" maxLength={15} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
