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
  const basePath = user?.role === 'teacher' ? '/teacher' : '/student';
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Document upload
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  // Compile
  const [compiling, setCompiling] = useState(false);
  const [compiledMaterial, setCompiledMaterial] = useState(null);
  const [compiledAt, setCompiledAt] = useState(null);

  // TOC
  const [toc, setToc] = useState([]);

  // Learning mode
  const [learningMode, setLearningMode] = useState(null);

  // Quick replies
  const [enableQuickReplies, setEnableQuickReplies] = useState(false);

  // TTS
  const [enableTts, setEnableTts] = useState(false);

  // Clear test session
  const [clearingSession, setClearingSession] = useState(false);


  useEffect(() => {
    fetchCourse();
    fetchDocuments();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data);
      setCompiledMaterial(data.compiled_material ?? null);
      setToc(Array.isArray(data.compiled_toc) ? data.compiled_toc : []);
      setEnableQuickReplies(data.enable_quick_replies ?? false);
      setEnableTts(data.enable_tts ?? false);
      setLearningMode(data.learning_mode ?? null);
    } catch {
      setError('Kunde inte hämta arbetsområde');
    } finally {
      setLoading(false);
    }
  };

  const clearTestSession = async () => {
    setClearingSession(true);
    try {
      await api.delete(`/courses/${id}/test-session`);
    } catch {
      setError('Kunde inte rensa testsession');
    } finally {
      setClearingSession(false);
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

  const uploadDocument = async e => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      const { data } = await api.post(`/courses/${id}/documents`, formData);
      setDocuments(d => [...d, data]);
      setUploadFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Uppladdning misslyckades');
    } finally {
      setUploading(false);
    }
  };

  const compileCourse = async () => {
    setCompiling(true);
    try {
      await api.post(`/courses/${id}/compile`);
      const { data } = await api.get(`/courses/${id}`);
      setCompiledMaterial(data.compiled_material ?? null);
      setCompiledAt(new Date());
      setLearningMode(data.learning_mode ?? null);
      setToc(Array.isArray(data.compiled_toc) ? data.compiled_toc : []);
      await api.delete(`/courses/${id}/test-session`).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Kompilering misslyckades');
    } finally {
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
          <h2 className="font-semibold text-gray-900 truncate">{course?.title}</h2>
          <p className="text-xs text-gray-400">Arbetsområdeseditor</p>
        </div>
        {user?.role === 'teacher' && (
          <button
            onClick={() => navigate(`/teacher/courses/${id}/dashboard`)}
            className="text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg px-3 py-1.5"
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
              <form onSubmit={uploadDocument} className="flex gap-2 items-center">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => setUploadFile(e.target.files[0])}
                  className="text-sm text-gray-600 flex-1"
                  required
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {uploading ? 'Laddar upp...' : 'Ladda upp'}
                </button>
              </form>
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
              <button
                onClick={compileCourse}
                disabled={compiling || documents.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {compiling ? 'Förbereder...' : 'Förbered undervisningsmaterial'}
              </button>

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

        {/* Steg 4 – Testa */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">4</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Testa</h3>
              <p className="text-sm text-gray-400 mb-3">Upplev kursen som en elev – samma vy, samma AI.</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`${basePath}/courses/${id}/teach`)}
                  disabled={!compiledMaterial}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Läs o lär
                </button>
                <button
                  onClick={() => navigate(`${basePath}/courses/${id}/test-chat?mode=learn`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Lär mig
                </button>
                <button
                  onClick={() => navigate(`${basePath}/courses/${id}/test-chat?mode=forhör`)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Förhör mig
                </button>
                <button
                  onClick={clearTestSession}
                  disabled={clearingSession}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {clearingSession ? 'Rensar...' : 'Börja om'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
