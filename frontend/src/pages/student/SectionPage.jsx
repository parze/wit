import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

export default function SectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [goalAchievement, setGoalAchievement] = useState(null);
  const [stars, setStars] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchSection();
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('analysis_complete', ({ goalAchievement }) =>
      setGoalAchievement(prev => Math.max(prev ?? 0, goalAchievement)));
    return () => socket.off('analysis_complete');
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

  const fetchSection = async () => {
    try {
      const { data } = await api.get(`/student/sections/${id}`);
      setSection(data);
      setGoalAchievement(data.aiSummary?.goal_achievement ?? null);
      setStars(data.stars ?? 0);
      setMessages(data.messages || []);
    } catch {
      setError('Kunde inte hämta avsnitt');
    } finally {
      setLoading(false);
    }
  };

  const completeSection = async () => {
    setCompleting(true);
    try {
      const { data } = await api.post(`/student/sections/${id}/complete`);
      setStars(data.stars);
      setGoalAchievement(0);
      setMessages([]);
      inputRef.current?.focus();
    } catch {
      setError('Kunde inte spara avklarat avsnitt');
    } finally {
      setCompleting(false);
    }
  };

  const sendMessage = async e => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    // Add empty assistant bubble immediately
    setMessages(m => [...m, { role: 'assistant', content: '' }]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg }),
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
        buffer = lines.pop(); // keep incomplete line
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
            inputRef.current?.focus();
          }
        }
      }
    } catch (err) {
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = { role: 'assistant', content: 'Något gick fel. Försök igen.' };
        return updated;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => navigate('/student/courses')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</button>
          <span className="text-sm font-medium text-gray-800 truncate flex-1">{section?.course_title}</span>
          {stars > 0 && <span className="text-sm mr-1">{'⭐'.repeat(stars)}</span>}
          {goalAchievement > 0 && <span className="text-xs text-blue-500 font-medium whitespace-nowrap">{goalAchievement}%</span>}
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${goalAchievement ?? 0}%` }} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
      )}

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              Hej! Ställ mig en fråga om kursmaterialet.
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              ref={msg.role === 'assistant' && i === messages.length - 1 ? lastAssistantRef : null}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-lg md:max-w-2xl px-4 py-3 rounded-2xl text-sm md:text-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm prose prose-sm prose-blue max-w-none'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : msg.content === '' ? (
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

        {goalAchievement >= 80 && (
          <div className="border-t border-gray-200 bg-white px-4 py-2">
            <button
              onClick={completeSection}
              disabled={completing}
              className="w-full bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {completing ? 'Sparar...' : '⭐ Jag är klar – börja om från början'}
            </button>
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
  );
}
