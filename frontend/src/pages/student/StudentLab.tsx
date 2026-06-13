import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Card, Tag, Button, Upload, message, Descriptions, Spin, Empty, Alert } from 'antd'
import { UploadOutlined, ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { getLab } from '../../api/labs'
import { getSubmissions, createSubmission } from '../../api/submissions'
import { LabWork, LabSubmission } from '../../types'
import dayjs from 'dayjs'

export default function StudentLab() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lab, setLab] = useState<LabWork | null>(null)
  const [submission, setSubmission] = useState<LabSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const labId = Number(id)

  useEffect(() => {
    Promise.all([getLab(labId), getSubmissions(labId)])
      .then(([l, s]) => { setLab(l.data); setSubmission(s.data[0] || null) })
      .finally(() => setLoading(false))
  }, [labId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('labWorkId', String(labId))
    fd.append('file', file)
    try {
      const res = await createSubmission(fd)
      setSubmission(res.data)
      message.success('Файл загружен!')
    } catch {
      message.error('Ошибка при загрузке')
    } finally {
      setUploading(false)
    }
    return false
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>
  if (!lab) return <Empty description="Лабораторная не найдена" />

  const isOverdue = lab.dueDate && new Date(lab.dueDate) < new Date()

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Назад</Button>
      <Typography.Title level={3}>{lab.title}</Typography.Title>

      {isOverdue && <Alert type="warning" message="Дедлайн прошёл" style={{ marginBottom: 16 }} showIcon />}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card style={{ flex: '2 1 340px' }}>
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Предмет">{lab.groupSubject?.subject?.name}</Descriptions.Item>
            <Descriptions.Item label="Преподаватель">{lab.groupSubject?.teacher?.name}</Descriptions.Item>
            {lab.dueDate && (
              <Descriptions.Item label="Дедлайн">
                <span style={{ color: isOverdue ? '#ff4d4f' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                  {dayjs(lab.dueDate).format('DD.MM.YYYY HH:mm')}
                </span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Формат">
              {lab.isTeam ? <Tag color="purple">Командная работа</Tag> : <Tag>Индивидуальная</Tag>}
            </Descriptions.Item>
          </Descriptions>

          {lab.description && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Задание:</Typography.Text>
              <Typography.Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{lab.description}</Typography.Paragraph>
            </div>
          )}

          {lab.materialsUrl && (
            <Button icon={<DownloadOutlined />} href={lab.materialsUrl} target="_blank">
              Скачать материалы / ТЗ
            </Button>
          )}

          {lab.isTeam && lab.teams && lab.teams.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>Команды:</Typography.Text>
              {lab.teams.map(team => (
                <div key={team.id} style={{ marginTop: 8, padding: '8px 12px', background: '#f6f0ff', borderRadius: 8 }}>
                  {team.members.map(m => <Tag key={m.id} color="purple">{m.student?.name}</Tag>)}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Моё решение" style={{ flex: '1 1 280px' }}>
          {submission ? (
            <div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Сдано">{dayjs(submission.submittedAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
                {submission.grade !== null && (
                  <Descriptions.Item label="Оценка">
                    <strong style={{ fontSize: 22, color: submission.grade >= 4 ? '#52c41a' : '#ff4d4f' }}>
                      {submission.grade}
                    </strong>
                  </Descriptions.Item>
                )}
                {submission.reviewedAt && (
                  <Descriptions.Item label="Проверено">{dayjs(submission.reviewedAt).format('DD.MM.YYYY')}</Descriptions.Item>
                )}
              </Descriptions>

              {submission.comment && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#52c41a' }}>Комментарий преподавателя:</Typography.Text>
                  <div style={{ marginTop: 4 }}>{submission.comment}</div>
                </div>
              )}

              {submission.fileUrl && (
                <Button icon={<DownloadOutlined />} href={submission.fileUrl} target="_blank" style={{ marginTop: 12 }}>
                  Скачать моё решение
                </Button>
              )}

              <div style={{ marginTop: 16 }}>
                <Upload beforeUpload={file => { handleUpload(file); return false; }} showUploadList={false}>
                  <Button icon={<UploadOutlined />} loading={uploading} size="small">
                    Загрузить новую версию
                  </Button>
                </Upload>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ color: '#aaa', marginBottom: 16 }}>Решение ещё не загружено</div>
              <Upload beforeUpload={file => { handleUpload(file); return false; }} showUploadList={false}>
                <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                  Загрузить решение
                </Button>
              </Upload>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
