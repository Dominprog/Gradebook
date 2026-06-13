import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import useAuthStore from './store/auth.store'
import { getMe } from './api/auth'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import StudentHome from './pages/student/StudentHome'
import StudentGradebook from './pages/student/StudentGradebook'
import StudentSubject from './pages/student/StudentSubject'
import StudentLab from './pages/student/StudentLab'
import StudentCharts from './pages/student/StudentCharts'
import TeacherHome from './pages/teacher/TeacherHome'
import TeacherJournal from './pages/teacher/TeacherJournal'
import TeacherSubjectProgram from './pages/teacher/TeacherSubjectProgram'
import TeacherLabSubmissions from './pages/teacher/TeacherLabSubmissions'
import TeacherStats from './pages/teacher/TeacherStats'

export default function App() {
  const { token, user, setAuth, clearAuth } = useAuthStore()
  const [loading, setLoading] = useState(!!token)

  useEffect(() => {
    if (!token) return
    getMe()
      .then(r => setAuth(r.data, token))
      .catch(() => clearAuth())
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/student/home" element={<StudentHome />} />
          <Route path="/student/gradebook" element={<StudentGradebook />} />
          <Route path="/student/subject/:id" element={<StudentSubject />} />
          <Route path="/student/lab/:id" element={<StudentLab />} />
          <Route path="/student/charts" element={<StudentCharts />} />
          <Route path="/teacher/home" element={<TeacherHome />} />
          <Route path="/teacher/journal/:groupSubjectId" element={<TeacherJournal />} />
          <Route path="/teacher/subject-program/:groupSubjectId" element={<TeacherSubjectProgram />} />
          <Route path="/teacher/lab-submissions/:labId" element={<TeacherLabSubmissions />} />
          <Route path="/teacher/stats/:groupSubjectId" element={<TeacherStats />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? (user.role === 'TEACHER' ? '/teacher/home' : '/student/home') : '/login'} replace />}
      />
    </Routes>
  )
}
