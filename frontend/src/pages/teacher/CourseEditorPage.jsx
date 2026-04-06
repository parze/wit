import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';

export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Document upload
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  // Compile
  const [compiling, setCompiling] = useState(false);
  const [compiledMaterial, setCompiledMaterial] = useState(null);
  const [compiledAt, setCompiledAt] = useState(null);

  // AI quiz generation
  const [toc, setToc] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Quiz
  const [newQuestion, setNewQuestion] = useState({ question: '', options: ['', '', '', ''], correct_index: 0 });
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Instructions
  const [instructions, setInstructions] = useState([]);
  const [selectedInstructionId, setSelectedInstructionId] = useState('');
  const [enableQuickReplies, setEnableQuickReplies] = useState(false);

  // Clear test session
  const [clearingSession, setClearingSession] = useState(false);

  // Prompt inspector modal
  const [promptModal, setPromptModal] = useState(null); // { title, text }


  useEffect(() => {
    fetchCourse();
    fetchDocuments();
    fetchQuiz();
    api.get('/instructions').then(r => setInstructions(r.data)).catch(() => {});
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data);
      setSelectedInstructionId(data.instruction_id ? String(data.instruction_id) : '');
      setCompiledMaterial(data.compiled_material ?? null);
      setToc(Array.isArray(data.compiled_toc) ? data.compiled_toc : []);
      setEnableQuickReplies(data.enable_quick_replies ?? false);
    } catch {
      setError('Kunde inte hämta arbetsområde');
    } finally {
      setLoading(false);
    }
  };

  const saveInstruction = async (newId) => {
    try {
      await api.put(`/courses/${id}`, {
        title: course.title,
        description: course.description,
        instruction_id: newId || null,
      });
      setSelectedInstructionId(newId);
    } catch {
      setError('Kunde inte spara instruktion');
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

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get(`/courses/${id}/documents`);
      setDocuments(data);
    } catch {}
  };

  const fetchQuiz = async () => {
    try {
      const { data } = await api.get(`/courses/${id}/quiz`);
      setQuizQuestions(Array.isArray(data) ? data : []);
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
      // Reset test chat so next test uses the new material
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

  const generateQuizQuestions = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/courses/${id}/quiz/generate`, {});
      setQuizQuestions(q => [...q, ...data]);
    } catch (err) {
      setError(err.response?.data?.error || 'AI-generering misslyckades');
    } finally {
      setGenerating(false);
    }
  };

  const addQuizQuestion = async e => {
    e.preventDefault();
    setAddingQuestion(true);
    try {
      const payload = {
        question: newQuestion.question,
        options: newQuestion.options,
        correct_index: newQuestion.correct_index,
      };
      const { data } = await api.post(`/courses/${id}/quiz/questions`, payload);
      setQuizQuestions(q => [...q, data]);
      setNewQuestion({ question: '', options: ['', '', '', ''], correct_index: 0 });
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte lägga till fråga');
    } finally {
      setAddingQuestion(false);
    }
  };

  const deleteQuestion = async qId => {
    try {
      await api.delete(`/quiz/questions/${qId}`);
      setQuizQuestions(q => q.filter(qq => qq.id !== qId));
    } catch {}
  };

  const getSelectedInstruction = () => instructions.find(i => String(i.id) === String(selectedInstructionId));

  const buildCompilePrompt = () => {
    const instr = getSelectedInstruction();
    return instr?.compile_prompt || '(Ingen instruktion vald – använder standardprompt)';
  };

  const buildChatPrompt = () => {
    const instr = getSelectedInstruction();
    const base = instr?.chat_prompt || '(Ingen instruktion vald – använder standardprompt)';
    return base + '\n\n--- KURSMATERIAL ---\n[Det kompilerade kursmaterialet]';
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/teacher/courses')} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">{course?.title}</h2>
          <p className="text-xs text-gray-400">Arbetsområdeseditor</p>
        </div>
        <button
          onClick={() => navigate(`/teacher/courses/${id}/dashboard`)}
          className="text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg px-3 py-1.5"
        >
          Se dashboard →
        </button>
      </div>

      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setPromptModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">{promptModal.title}</h3>
              <button onClick={() => setPromptModal(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <pre className="flex-1 overflow-y-auto px-5 py-4 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">{promptModal.text}</pre>
          </div>
        </div>
      )}

      <div className="p-8 max-w-3xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Steg 1 – Instruktion */}
        {instructions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">1</div>
            <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-3">Instruktion</h3>
            <select
              value={selectedInstructionId}
              onChange={e => saveInstruction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Ingen instruktion</option>
              {instructions.map(instr => (
                <option key={instr.id} value={String(instr.id)}>
                  {instr.title}{instr.is_default ? ' (standard)' : ''}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={enableQuickReplies}
                onChange={e => saveQuickReplies(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Aktivera snabbsvar i chatten</span>
              <span className="text-xs text-gray-400">— AI föreslår svarsalternativ efter varje fråga</span>
            </label>
            </div>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-900">Förbered undervisningsmaterial</h3>
                <button
                  onClick={() => setPromptModal({ title: 'Systemprompt – Materialgenerering (Claude Opus)', text: buildCompilePrompt() })}
                  className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-300 flex items-center justify-center leading-none"
                  title="Visa prompt som skickas till AI"
                >i</button>
              </div>
              <button
                onClick={compileCourse}
                disabled={compiling || documents.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {compiling ? 'Förbereder...' : 'Förbered undervisningsmaterial'}
              </button>
              <div className="mt-4">
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

        {/* Steg 4 – Prov */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">4</div>
            <h3 className="font-semibold text-gray-900 self-center">Prov</h3>
          </div>

          {quizQuestions.length > 0 && (
            <div className="mb-4 space-y-3">
              {quizQuestions.map((q, i) => (
                <div key={q.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question}</p>
                      <div className="mt-1 space-y-0.5">
                        {q.options?.map((opt, j) => (
                          <p key={j} className={`text-xs ${j === q.correct_index ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                            {j === q.correct_index ? '✓' : '○'} {opt}
                          </p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-red-400 hover:text-red-600 text-xs ml-2"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI generation */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-purple-800 mb-2">Generera frågor med AI</p>
            {toc.length > 0 && (
              <p className="text-xs text-purple-600 mb-2">
                Täcker alla {toc.length} Moment – AI bestämmer antal (1–5) per Moment baserat på komplexitet
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateQuizQuestions}
                disabled={generating || !compiledMaterial}
                className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? 'Genererar...' : 'Generera med AI'}
              </button>
              {!compiledMaterial && (
                <span className="text-xs text-purple-500">Förbered material i steg 2 först</span>
              )}
            </div>
          </div>

          <form onSubmit={addQuizQuestion} className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Lägg till fråga</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newQuestion.question}
                onChange={e => setNewQuestion(q => ({ ...q, question: e.target.value }))}
                placeholder="Fråga..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                required
              />
              {newQuestion.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQuestion.correct_index === i}
                    onChange={() => setNewQuestion(q => ({ ...q, correct_index: i }))}
                    className="text-green-500"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const options = [...newQuestion.options];
                      options[i] = e.target.value;
                      setNewQuestion(q => ({ ...q, options }));
                    }}
                    placeholder={`Alternativ ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    required
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1 mb-2">Välj rätt svar med radioknappen</p>
            <button
              type="submit"
              disabled={addingQuestion}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {addingQuestion ? 'Lägger till...' : 'Lägg till fråga'}
            </button>
          </form>
        </div>

        {/* Steg 5 – Testa */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">5</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">Testa</h3>
                <button
                  onClick={() => setPromptModal({ title: 'Systemprompt – Chat-AI (Claude Sonnet)', text: buildChatPrompt() })}
                  className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-300 flex items-center justify-center leading-none"
                  title="Visa prompt som skickas till chat-AI"
                >i</button>
              </div>
              <p className="text-sm text-gray-400 mb-3">Upplev kursen som en elev – samma vy, samma AI.</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`/teacher/courses/${id}/teach`)}
                  disabled={!compiledMaterial}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Läs o lär
                </button>
                <button
                  onClick={() => navigate(`/teacher/courses/${id}/test-chat?mode=learn`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Lär mig
                </button>
                <button
                  onClick={() => navigate(`/teacher/courses/${id}/test-chat?mode=forhör`)}
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
