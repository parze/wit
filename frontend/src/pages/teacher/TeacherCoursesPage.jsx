import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import { Sidebar } from './StudentsPage';

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const basePath = user?.role === 'parent' ? '/parent' : '/child';

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data);
    } catch (err) {
      setError('Kunde inte hämta arbetsområden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data } = await api.post('/courses', {});
      navigate(`/parent/courses/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skapa arbetsområde');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="courses" navigate={navigate} user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 p-4 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSidebarOpen(true)} className="sm:hidden text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1">Mina arbetsområden</h2>
          <button
            onClick={handleCreate}
            className="hidden sm:inline-flex bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nytt arbetsområde
          </button>
        </div>
        <button
          onClick={handleCreate}
          className="sm:hidden w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mb-4"
        >
          + Nytt arbetsområde
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm">Laddar...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p>Inga arbetsområden ännu. Skapa ditt första!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                onClick={course.has_compiled_material ? undefined : () => navigate(`/parent/courses/${course.id}`)}
                className={`bg-white rounded-xl border border-gray-200 p-5 transition-all ${course.has_compiled_material ? '' : 'cursor-pointer hover:shadow-md hover:border-blue-200'}`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                {course.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                )}
                {course.has_compiled_material && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`${basePath}/courses/${course.id}/teach`); }}
                      className="bg-green-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Läs o lär
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`${basePath}/courses/${course.id}/test-chat?mode=learn`); }}
                      className="bg-blue-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Lär mig
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`${basePath}/courses/${course.id}/test-chat?mode=forhör`); }}
                      className="bg-purple-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      Förhör mig
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
