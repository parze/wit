import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const goalColor = score => {
  if (score >= 70) return 'bg-green-100 text-green-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const statusLabel = status => {
  if (status === 'completed') return 'Klar';
  if (status === 'in_progress') return 'Pågår';
  return 'Ej påbörjad';
};

const statusColor = status => {
  if (status === 'completed') return 'text-green-600';
  if (status === 'in_progress') return 'text-blue-600';
  return 'text-gray-400';
};

export default function DashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/teacher/courses/${id}/progress`)
      .then(r => setData(r.data))
      .catch(() => setError('Kunde inte hämta data'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Laddar...</div>;

  const studentsProgress = data?.studentsProgress || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/teacher/courses/${id}`)} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            {data?.course && <p className="text-gray-500 text-sm">{data.course.title}</p>}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        {studentsProgress.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👩‍🎓</div>
            <p>Inga elever inskrivna ännu</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Elev</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stjärnor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">AI-sammanfattning</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Måluppfyllnad</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsProgress.map(({ student, status, stars, aiSummary }) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-400">{student.email}</div>
                      </td>
                      <td className={`px-4 py-3 font-medium ${statusColor(status)}`}>
                        {statusLabel(status)}
                      </td>
                      <td className="px-4 py-3">
                        {stars > 0 ? (
                          <span>{'⭐'.repeat(Math.min(stars, 5))}{stars > 5 ? ` (${stars})` : ''}</span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {aiSummary?.summary
                          ? <span className="text-gray-600 text-xs line-clamp-2">{aiSummary.summary}</span>
                          : <span className="text-gray-300">–</span>}
                      </td>
                      <td className="px-4 py-3">
                        {aiSummary?.goalAchievement != null ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${goalColor(aiSummary.goalAchievement)}`}>
                            {aiSummary.goalAchievement}%
                          </span>
                        ) : <span className="text-gray-300">–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
