import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';

export default function StudentsPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', gender: '', birth_year: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    api.get('/children')
      .then(r => setChildren(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const { data } = await api.post('/children', {
        ...form,
        birth_year: form.birth_year ? parseInt(form.birth_year) : undefined,
      });
      setChildren(s => [...s, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', username: '', password: '', gender: '', birth_year: '' });
      setShowForm(false);
      setSuccess(`${data.name} skapad!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skapa barn');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async id => {
    if (!confirm('Ta bort barn?')) return;
    try {
      await api.delete(`/children/${id}`);
      setChildren(s => s.filter(st => st.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte ta bort barn');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="children" navigate={navigate} user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="sm:hidden text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Barn</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowForm(s => !s)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Nytt barn
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">{success}</div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Skapa nytt barn</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Användarnamn</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Födelseår</label>
                <input
                  type="number"
                  value={form.birth_year}
                  onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="t.ex. 2015"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kön</label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Välj...</option>
                  <option value="pojke">Pojke</option>
                  <option value="flicka">Flicka</option>
                  <option value="annat">Annat</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Skapar...' : 'Skapa barn'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Avbryt
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm">Laddar...</div>
        ) : children.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👤</div>
            <p>Inga barn ännu — skapa ditt första barn!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Namn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Användarnamn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kön</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Födelseår</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Skapad</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {children.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.username}</td>
                    <td className="px-4 py-3 text-gray-500">{s.gender || '–'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.birth_year || '–'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(s.created_at).toLocaleDateString('sv-SE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
