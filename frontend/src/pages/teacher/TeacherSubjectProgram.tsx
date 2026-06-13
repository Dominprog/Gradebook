import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Card, Modal, Form, Input, Select, DatePicker, Upload, Switch, Space, message, Spin, Tag } from 'antd'
import { PlusOutlined, ArrowLeftOutlined, UploadOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons'
import { getLabs, createLab, updateLab, createTeam } from '../../api/labs'
import { getGroupSubjectById } from '../../api/subjects'
import { getGroupStudents } from '../../api/users'
import { LabWork, GroupSubject, User } from '../../types'
import dayjs from 'dayjs'

export default function TeacherSubjectProgram() {
  const { groupSubjectId } = useParams<{ groupSubjectId: string }>()
  const navigate = useNavigate()
  const gsId = Number(groupSubjectId)

  const [labs, setLabs] = useState<LabWork[]>([])
  const [gs, setGs] = useState<GroupSubject | null>(null)
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [editingLab, setEditingLab] = useState<LabWork | null>(null)
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)
  const [materialsFile, setMaterialsFile] = useState<File | null>(null)
  const [labForm] = Form.useForm()
  const [teamForm] = Form.useForm()

  const load = () => {
    getLabs(gsId).then(r => setLabs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([getLabs(gsId), getGroupSubjectById(gsId)])
      .then(([labsRes, gsRes]) => {
        setLabs(labsRes.data)
        setGs(gsRes.data)
        if (gsRes.data.groupId) {
          return getGroupStudents(gsRes.data.groupId)
        }
      })
      .then(studRes => { if (studRes) setStudents(studRes.data) })
      .finally(() => setLoading(false))
  }, [gsId])

  const resetLabModal = () => {
    setLabModalOpen(false)
    setEditingLab(null)
    setMaterialsFile(null)
    labForm.resetFields()
  }

  const handleLabSubmit = async (values: { title: string; description?: string; dueDate?: dayjs.Dayjs; isTeam?: boolean }) => {
    const fd = new FormData()
    fd.append('groupSubjectId', String(gsId))
    fd.append('title', values.title)
    if (values.description) fd.append('description', values.description)
    if (values.dueDate) fd.append('dueDate', values.dueDate.toISOString())
    fd.append('isTeam', String(values.isTeam || false))
    if (materialsFile) fd.append('materials', materialsFile)

    try {
      if (editingLab) {
        await updateLab(editingLab.id, fd)
        message.success('Обновлено')
      } else {
        await createLab(fd)
        message.success('Создано')
      }
      resetLabModal()
      load()
    } catch {
      message.error('Ошибка сохранения')
    }
  }

  const openEdit = (lab: LabWork) => {
    setEditingLab(lab)
    labForm.setFieldsValue({
      title: lab.title,
      description: lab.description,
      dueDate: lab.dueDate ? dayjs(lab.dueDate) : null,
      isTeam: lab.isTeam
    })
    setMaterialsFile(null)
    setLabModalOpen(true)
  }

  const handleCreateTeam = async (values: { studentIds: number[] }) => {
    if (!selectedLabId) return
    try {
      await createTeam(selectedLabId, values.studentIds)
      message.success('Команда создана')
      setTeamModalOpen(false)
      teamForm.resetFields()
      load()
    } catch {
      message.error('Ошибка создания команды')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Программа: {gs?.subject?.name} — {gs?.group?.name}
        </Typography.Title>
      </div>

      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingLab(null); setLabModalOpen(true) }} style={{ marginBottom: 20 }}>
        Добавить работу
      </Button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {labs.map(lab => {
          const isOverdue = lab.dueDate && new Date(lab.dueDate) < new Date()
          return (
            <Card key={lab.id} size="small" style={{ borderLeft: `4px solid ${lab.isTeam ? '#722ed1' : '#1677ff'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Typography.Text strong>{lab.title}</Typography.Text>
                    {lab.isTeam && <Tag color="purple">Командная</Tag>}
                  </div>
                  {lab.description && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lab.description}</Typography.Text>
                  )}
                  {lab.dueDate && (
                    <div style={{ fontSize: 12, marginTop: 6, color: isOverdue ? '#ff4d4f' : '#888' }}>
                      📅 Дедлайн: {dayjs(lab.dueDate).format('DD.MM.YYYY')} {isOverdue && '⚠️'}
                    </div>
                  )}
                  {lab.materialsUrl && (
                    <Button size="small" icon={<FileTextOutlined />} href={lab.materialsUrl} target="_blank" style={{ marginTop: 8 }}>
                      Материалы / ТЗ
                    </Button>
                  )}
                  {lab.isTeam && lab.teams && lab.teams.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {lab.teams.map(team => (
                        <div key={team.id} style={{ display: 'inline-block', background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 6, padding: '2px 10px', marginRight: 6, marginTop: 4, fontSize: 13 }}>
                          {team.members.map(m => m.student?.name).join(' + ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Space direction="vertical" size={4}>
                  <Button size="small" onClick={() => openEdit(lab)}>Изменить</Button>
                  {lab.isTeam && (
                    <Button size="small" icon={<TeamOutlined />} onClick={() => { setSelectedLabId(lab.id); setTeamModalOpen(true) }}>
                      + Команда
                    </Button>
                  )}
                  <Button size="small" type="primary" ghost onClick={() => navigate(`/teacher/lab-submissions/${lab.id}`)}>
                    Сдачи
                  </Button>
                </Space>
              </div>
            </Card>
          )
        })}
        {labs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8, border: '1px dashed #d9d9d9', color: '#aaa' }}>
            Работ нет. Нажмите «Добавить работу».
          </div>
        )}
      </div>

      <Modal
        open={labModalOpen}
        title={editingLab ? 'Редактировать работу' : 'Добавить работу'}
        onCancel={resetLabModal}
        onOk={labForm.submit}
        okText="Сохранить"
        cancelText="Отмена"
        width={520}
        destroyOnClose
      >
        <Form form={labForm} layout="vertical" onFinish={handleLabSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Лабораторная работа №1" />
          </Form.Item>
          <Form.Item name="description" label="Задание / описание">
            <Input.TextArea rows={3} placeholder="Опишите задание..." />
          </Form.Item>
          <Form.Item name="dueDate" label="Дедлайн">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" showTime={{ format: 'HH:mm' }} />
          </Form.Item>
          <Form.Item name="isTeam" label="Командная работа" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>ТЗ / Материалы (файл)</label>
            <Upload
              beforeUpload={file => { setMaterialsFile(file); return false }}
              onRemove={() => setMaterialsFile(null)}
              maxCount={1}
              fileList={materialsFile ? [{ uid: '1', name: materialsFile.name, status: 'done' }] : []}
            >
              <Button icon={<UploadOutlined />}>Загрузить файл</Button>
            </Upload>
          </div>
        </Form>
      </Modal>

      <Modal
        open={teamModalOpen}
        title="Создать команду"
        onCancel={() => { setTeamModalOpen(false); teamForm.resetFields() }}
        onOk={teamForm.submit}
        okText="Создать"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={teamForm} layout="vertical" onFinish={handleCreateTeam} style={{ marginTop: 16 }}>
          <Form.Item name="studentIds" label="Студенты в команде" rules={[{ required: true, message: 'Выберите студентов' }]}>
            <Select mode="multiple" placeholder="Выберите студентов">
              {students.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
