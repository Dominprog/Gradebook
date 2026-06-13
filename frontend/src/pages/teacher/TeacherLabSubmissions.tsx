import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Card, Modal, Form, Input, InputNumber, Space, message, Spin, Statistic, Row, Col } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, FileOutlined, DownloadOutlined, BarChartOutlined } from '@ant-design/icons'
import { getSubmissions, reviewSubmission } from '../../api/submissions'
import { getLab } from '../../api/labs'
import { LabWork, LabSubmission } from '../../types'
import dayjs from 'dayjs'

export default function TeacherLabSubmissions() {
  const { labId } = useParams<{ labId: string }>()
  const navigate = useNavigate()
  const labIdNum = Number(labId)

  const [lab, setLab] = useState<LabWork | null>(null)
  const [submissions, setSubmissions] = useState<LabSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewTarget, setReviewTarget] = useState<LabSubmission | null>(null)
  const [reviewForm] = Form.useForm()

  const load = () => {
    Promise.all([getLab(labIdNum), getSubmissions(labIdNum)])
      .then(([l, s]) => { setLab(l.data); setSubmissions(s.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [labIdNum])

  const handleReview = async (values: { grade: number; comment?: string }) => {
    if (!reviewTarget) return
    try {
      await reviewSubmission(reviewTarget.id, { grade: values.grade, comment: values.comment })
      message.success('Оценка выставлена')
      setReviewTarget(null)
      reviewForm.resetFields()
      load()
    } catch {
      message.error('Ошибка')
    }
  }

  const openReview = (sub: LabSubmission) => {
    setReviewTarget(sub)
    reviewForm.setFieldsValue({ grade: sub.grade, comment: sub.comment })
  }

  const exportCSV = () => {
    const header = 'Студент,Сдано,Оценка,Комментарий,Проверено\n'
    const rows = submissions.map(s => [
      s.student?.name,
      dayjs(s.submittedAt).format('DD.MM.YYYY HH:mm'),
      s.grade ?? '',
      (s.comment || '').replace(/,/g, ';'),
      s.reviewedAt ? dayjs(s.reviewedAt).format('DD.MM.YYYY') : ''
    ].join(',')).join('\n')
    const csv = '\uFEFF' + header + rows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `сдачи_${lab?.title || 'лаба'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>

  const checked = submissions.filter(s => s.reviewedAt).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Typography.Title level={3} style={{ margin: 0 }}>{lab?.title}</Typography.Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={8}><Card size="small"><Statistic title="Всего сдали" value={submissions.length} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Проверено" value={checked} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Ожидают" value={submissions.length - checked} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {lab?.groupSubject?.id && (
          <Button icon={<BarChartOutlined />} onClick={() => navigate(`/teacher/stats/${lab.groupSubject?.id}`)}>
            Статистика группы
          </Button>
        )}
        {submissions.length > 0 && (
          <Button icon={<DownloadOutlined />} onClick={exportCSV}>Экспорт CSV</Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {submissions.map(sub => (
          <Card key={sub.id} size="small" style={{ borderLeft: `4px solid ${sub.reviewedAt ? '#52c41a' : '#faad14'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{sub.student?.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>📤 {dayjs(sub.submittedAt).format('DD.MM.YYYY HH:mm')}</div>
                {sub.reviewedAt && <div style={{ fontSize: 12, color: '#888' }}>✅ {dayjs(sub.reviewedAt).format('DD.MM.YYYY')}</div>}
                {sub.grade !== null && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 18, color: sub.grade >= 7 ? '#52c41a' : sub.grade >= 5 ? '#faad14' : '#ff4d4f' }}>
                      {sub.grade}
                    </span>
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>/ 10</span>
                  </div>
                )}
                {sub.comment && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#555', padding: '6px 10px', background: '#f6ffed', borderRadius: 6 }}>
                    💬 {sub.comment}
                  </div>
                )}
              </div>
              <Space direction="vertical" size={4}>
                {sub.fileUrl && <Button size="small" icon={<FileOutlined />} href={sub.fileUrl} target="_blank">Файл</Button>}
                <Button size="small" type={sub.reviewedAt ? 'default' : 'primary'} icon={<CheckOutlined />} onClick={() => openReview(sub)}>
                  {sub.reviewedAt ? 'Переоценить' : 'Проверить'}
                </Button>
              </Space>
            </div>
          </Card>
        ))}
        {submissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8, border: '1px dashed #d9d9d9', color: '#aaa' }}>
            Никто ещё не сдал эту работу
          </div>
        )}
      </div>

      <Modal
        open={!!reviewTarget}
        title={`Проверить — ${reviewTarget?.student?.name}`}
        onCancel={() => { setReviewTarget(null); reviewForm.resetFields() }}
        onOk={reviewForm.submit}
        okText="Сохранить"
        cancelText="Отмена"
        width={420}
        destroyOnClose
      >
        {reviewTarget?.fileUrl && (
          <Button icon={<FileOutlined />} href={reviewTarget.fileUrl} target="_blank" style={{ marginBottom: 16 }}>
            Открыть решение
          </Button>
        )}
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item name="grade" label="Оценка (1–10)" rules={[{ required: true, message: 'Введите оценку' }]}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий для студента">
            <Input.TextArea rows={3} placeholder="Напишите комментарий..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
