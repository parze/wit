import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';

export default function HjalplararePage() {
  const navigate = useNavigate();
  const user = getUser();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // null = list view, object = edit view
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', system_prompt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data } = await api.get('/ai-teachers');
      setTeachers(data);
    } catch {
      setError('Kunde inte hämta hjälplärare');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    const def = teachers.find(t => t.is_default);
    setForm({ name: '', system_prompt: def?.system_prompt || '' });
    setSelected(null);
    setIsNew(true);
    setError('');
  };

  const openEdit = (teacher) => {
    setForm({ name: teacher.name, system_prompt: teacher.system_prompt });
    setSelected(teacher);
    setIsNew(false);
    setError('');
  };

  const closeForm = () => {
    setSelected(null);
    setIsNew(false);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Namn krävs');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const { data } = await api.post('/ai-teachers', form);
        setTeachers(t => [...t, data]);
      } else {
        const { data } = await api.put(`/ai-teachers/${selected.id}`, form);
        setTeachers(t => t.map(x => x.id === data.id ? data : x));
      }
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher) => {
    if (!confirm(`Ta bort "${teacher.name}"?`)) return;
    try {
      await api.delete(`/ai-teachers/${teacher.id}`);
      setTeachers(t => t.filter(x => x.id !== teacher.id));
      if (selected?.id === teacher.id) closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte ta bort');
    }
  };

  const showingForm = isNew || (selected && !selected.is_default);
  const showingReadOnly = selected && selected.is_default;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="hjalplarare" navigate={navigate} user={user} />
      <div className="flex-1 p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Hjälplärare</h2>
          {!showingForm && !showingReadOnly && (
            <button
              onClick={openNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Ny hjälplärare
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form: new or edit */}
        {(showingForm || showingReadOnly) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {isNew ? 'Ny hjälplärare' : selected.is_default ? 'Standard-lärare (skrivskyddad)' : `Redigera: ${selected.name}`}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
              {showingReadOnly ? (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{selected.name}</p>
              ) : (
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="T.ex. Strikt lärare"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Systemprompt</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: 400 }}>
                <Editor
                  height="400px"
                  language="markdown"
                  theme="vs-dark"
                  value={showingReadOnly ? selected.system_prompt : form.system_prompt}
                  onChange={val => !showingReadOnly && setForm(f => ({ ...f, system_prompt: val || '' }))}
                  options={{
                    readOnly: !!showingReadOnly,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              {!showingReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
              )}
              <button
                onClick={closeForm}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                {showingReadOnly ? 'Stäng' : 'Avbryt'}
              </button>
              {!isNew && !showingReadOnly && (
                <button
                  onClick={() => handleDelete(selected)}
                  className="ml-auto text-red-500 hover:text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Ta bort
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-gray-400 text-sm">Laddar...</p>
        ) : (
          <div className="space-y-2">
            {teachers.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between hover:border-blue-300 cursor-pointer"
                onClick={() => openEdit(t)}
              >
                <div className="flex items-center gap-2">
                  {t.is_default && (
                    <span className="text-gray-400" title="Default-lärare (kan ej tas bort)">🔒</span>
                  )}
                  <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                  {t.is_default && (
                    <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">standard</span>
                  )}
                </div>
                {!t.is_default && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(t); }}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Ta bort
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
