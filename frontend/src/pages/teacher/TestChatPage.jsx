import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

export default function TestChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [goalAchievement, setGoalAchievement] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [toc, setToc] = useState([]);
  const [input, setInput] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/test-session`),
    ]).then(async ([courseRes, sessionRes]) => {
      setCourse(courseRes.data);
      const existing = sessionRes.data.messages || [];
      setMessages(existing);
      setGoalAchievement(sessionRes.data.aiSummary?.goal_achievement ?? null);
      setAiSummary(sessionRes.data.aiSummary ?? null);
      if (courseRes.data.compiled_toc?.length) setToc(courseRes.data.compiled_toc);
      setLoading(false);
      if (existing.length === 0) {
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
    return () => {
      socket.off('analysis_complete');
      socket.off('quick_replies');
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant') {
      lastAssistantRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const streamMessage = async (body) => {
    setSending(true);
    setMessages(m => [...m, { role: 'assistant', content: '' }]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://49.12.195.247:5210/api/chat/${id}`, {
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
            setMessages(m => {
              const updated = [...m];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + payload.text,
              };
              return updated;
            });
          } else if (payload.done) {
            setMessages(payload.messages);
            setSending(false);
            if (!body.intro) inputRef.current?.focus();
          }
        }
      }
    } catch {
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = { role: 'assistant', content: 'Något gick fel. Försök igen.' };
        return updated;
      });
    } finally {
      setSending(false);
      if (!body.intro) inputRef.current?.focus();
    }
  };

  const clearSession = async () => {
    setClearing(true);
    try {
      await api.delete(`/courses/${id}/test-session`);
      setMessages([]);
      setQuickReplies([]);
      setGoalAchievement(null);
      setAiSummary(null);
      await streamMessage({ intro: true });
    } finally {
      setClearing(false);
    }
  };

  const sendMessage = async e => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setQuickReplies([]);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    await streamMessage({ message: msg });
  };

  const sendQuickReply = async (reply) => {
    if (sending) return;
    setQuickReplies([]);
    setMessages(m => [...m, { role: 'user', content: reply }]);
    await streamMessage({ message: reply });
  };

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
            <span className="text-xs text-blue-500 font-medium whitespace-nowrap">
              {aiSummary?.completed_sections?.length ?? 0}/{toc.length}
            </span>
          )}
          {messages.length > 0 && (
            <button onClick={clearSession} disabled={clearing} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50">
              Rensa
            </button>
          )}
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${goalAchievement ?? 0}%` }} />
        </div>
      </div>

      {/* Body: left panel + chat */}
      <div className="flex-1 flex min-h-0">

        {/* Left panel – wide screens */}
        <aside className="hidden sm:flex flex-col w-52 xl:w-72 border-r border-gray-200 bg-white overflow-y-auto p-5 gap-4 shrink-0">
          {toc.length > 0 ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kursinnehåll</p>
                  <span className="text-xs text-gray-400">
                    {(aiSummary?.completed_sections?.length ?? 0)}/{toc.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {toc.map((section, i) => {
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
                  })}
                </ul>
              </div>
              {aiSummary?.summary && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Läget just nu</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiSummary.summary}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center leading-relaxed pt-4">Börja chatta så analyseras förståelsen automatiskt.</p>
          )}
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                ref={msg.role === 'assistant' && i === messages.length - 1 ? lastAssistantRef : null}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs sm:max-w-lg md:max-w-2xl px-4 py-3 rounded-2xl text-sm md:text-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
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

          {quickReplies.length > 0 && (
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
              placeholder="Skriv din fråga..."
              disabled={sending}
              autoFocus
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm md:text-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Skicka
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
