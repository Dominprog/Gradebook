import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import useAuthStore from '../store/auth.store'
import { login } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth, user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    navigate(user.role === 'TEACHER' ? '/teacher/home' : '/student/home', { replace: true })
    return null
  }

  const handleFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError('')
    try {
      const res = await login(values.email, values.password)
      setAuth(res.data.user, res.data.token)
      navigate(res.data.user.role === 'TEACHER' ? '/teacher/home' : '/student/home', { replace: true })
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
          <Typography.Title level={3} style={{ margin: 0 }}>Электронный журнал</Typography.Title>
          <Typography.Text type="secondary">Войдите в свой аккаунт</Typography.Text>
        </div>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
        <Form layout="vertical" onFinish={handleFinish} size="large">
          <Form.Item name="email" rules={[{ required: true, message: 'Введите email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Войти
          </Button>
        </Form>
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>Тестовые аккаунты:</div>
          <div>👨‍🏫 teacher@mail.com / teacher123</div>
          <div>👩‍🎓 alice@mail.com / student123</div>
        </div>
      </Card>
    </div>
  )
}
