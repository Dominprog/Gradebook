import { useState, useEffect } from 'react'
import { Modal, Input, Form } from 'antd'

interface GradeModalProps {
  open: boolean
  studentName: string
  initialGrade: number | null
  onConfirm: (grade: number | null) => void
  onCancel: () => void
}

export default function GradeModal({ open, studentName, initialGrade, onConfirm, onCancel }: GradeModalProps) {
  const [value, setValue] = useState(initialGrade !== null ? String(initialGrade) : '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setValue(initialGrade !== null ? String(initialGrade) : '')
      setError('')
    }
  }, [open, initialGrade])

  const handleChange = (raw: string) => {
    // Allow only digits and max 2 chars
    const cleaned = raw.replace(/\D/g, '').slice(0, 2)
    setValue(cleaned)
    setError('')
  }

  const handleOk = () => {
    if (value.trim() === '') {
      onConfirm(null)
      return
    }
    const num = Number(value)
    if (!Number.isInteger(num) || num < 1 || num > 10) {
      setError('Введите целое число от 1 до 10 или оставьте пустым')
      return
    }
    setError('')
    onConfirm(num)
  }

  return (
    <Modal
      open={open}
      title={`Оценка — ${studentName}`}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Сохранить"
      cancelText="Отмена"
      width={320}
      destroyOnClose
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Оценка от 1 до 10 (оставьте пустым — удалить оценку)"
          validateStatus={error ? 'error' : ''}
          help={error || 'Допустимые значения: 1, 2, 3 … 10'}
        >
          <Input
            autoFocus
            value={value}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleOk() }}
            placeholder="1 – 10"
            maxLength={2}
            style={{ fontSize: 22, textAlign: 'center', letterSpacing: 4 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
