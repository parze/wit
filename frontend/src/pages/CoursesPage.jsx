import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getUser } from '../lib/auth';
import Sidebar from '../components/Sidebar';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const isParent = user?.role === 'parent';
  const endpoint = isParent ? '/courses' : '/child/courses';
  const basePath = isParent ? '/parent' : '/child';

  useEffect(() => {
    api.get(endpoint)
      .then(r => setCourses(r.data))
      .catch(() => setError('Kunde inte hämta arbetsområden'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      const { data } = await api.post('/courses', {});
      navigate(`/parent/courses/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skapa arbetsområde');
    }
  };

  const handleDelete = async (e, courseId) => {
    e.stopPropagation();
    if (!confirm('Vill du verkligen radera detta arbetsområde? All data raderas.')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte radera arbetsområde');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="courses" navigate={navigate} user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 p-4 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSidebarOpen(true)} className="sm:hidden text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1">Mina arbetsområden</h2>
          {isParent && (
            <button
              onClick={handleCreate}
              className="hidden sm:inline-flex bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Nytt arbetsområde
            </button>
          )}
        </div>
        {isParent && (
          <button
            onClick={handleCreate}
            className="sm:hidden w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mb-4"
          >
            + Nytt arbetsområde
          </button>
        )}

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
            <p>{isParent ? 'Inga arbetsområden ännu. Skapa ditt första!' : 'Du har inga arbetsområden ännu'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                onClick={
                  course.has_compiled_material
                    ? undefined
                    : isParent
                      ? () => navigate(`/parent/courses/${course.id}`)
                      : () => navigate(`/child/courses/${course.id}`)
                }
                className={`bg-white rounded-xl border border-gray-200 p-5 transition-all ${
                  course.has_compiled_material ? '' : 'cursor-pointer hover:shadow-md hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{course.description}</p>
                    )}
                  </div>
                  {isParent && (
                    <button
                      onClick={e => handleDelete(e, course.id)}
                      className="ml-2 p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Radera arbetsområde"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  {!isParent && (course.stars > 0 || course.goal_achievement > 0) && (
                    <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                      {course.stars > 0 && (
                        <span className="text-sm">{'⭐'.repeat(Math.min(course.stars, 5))}</span>
                      )}
                      {course.goal_achievement > 0 && (
                        <span className="text-xs text-blue-500 font-medium">{course.goal_achievement}%</span>
                      )}
                    </div>
                  )}
                </div>
                {!isParent && course.goal_achievement > 0 && (
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-1 bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${course.goal_achievement}%` }}
                    />
                  </div>
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
