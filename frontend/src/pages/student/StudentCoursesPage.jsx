import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser, clearAuth } from '../../lib/auth';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    api.get('/student/courses')
      .then(r => setCourses(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Lärmig</h1>
          <p className="text-xs text-gray-400">{user?.name}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Logga ut</button>
      </div>

      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mina arbetsområden</h2>

        {loading ? (
          <div className="text-gray-400 text-sm text-center py-8">Laddar...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p>Du är inte inskriven i några arbetsområden ännu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => navigate(`/student/courses/${course.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden text-left hover:border-blue-200 hover:shadow-sm transition-all active:bg-gray-50"
              >
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                      {course.stars > 0 && (
                        <span className="text-sm">{'⭐'.repeat(Math.min(course.stars, 5))}</span>
                      )}
                      {course.goal_achievement > 0 && (
                        <span className="text-xs text-blue-500 font-medium">{course.goal_achievement}%</span>
                      )}
                    </div>
                  </div>
                  {course.goal_achievement > 0 && (
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-1 bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${course.goal_achievement}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
