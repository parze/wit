import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

export default function TestChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [mode, setMode] = useState(searchParams.get('mode') === 'quiz' ? 'quiz' : 'learn');

  // Learn state
  const [messages, setMessages] = useState([]);
  const [goalAchievement, setGoalAchievement] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [toc, setToc] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);

  // Quiz state
  const [quizMessages, setQuizMessages] = useState([]);
  const [quizAnsweredSections, setQuizAnsweredSections] = useState([]);
  const [quizScore, setQuizScore] = useState(null);
  const quizIntroStartedRef = useRef(false);

  // Shared state
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const messagesEndRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/test-session`),
      api.get(`/courses/${id}/quiz-session`),
    ]).then(async ([courseRes, sessionRes, quizRes]) => {
      setCourse(courseRes.data);
      if (courseRes.data.compiled_toc?.length) setToc(courseRes.data.compiled_toc);

      const existing = sessionRes.data.messages || [];
      setMessages(existing);
      setGoalAchievement(sessionRes.data.aiSummary?.goal_achievement ?? null);
      setAiSummary(sessionRes.data.aiSummary ?? null);

      setQuizMessages(quizRes.data.quizMessages || []);
      setQuizAnsweredSections(quizRes.data.quizAnsweredSections || []);
      setQuizScore(quizRes.data.quizScore ?? null);

      setLoading(false);
      if (existing.length === 0 && searchParams.get('mode') !== 'quiz') {
        await streamMessage({ intro: true });
      }
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('analysis_complete', ({ goalAchievement, summary, reasons, currentSection, completedSections, toc: newToc }) => {
      setGoalAchievement(goalAchievement);
      setAiSummary({ goal_achievement: goalAchievement, summary, reasons, current_section: currentSection, completed_sections: completedSections });
      if (newToc?.length) setToc(newToc);
    });
    socket.on('quick_replies', ({ quickReplies }) => {
      setQuickReplies(quickReplies ?? []);
    });
    socket.on('quiz_progress', ({ quizScore: qs, quizAnsweredSections: qas, toc: newToc }) => {
      setQuizScore(qs);
      setQuizAnsweredSections(qas ?? []);
      if (newToc?.length) setToc(newToc);
    });
    return () => {
      socket.off('analysis_complete');
      socket.off('quick_replies');
      socket.off('quiz_progress');
    };
  }, []);

  // Scroll to latest message
  useEffect(() => {
    const active = mode === 'quiz' ? quizMessages : messages;
    if (active.length === 0) return;
    const last = active[active.length - 1];
    if (last.role === 'assistant') {
      lastAssistantRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, quizMessages, mode]);

  // Trigger quiz intro when switching to quiz tab for the first time
  useEffect(() => {
    if (mode !== 'quiz') return;
    if (loading) return;
    if (quizMessages.length > 0) return;
    if (quizIntroStartedRef.current) return;
    if (toc.length === 0) return;
    quizIntroStartedRef.current = true;
    streamMessage({ mode: 'quiz', intro: true });
  }, [mode, loading]);

  const streamMessage = async (body) => {
    const isQuiz = body.mode === 'quiz';
    setSending(true);
    if (isQuiz) {
      setQuizMessages(m => [...m, { role: 'assistant', content: '' }]);
    } else {
      setMessages(m => [...m, { role: 'assistant', content: '' }]);
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.text) {
            if (isQuiz) {
              setQuizMessages(m => {
                if (m.length === 0) return m;
                const updated = [...m];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + payload.text };
                return updated;
              });
            } else {
              setMessages(m => {
                if (m.length === 0) return m;
                const updated = [...m];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + payload.text };
                return updated;
              });
            }
          } else if (payload.done) {
            if (isQuiz) {
              setQuizMessages(payload.quizMessages);
            } else {
              setMessages(payload.messages);
            }
            setSending(false);
            if (!body.intro) inputRef.current?.focus();
          }
        }
      }
    } catch {
      const errMsg = { role: 'assistant', content: 'Något gick fel. Försök igen.' };
      if (isQuiz) {
        setQuizMessages(m => { const u = [...m]; u[u.length - 1] = errMsg; return u; });
      } else {
        setMessages(m => { const u = [...m]; u[u.length - 1] = errMsg; return u; });
      }
    } finally {
      setSending(false);
      if (!body.intro) inputRef.current?.focus();
    }
  };

  const resetBoth = async () => {
    setResetting(true);
    try {
      await api.delete(`/courses/${id}/test-session`);
      await api.delete(`/courses/${id}/quiz-session`).catch(() => {});
      setMessages([]);
      setQuickReplies([]);
      setGoalAchievement(null);
      setAiSummary(null);
      setQuizMessages([]);
      setQuizAnsweredSections([]);
      setQuizScore(null);
      quizIntroStartedRef.current = false;
      setMode('learn');
      await streamMessage({ intro: true });
    } finally {
      setResetting(false);
    }
  };

  const sendMessage = async e => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    if (mode === 'quiz') {
      setQuizMessages(m => [...m, { role: 'user', content: msg }]);
      await streamMessage({ message: msg, mode: 'quiz' });
    } else {
      setQuickReplies([]);
      setMessages(m => [...m, { role: 'user', content: msg }]);
      await streamMessage({ message: msg });
    }
  };

  const sendQuickReply = async (reply) => {
    if (sending) return;
    setQuickReplies([]);
    setMessages(m => [...m, { role: 'user', content: reply }]);
    await streamMessage({ message: reply });
  };

  // Derived quiz values
  const answeredMoments = quizAnsweredSections.map(s => s.moment);
  const currentQuestion = toc.find(m => !answeredMoments.includes(m)) || null;
  const quizDone = toc.length > 0 && quizAnsweredSections.length >= toc.length;

  const activeMessages = mode === 'quiz' ? quizMessages : messages;
  const activeProgress = mode === 'quiz' ? (quizScore ?? 0) : (goalAchievement ?? 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => navigate(`/teacher/courses/${id}`)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</button>
          <span className="text-sm font-medium text-gray-800 truncate flex-1">{course?.title}</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Testläge</span>
          {toc.length > 0 && (
            <span className={`text-xs font-medium whitespace-nowrap ${mode === 'quiz' ? 'text-purple-500' : 'text-blue-500'}`}>
              {mode === 'quiz'
                ? `${quizAnsweredSections.length}/${toc.length} frågor`
                : `${aiSummary?.completed_sections?.length ?? 0}/${toc.length}`}
            </span>
          )}
          <button
            onClick={resetBoth}
            disabled={resetting || sending}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 whitespace-nowrap"
          >
            {resetting ? 'Rensar...' : 'Reset båda chattar'}
          </button>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className={`h-1 transition-all duration-500 ${mode === 'quiz' ? 'bg-purple-500' : 'bg-blue-500'}`}
            style={{ width: `${activeProgress}%` }}
          />
        </div>
      </div>


      {/* Body: left panel + chat */}
      <div className="flex-1 flex min-h-0">

        {/* Left panel */}
        <aside className="hidden sm:flex flex-col w-52 xl:w-72 border-r border-gray-200 bg-white overflow-y-auto p-5 gap-4 shrink-0">
          {toc.length > 0 ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {mode === 'quiz' ? 'Provresultat' : 'Kursinnehåll'}
                  </p>
                  <span className="text-xs text-gray-400">
                    {mode === 'quiz'
                      ? `${quizAnsweredSections.length}/${toc.length}`
                      : `${(aiSummary?.completed_sections?.length ?? 0)}/${toc.length}`}
                  </span>
                </div>
                <ul className="space-y-2">
                  {toc.map((section, i) => {
                    if (mode === 'quiz') {
                      const answered = quizAnsweredSections.find(s => s.moment === section);
                      const isCurrent = !quizDone && section === currentQuestion;
                      const scorePercent = answered ? Math.round(answered.score * 100) : null;
                      return (
                        <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1.5 ${isCurrent ? 'bg-purple-50' : ''}`}>
                          <span className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                            answered
                              ? (answered.score >= 0.6 ? 'bg-green-500 text-white' : 'bg-orange-400 text-white')
                              : isCurrent ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {answered ? '✓' : i + 1}
                          </span>
                          <span className={answered ? 'text-gray-500' : isCurrent ? 'text-purple-700 font-medium' : 'text-gray-600'}>
                            {section}
                            {scorePercent !== null && (
                              <span className={`ml-1 text-xs font-semibold ${answered.score >= 0.6 ? 'text-green-600' : 'text-orange-500'}`}>
                                {scorePercent}%
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    } else {
                      const completed = aiSummary?.completed_sections?.includes(section);
                      const current = aiSummary?.current_section === section;
                      return (
                        <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1.5 ${current ? 'bg-blue-50' : ''}`}>
                          <span className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                            completed ? 'bg-green-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {completed ? '✓' : i + 1}
                          </span>
                          <span className={completed ? 'text-gray-400 line-through' : current ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                            {section}
                          </span>
                        </li>
                      );
                    }
                  })}
                </ul>

                {/* Quiz total score */}
                {mode === 'quiz' && quizAnsweredSections.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Totalpoäng</p>
                    <p className="text-2xl font-bold text-gray-800">{quizScore ?? 0}%</p>
                    {quizDone && <p className="text-xs text-purple-600 font-medium mt-0.5">Provet slutfört</p>}
                  </div>
                )}

                {/* Learn summary */}
                {mode === 'learn' && aiSummary?.summary && (
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Läget just nu</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiSummary.summary}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center leading-relaxed pt-4">Börja chatta så analyseras förståelsen automatiskt.</p>
          )}
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {activeMessages.map((msg, i) => (
              <div
                key={i}
                ref={msg.role === 'assistant' && i === activeMessages.length - 1 ? lastAssistantRef : null}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs sm:max-w-lg md:max-w-2xl px-4 py-3 rounded-2xl text-sm md:text-lg leading-relaxed ${
                  msg.role === 'user'
                    ? `${mode === 'quiz' ? 'bg-purple-600' : 'bg-blue-600'} text-white rounded-tr-sm`
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm prose prose-sm prose-blue max-w-none'
                }`}>
                  {msg.role === 'user' ? msg.content : msg.content === '' ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="dot-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="dot-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="dot-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {mode === 'learn' && quickReplies.length > 0 && (
            <div className="bg-white border-t border-gray-100 px-4 py-2 flex flex-wrap gap-2">
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => sendQuickReply(reply)}
                  disabled={sending}
                  className="text-sm px-3 py-1.5 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white px-4 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'quiz' ? 'Skriv ditt svar...' : 'Skriv din fråga...'}
              disabled={sending || (mode === 'quiz' && quizDone)}
              autoFocus
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || (mode === 'quiz' && quizDone)}
              className={`text-white px-5 py-3 rounded-xl text-sm md:text-lg font-medium disabled:opacity-50 transition-colors ${
                mode === 'quiz' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Skicka
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
