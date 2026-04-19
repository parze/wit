import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TeacherCoursesPage from './pages/teacher/TeacherCoursesPage';
import CourseEditorPage from './pages/teacher/CourseEditorPage';
import DashboardPage from './pages/teacher/DashboardPage';
import StudentsPage from './pages/teacher/StudentsPage';
import ClassesPage from './pages/teacher/ClassesPage';
import TestChatPage from './pages/teacher/TestChatPage';
import TeachMePage from './pages/teacher/TeachMePage';
import StudentCoursesPage from './pages/student/StudentCoursesPage';
import CoursePage from './pages/student/CoursePage';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  }
  return children;
}

function RootRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher/courses' : '/student/courses'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/teacher/courses" element={
          <PrivateRoute role="teacher"><TeacherCoursesPage /></PrivateRoute>
        } />
        <Route path="/teacher/courses/:id" element={
          <PrivateRoute role="teacher"><CourseEditorPage /></PrivateRoute>
        } />
        <Route path="/teacher/courses/:id/dashboard" element={
          <PrivateRoute role="teacher"><DashboardPage /></PrivateRoute>
        } />
        <Route path="/teacher/courses/:id/test-chat" element={
          <PrivateRoute role="teacher"><TestChatPage /></PrivateRoute>
        } />
        <Route path="/teacher/courses/:id/teach" element={
          <PrivateRoute role="teacher"><TeachMePage /></PrivateRoute>
        } />
        <Route path="/teacher/students" element={
          <PrivateRoute role="teacher"><StudentsPage /></PrivateRoute>
        } />
        <Route path="/teacher/classes" element={
          <PrivateRoute role="teacher"><ClassesPage /></PrivateRoute>
        } />

        <Route path="/student/courses" element={
          <PrivateRoute role="student"><StudentCoursesPage /></PrivateRoute>
        } />
        <Route path="/student/courses/:id" element={
          <PrivateRoute role="student"><CoursePage /></PrivateRoute>
        } />
        <Route path="/student/courses/:id/edit" element={
          <PrivateRoute role="student"><CourseEditorPage /></PrivateRoute>
        } />
        <Route path="/student/courses/:id/test-chat" element={
          <PrivateRoute role="student"><TestChatPage /></PrivateRoute>
        } />
        <Route path="/student/courses/:id/teach" element={
          <PrivateRoute role="student"><TeachMePage /></PrivateRoute>
        } />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
