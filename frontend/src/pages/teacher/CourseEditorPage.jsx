import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const LEARNING_MODES = [
  { id: 'procedural', label: 'Procedurellt', desc: 'Steg-för-steg, regler, rätt svar', icon: '⚙️' },
  { id: 'conceptual', label: 'Konceptuellt', desc: 'Orsak-verkan, samband, förståelse', icon: '🔗' },
  { id: 'discussion', label: 'Diskussion', desc: 'Resonemang, perspektiv, inga givna svar', icon: '💬' },
  { id: 'narrative', label: 'Berättande', desc: 'Berättelser, händelser, historik', icon: '📖' },
  { id: 'exploratory', label: 'Utforskande', desc: 'Hypotes → test → resultat', icon: '🔬' },
];

export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const basePath = user?.role === 'parent' ? '/parent' : '/child';
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Document upload
  const [uploading, setUploading] = useState(false);

  // Compile
  const [compiling, setCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compiledMaterial, setCompiledMaterial] = useState(null);
  const [compiledAt, setCompiledAt] = useState(null);

  // TOC
  const [toc, setToc] = useState([]);

  // Course title (for draft naming flow)
  const [courseTitle, setCourseTitle] = useState('');

  // Learning mode
  const [learningMode, setLearningMode] = useState(null);

  // Quick replies
  const [enableQuickReplies, setEnableQuickReplies] = useState(false);

  // TTS
  const [enableTts, setEnableTts] = useState(false);

  useEffect(() => {
    fetchCourse().then(saved => {
      if (saved) navigate(`${basePath}/courses`, { replace: true });
    });
    fetchDocuments();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data);
      setCourseTitle(data.title || '');
      setCompiledMaterial(data.compiled_material ?? null);
      setToc(Array.isArray(data.compiled_toc) ? data.compiled_toc : []);
      setEnableQuickReplies(data.enable_quick_replies ?? false);
      setEnableTts(data.enable_tts ?? false);
      setLearningMode(data.learning_mode ?? null);
      return !!data.title;
    } catch {
      setError('Kunde inte hämta arbetsområde');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveQuickReplies = async (value) => {
    setEnableQuickReplies(value);
    try {
      await api.put(`/courses/${id}`, {
        title: course.title,
        description: course.description,
        enable_quick_replies: value,
      });
    } catch {
      setError('Kunde inte spara inställning');
      setEnableQuickReplies(!value);
    }
  };

  const saveTts = async (value) => {
    setEnableTts(value);
    try {
      await api.put(`/courses/${id}`, {
        title: course.title,
        description: course.description,
        enable_tts: value,
      });
    } catch {
      setError('Kunde inte spara inställning');
      setEnableTts(!value);
    }
  };

  const saveLearningMode = async (newMode) => {
    setLearningMode(newMode);
    try {
      await api.put(`/courses/${id}`, {
        title: course.title,
        description: course.description,
        learning_mode: newMode,
      });
    } catch {
      setError('Kunde inte spara lärstil');
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get(`/courses/${id}/documents`);
      setDocuments(data);
    } catch {}
  };

  const uploadDocument = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post(`/courses/${id}/documents`, formData);
      setDocuments(d => [...d, data]);
    } catch (err) {
      setError(err.response?.data?.error || 'Uppladdning misslyckades');
    } finally {
      setUploading(false);
    }
  };

  const COMPILE_STEPS = [
    'Läser in läromedel...',
    'Analyserar innehåll...',
    'Strukturerar moment...',
    'Slutför...',
  ];

  const compileCourse = async () => {
    setCompiling(true);
    setCompileProgress(0);
    const timer = setInterval(() => {
      setCompileProgress(p => Math.min(p + 1, COMPILE_STEPS.length - 1));
    }, 4000);
    try {
      const { data: compileResult } = await api.post(`/courses/${id}/compile`);
      setCompileProgress(COMPILE_STEPS.length - 1);
      if (compileResult.suggested_title && !courseTitle) {
        setCourseTitle(compileResult.suggested_title);
      }
      const { data } = await api.get(`/courses/${id}`);
      setCompiledMaterial(data.compiled_material ?? null);
      setCompiledAt(new Date());
      setLearningMode(data.learning_mode ?? null);
      setToc(Array.isArray(data.compiled_toc) ? data.compiled_toc : []);
      await api.delete(`/courses/${id}/test-session`).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Kompilering misslyckades');
    } finally {
      clearInterval(timer);
      setCompiling(false);
    }
  };

  const deleteDocument = async docId => {
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(d => d.filter(doc => doc.id !== docId));
    } catch {}
  };

  const currentModeObj = LEARNING_MODES.find(m => m.id === learningMode);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(`${basePath}/courses`)} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{courseTitle || 'Nytt arbetsområde'}</h2>
          <p className="text-xs text-gray-400">Arbetsområdeseditor</p>
        </div>
        {user?.role === 'parent' && course?.title && (
          <button
            onClick={() => navigate(`/parent/courses/${id}/dashboard`)}
            className="hidden sm:block text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg px-3 py-1.5"
          >
            Se dashboard →
          </button>
        )}
      </div>

      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {(!compiledMaterial || course?.title) && (<>
        {/* Steg 1 – Inställningar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">1</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-3">Inställningar</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableQuickReplies}
                  onChange={e => saveQuickReplies(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Aktivera snabbsvar i chatten</span>
                <span className="text-xs text-gray-400">— AI föreslår svarsalternativ efter varje fråga</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={enableTts}
                  onChange={e => saveTts(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Erbjud uppläsning</span>
                <span className="text-xs text-gray-400">— AI-chatten läser upp sina svar med röst. Om avstängt måste eleven läsa själv.</span>
              </label>
              <p className="text-xs text-gray-400 mt-3">Lärstilen väljs automatiskt när du förbereder materialet i steg 3.</p>
            </div>
          </div>
        </div>

        {/* Steg 2 – Ladda upp läromedel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">2</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-3">Ladda upp läromedel</h3>
              {documents.length > 0 && (
                <div className="mb-3 space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 truncate">{doc.original_name}</span>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-400 hover:text-red-600 text-sm ml-2"
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-gray-700 text-white hover:bg-gray-800'}`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) uploadDocument(file);
                    e.target.value = '';
                  }}
                />
                {uploading ? 'Laddar upp...' : '+ Lägg till fil'}
              </label>
              <p className="text-xs text-gray-400 mt-1">Stöder PDF, DOCX och TXT</p>
            </div>
          </div>
        </div>

        {/* Steg 3 – Förbered undervisningsmaterial */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">3</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-3">Förbered undervisningsmaterial</h3>
              {!compiling ? (
                <button
                  onClick={compileCourse}
                  disabled={documents.length === 0}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  Förbered undervisningsmaterial
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-700">{COMPILE_STEPS[compileProgress]}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${((compileProgress + 1) / COMPILE_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Learning mode display + override */}
              <div className="mt-4">
                {learningMode ? (
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500">Detekterad lärstil:</span>
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {currentModeObj?.icon} {currentModeObj?.label}
                    </span>
                    <select
                      value={learningMode}
                      onChange={e => saveLearningMode(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      title="Ändra lärstil manuellt"
                    >
                      {LEARNING_MODES.map(m => (
                        <option key={m.id} value={m.id}>{m.icon} {m.label} – {m.desc}</option>
                      ))}
                    </select>
                  </div>
                ) : compiledMaterial ? (
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-400 italic">Ingen lärstil detekterad</span>
                    <select
                      value=""
                      onChange={e => e.target.value && saveLearningMode(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="">Välj lärstil manuellt...</option>
                      {LEARNING_MODES.map(m => (
                        <option key={m.id} value={m.id}>{m.icon} {m.label} – {m.desc}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {compiledAt && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full inline-block mb-3">
                    Uppdaterad {compiledAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {compiledMaterial ? (
                  <div className="prose prose-sm max-w-none bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{compiledMaterial}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Inget material förberett ännu.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </>)}

        {/* Name & save — shown after compilation */}
        {compiledMaterial && !course?.title && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-3">Namnge arbetsområdet</h3>
            <input
              type="text"
              value={courseTitle}
              onChange={e => setCourseTitle(e.target.value)}
              placeholder="Ange namn..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <button
              onClick={async () => {
                if (!courseTitle.trim()) return;
                try {
                  await api.put(`/courses/${id}`, { title: courseTitle.trim(), description: course?.description });
                  navigate(`${basePath}/courses`);
                } catch {
                  setError('Kunde inte spara namn');
                }
              }}
              disabled={!courseTitle.trim()}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Skapa arbetsområde
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
