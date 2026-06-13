import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography, Space, Avatar, Tag } from 'antd'
import { LogoutOutlined, CalendarOutlined, BookOutlined, UserOutlined, BarChartOutlined } from '@ant-design/icons'
import useAuthStore from '../store/auth.store'
import { getMyGroupSubjects } from '../api/subjects'
import { GroupSubject } from '../types'

const { Sider, Content, Header } = Layout

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [groupSubjects, setGroupSubjects] = useState<GroupSubject[]>([])

  useEffect(() => {
    getMyGroupSubjects().then(r => setGroupSubjects(r.data)).catch(() => {})
  }, [])

  const isTeacher = user?.role === 'TEACHER'

  const studentItems = [
    { key: '/student/home', icon: <CalendarOutlined />, label: 'Расписание' },
    { key: '/student/gradebook', icon: <BookOutlined />, label: 'Журнал' },
    { key: '/student/charts', icon: <BarChartOutlined />, label: 'Графики' },
    ...groupSubjects.map(gs => ({
      key: `/student/subject/${gs.id}`,
      label: gs.subject?.name || 'Предмет'
    }))
  ]

  const teacherItems = [
    { key: '/teacher/home', icon: <CalendarOutlined />, label: 'Расписание' },
    ...groupSubjects.map(gs => ({
      key: `/teacher/journal/${gs.id}`,
      label: `${gs.subject?.name} — ${gs.group?.name}`
    }))
  ]

  const menuItems = isTeacher ? teacherItems : studentItems
  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || ''

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0', position: 'fixed', height: '100vh', overflow: 'auto', zIndex: 100 }}
      >
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 15 }}>📚 Электронный журнал</Typography.Text>
          <div style={{ marginTop: 6 }}>
            <Tag color={isTeacher ? 'blue' : 'green'} style={{ fontSize: 11 }}>
              {isTeacher ? 'Преподаватель' : 'Студент'}
            </Tag>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 4 }}
        />
      </Sider>
      <Layout style={{ marginLeft: 240 }}>
        <Header style={{
          background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <Space>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: isTeacher ? '#1677ff' : '#52c41a' }} />
            <Typography.Text style={{ fontSize: 13 }}>{user?.name}</Typography.Text>
            <Button icon={<LogoutOutlined />} type="text" size="small" onClick={() => { clearAuth(); navigate('/login') }}>
              Выйти
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
