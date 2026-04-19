import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import { Sidebar } from './StudentsPage';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassBirthYear, setNewClassBirthYear] = useState('');
  const [editingBirthYear, setEditingBirthYear] = useState(false);
  const [birthYearInput, setBirthYearInput] = useState('');
  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [addStudentId, setAddStudentId] = useState('');
  const [addCourseId, setAddCourseId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    Promise.all([
      api.get('/classes'),
      api.get('/courses'),
      api.get('/students'),
    ]).then(([c, co, s]) => {
      setClasses(c.data);
      setCourses(co.data);
      setStudents(s.data);
      if (c.data.length > 0) setSelected(c.data[0]);
    }).finally(() => setLoading(false));
  }, []);

  const flash = (text, isError = false) => {
    if (isError) setError(text); else setMsg(text);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const createClass = async e => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const payload = { name: newClassName.trim() };
      if (newClassBirthYear) payload.birth_year = parseInt(newClassBirthYear);
      const { data } = await api.post('/classes', payload);
      setClasses(c => [...c, data]);
      setSelected(data);
      setNewClassName('');
      setNewClassBirthYear('');
    } catch (err) {
      flash(err.response?.data?.error || 'Fel', true);
    }
  };

  const saveBirthYear = async () => {
    if (!selected) return;
    try {
      const { data } = await api.put(`/classes/${selected.id}`, { birth_year: birthYearInput });
      const updated = classes.map(c => c.id === selected.id ? { ...c, birth_year: data.birth_year } : c);
      setClasses(updated);
      setSelected(updated.find(c => c.id === selected.id));
      setEditingBirthYear(false);
      flash('Födelseår sparat!');
    } catch (err) {
      flash(err.response?.data?.error || 'Fel', true);
    }
  };

  const deleteClass = async id => {
    if (!confirm('Ta bort klass?')) return;
    try {
      await api.delete(`/classes/${id}`);
      const updated = classes.filter(c => c.id !== id);
      setClasses(updated);
      setSelected(updated[0] || null);
    } catch {}
  };

  const addStudent = async e => {
    e.preventDefault();
    if (!selected) return;
    try {
      const payload = addStudentId
        ? { student_id: parseInt(addStudentId) }
        : { email: addStudentEmail };
      const { data } = await api.post(`/classes/${selected.id}/members`, payload);
      const updated = classes.map(c =>
        c.id === selected.id ? { ...c, members: [...(c.members || []), data] } : c
      );
      setClasses(updated);
      setSelected(updated.find(c => c.id === selected.id));
      setAddStudentEmail('');
      setAddStudentId('');
      flash('Elev tillagd!');
    } catch (err) {
      flash(err.response?.data?.error || 'Fel', true);
    }
  };

  const removeStudent = async studentId => {
    if (!selected) return;
    try {
      await api.delete(`/classes/${selected.id}/members/${studentId}`);
      const updated = classes.map(c =>
        c.id === selected.id
          ? { ...c, members: c.members.filter(m => m.id !== studentId) }
          : c
      );
      setClasses(updated);
      setSelected(updated.find(c => c.id === selected.id));
    } catch {}
  };

  const assignCourse = async e => {
    e.preventDefault();
    if (!selected || !addCourseId) return;
    try {
      await api.post(`/classes/${selected.id}/courses`, { course_id: parseInt(addCourseId) });
      const course = courses.find(c => c.id === parseInt(addCourseId));
      const updated = classes.map(c =>
        c.id === selected.id
          ? { ...c, courses: [...(c.courses || []), course] }
          : c
      );
      setClasses(updated);
      setSelected(updated.find(c => c.id === selected.id));
      setAddCourseId('');
      flash('Arbetsområde kopplat! Alla elever i klassen inskrivna.');
    } catch (err) {
      flash(err.response?.data?.error || 'Fel', true);
    }
  };

  const removeCourse = async courseId => {
    if (!selected) return;
    try {
      await api.delete(`/classes/${selected.id}/courses/${courseId}`);
      const updated = classes.map(c =>
        c.id === selected.id
          ? { ...c, courses: (c.courses || []).filter(co => co.id !== courseId) }
          : c
      );
      setClasses(updated);
      setSelected(updated.find(c => c.id === selected.id));
    } catch {}
  };

  const availableCourses = courses.filter(
    co => !(selected?.courses || []).find(c => c.id === co.id)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="classes" navigate={navigate} user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Class list — desktop: side panel, mobile: dropdown */}
      <div className="hidden sm:flex sm:w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Klasser</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {classes.map(cls => (
            <div
              key={cls.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 mb-1 cursor-pointer group ${
                selected?.id === cls.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => setSelected(cls)}
            >
              <div>
                <div className="text-sm font-medium">{cls.name}</div>
                <div className="text-xs text-gray-400">
                  {cls.members?.length || 0} elever
                  {cls.birth_year ? ` · f. ${cls.birth_year}` : ''}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteClass(cls.id); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs"
              >✕</button>
            </div>
          ))}

          <form onSubmit={createClass} className="mt-3">
            <input
              type="text"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              placeholder="Ny klass..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1"
            />
            <input
              type="number"
              value={newClassBirthYear}
              onChange={e => setNewClassBirthYear(e.target.value)}
              placeholder="Födelseår, t.ex. 2012"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1"
            />
            <button type="submit" className="w-full text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg py-1.5">
              + Skapa klass
            </button>
          </form>
        </div>
      </div>

      {/* Class detail */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {/* Mobile: hamburger + class selector */}
        <div className="sm:hidden flex items-center gap-2 mb-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <select
            value={selected?.id || ''}
            onChange={e => {
              const cls = classes.find(c => c.id === parseInt(e.target.value));
              if (cls) setSelected(cls);
            }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Välj klass...</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name} ({cls.members?.length || 0} elever)</option>
            ))}
          </select>
        </div>
        {!selected ? (
          <div className="text-gray-400 text-center py-16">Välj eller skapa en klass</div>
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selected.name}{selected.birth_year ? ` (f. ${selected.birth_year})` : ''}
              </h2>
              {!editingBirthYear ? (
                <button
                  onClick={() => { setBirthYearInput(selected.birth_year || ''); setEditingBirthYear(true); }}
                  className="text-xs text-gray-400 hover:text-blue-600 border border-gray-200 rounded px-2 py-0.5"
                >
                  {selected.birth_year ? 'Ändra födelseår' : '+ Födelseår'}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={birthYearInput}
                    onChange={e => setBirthYearInput(e.target.value)}
                    placeholder="t.ex. 2012"
                    className="border border-gray-300 rounded px-2 py-0.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                  />
                  <button onClick={saveBirthYear} className="text-xs bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700">Spara</button>
                  <button onClick={() => setEditingBirthYear(false)} className="text-xs text-gray-400 hover:text-gray-600">Avbryt</button>
                </div>
              )}
            </div>

            {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">{msg}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

            {/* Members */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <h3 className="font-semibold text-gray-900 mb-3">Elever i klassen</h3>

              {(selected.members || []).length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">Inga elever ännu</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {selected.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{m.name}</span>
                        {m.gender && <span className="text-xs text-gray-500 ml-1.5">{m.gender}</span>}
                        <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                      </div>
                      <button
                        onClick={() => removeStudent(m.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >Ta bort</button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={addStudent}>
                <div className="flex gap-2">
                  <select
                    value={addStudentId}
                    onChange={e => { setAddStudentId(e.target.value); setAddStudentEmail(''); }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Välj elev från lista...</option>
                    {students
                      .filter(s => !(selected.members || []).find(m => m.id === s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))
                    }
                  </select>
                  <button type="submit" disabled={!addStudentId && !addStudentEmail}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                    Lägg till
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={addStudentEmail}
                    onChange={e => { setAddStudentEmail(e.target.value); setAddStudentId(''); }}
                    placeholder="Eller ange e-post direkt..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </div>

            {/* Courses */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Kopplade arbetsområden</h3>
              <p className="text-xs text-gray-400 mb-3">Alla elever i klassen skrivs automatiskt in i kopplade kurser.</p>

              {(selected.courses || []).length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">Inga kurser kopplade</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {selected.courses.map(co => (
                    <div key={co.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-800">{co.title}</span>
                      <button
                        onClick={() => removeCourse(co.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >Ta bort</button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={assignCourse} className="flex gap-2">
                <select
                  value={addCourseId}
                  onChange={e => setAddCourseId(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Välj kurs att koppla...</option>
                  {availableCourses.map(co => (
                    <option key={co.id} value={co.id}>{co.title}</option>
                  ))}
                </select>
                <button type="submit" disabled={!addCourseId}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  Koppla
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
