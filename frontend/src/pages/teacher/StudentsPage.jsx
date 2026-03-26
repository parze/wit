import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser, clearAuth } from '../../lib/auth';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', gender: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    api.get('/students')
      .then(r => setStudents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async e => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const { data } = await api.post('/students', form);
      setStudents(s => [...s, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', email: '', password: '', gender: '' });
      setShowForm(false);
      setSuccess(`${data.name} skapad!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skapa elev');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async id => {
    if (!confirm('Ta bort elev?')) return;
    try {
      await api.delete(`/students/${id}`);
      setStudents(s => s.filter(st => st.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte ta bort elev');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="students" navigate={navigate} user={user} />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Elever</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök elev..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
            <button
              onClick={() => setShowForm(s => !s)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Ny elev
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">{success}</div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Skapa ny elev</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-4 gap-3">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
                {creating ? 'Skapar...' : 'Skapa elev'}
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👤</div>
            <p>{search ? 'Inga elever matchar sökningen' : 'Inga elever ännu — skapa din första elev!'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Namn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-post</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kön</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registrerad</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.email}</td>
                    <td className="px-4 py-3 text-gray-500">{s.gender || '–'}</td>
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

export function Sidebar({ active, navigate, user }) {
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { key: 'courses', label: 'Mina kurser', path: '/teacher/courses' },
    { key: 'classes', label: 'Klasser', path: '/teacher/classes' },
    { key: 'students', label: 'Elever', path: '/teacher/students' },
    { key: 'instructions', label: 'Instruktioner', path: '/teacher/instructions' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Lärmig</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === item.key
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
