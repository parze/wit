import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, clearAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CoursesPage from './pages/CoursesPage';
import CourseEditorPage from './pages/teacher/CourseEditorPage';
import DashboardPage from './pages/teacher/DashboardPage';
import StudentsPage from './pages/teacher/StudentsPage';
import TeachMePage from './pages/teacher/TeachMePage';
import CoursePage from './pages/student/CoursePage';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  // Clear stale tokens with old roles (teacher/student)
  if (user.role !== 'parent' && user.role !== 'child') {
    clearAuth();
    return <Navigate to="/login" replace />;
  }
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  }
  return children;
}

function RootRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'parent' && user.role !== 'child') {
    clearAuth();
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'parent' ? '/parent/courses' : '/child/courses'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/parent/courses" element={
          <PrivateRoute role="parent"><CoursesPage /></PrivateRoute>
        } />
        <Route path="/parent/courses/:id" element={
          <PrivateRoute role="parent"><CourseEditorPage /></PrivateRoute>
        } />
        <Route path="/parent/courses/:id/dashboard" element={
          <PrivateRoute role="parent"><DashboardPage /></PrivateRoute>
        } />
        <Route path="/parent/courses/:id/test-chat" element={
          <PrivateRoute role="parent"><CoursePage /></PrivateRoute>
        } />
        <Route path="/parent/courses/:id/teach" element={
          <PrivateRoute role="parent"><TeachMePage /></PrivateRoute>
        } />
        <Route path="/parent/children" element={
          <PrivateRoute role="parent"><StudentsPage /></PrivateRoute>
        } />

        <Route path="/child/courses" element={
          <PrivateRoute role="child"><CoursesPage /></PrivateRoute>
        } />
        <Route path="/child/courses/:id" element={
          <PrivateRoute role="child"><CoursePage /></PrivateRoute>
        } />
        <Route path="/child/courses/:id/teach" element={
          <PrivateRoute role="child"><TeachMePage /></PrivateRoute>
        } />
        <Route path="/child/courses/:id/test-chat" element={
          <PrivateRoute role="child"><CoursePage /></PrivateRoute>
        } />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
