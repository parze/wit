import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser, clearAuth } from '../../lib/auth';
import { Sidebar } from '../teacher/StudentsPage';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [ownCourses, setOwnCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    Promise.all([
      api.get('/student/courses'),
      api.get('/courses'),
    ]).then(([enrolled, own]) => {
      setCourses(enrolled.data);
      setOwnCourses(own.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { data } = await api.post('/courses', form);
      setForm({ title: '', description: '' });
      setShowForm(false);
      navigate(`/student/courses/${data.id}/edit`);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skapa arbetsområde');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="courses" navigate={navigate} user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setSidebarOpen(true)} className="sm:hidden text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">Mina arbetsområden</h2>
        </div>

        {/* Enrolled courses */}
        {loading ? (
          <div className="text-gray-400 text-sm text-center py-8">Laddar...</div>
        ) : courses.length === 0 && ownCourses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p>Du har inga arbetsområden ännu</p>
          </div>
        ) : (
          <>
            {courses.length > 0 && (
              <div className="space-y-3 mb-8">
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

            {/* Own courses section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Egna arbetsområden</h3>
                <button
                  onClick={() => setShowForm(s => !s)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + Skapa nytt
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
              )}

              {showForm && (
                <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                      <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creating ? 'Skapar...' : 'Skapa'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setError(''); }}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {ownCourses.length === 0 ? (
                <p className="text-sm text-gray-400">Du har inte skapat några egna arbetsområden ännu.</p>
              ) : (
                <div className="space-y-3">
                  {ownCourses.map(course => (
                    <div
                      key={course.id}
                      onClick={() => navigate(`/student/courses/${course.id}/edit`)}
                      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <h4 className="font-semibold text-gray-900">{course.title}</h4>
                      {course.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
