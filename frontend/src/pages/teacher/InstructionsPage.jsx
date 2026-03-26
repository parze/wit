import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import { Sidebar } from './StudentsPage';

export default function InstructionsPage() {
  const navigate = useNavigate();
  const user = getUser();

  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ title: '', compile_prompt: '', chat_prompt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchInstructions(); }, []);

  const fetchInstructions = async () => {
    try {
      const { data } = await api.get('/instructions');
      setInstructions(data);
    } catch {
      setError('Kunde inte hämta instruktioner');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({ title: '', compile_prompt: '', chat_prompt: '' });
    setSelected(null);
    setIsNew(true);
    setError('');
  };

  const openEdit = (instruction) => {
    setForm({ title: instruction.title, compile_prompt: instruction.compile_prompt || '', chat_prompt: instruction.chat_prompt || '' });
    setSelected(instruction);
    setIsNew(false);
    setError('');
  };

  const closeForm = () => { setSelected(null); setIsNew(false); setError(''); };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Titel krävs'); return; }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const { data } = await api.post('/instructions', form);
        setInstructions(i => [...i, data]);
      } else {
        const { data } = await api.put(`/instructions/${selected.id}`, form);
        setInstructions(i => i.map(x => x.id === data.id ? data : x));
      }
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (instruction) => {
    if (!confirm(`Ta bort "${instruction.title}"?`)) return;
    try {
      await api.delete(`/instructions/${instruction.id}`);
      setInstructions(i => i.filter(x => x.id !== instruction.id));
      if (selected?.id === instruction.id) closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte ta bort');
    }
  };

  const showingForm = isNew || selected;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="instructions" navigate={navigate} user={user} />
      <div className="flex-1 p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Instruktioner</h2>
          {!showingForm && (
            <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + Ny instruktion
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        {showingForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{isNew ? 'Ny instruktion' : `Redigera: ${selected.title}`}</h3>
              {selected?.is_default && <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">standard</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="T.ex. Strikt Socratisk metod"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt för materialgenerering
                <span className="ml-2 font-normal text-gray-400 text-xs">— skickas till Claude Opus när du förbereder undervisningsmaterial</span>
              </label>
              <textarea
                value={form.compile_prompt}
                onChange={e => setForm(f => ({ ...f, compile_prompt: e.target.value }))}
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt för chattundervisning
                <span className="ml-2 font-normal text-gray-400 text-xs">— skickas till Claude Sonnet som systemprompt (kursmaterialet läggs till automatiskt)</span>
              </label>
              <textarea
                value={form.chat_prompt}
                onChange={e => setForm(f => ({ ...f, chat_prompt: e.target.value }))}
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
              <button onClick={closeForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                Avbryt
              </button>
              {!isNew && !selected?.is_default && (
                <button onClick={() => handleDelete(selected)} className="ml-auto text-red-500 hover:text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50">
                  Ta bort
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Laddar...</p>
        ) : (
          <div className="space-y-2">
            {instructions.map(instr => (
              <div
                key={instr.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between hover:border-blue-300 cursor-pointer"
                onClick={() => openEdit(instr)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{instr.title}</span>
                  {instr.is_default && <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">standard</span>}
                </div>
                {!instr.is_default && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(instr); }} className="text-red-400 hover:text-red-600 text-xs">
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
