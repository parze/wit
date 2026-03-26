import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function CourseQuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/student/courses/${courseId}/quiz`)
      .then(r => {
        setQuestions(r.data);
        setAnswers(new Array(r.data.length).fill(null));
      })
      .catch(() => setError('Kunde inte hämta quiz-frågor'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const selectAnswer = i => {
    const updated = [...answers];
    updated[currentQuestion] = i;
    setAnswers(updated);
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/student/courses/${courseId}/quiz`, { answers });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Kunde inte skicka in quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Laddar...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/student/courses')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</button>
          <span className="text-sm font-medium text-gray-800 flex-1">Kurs-quiz</span>
          {!result && questions.length > 0 && (
            <span className="text-xs text-purple-500 font-medium">
              {currentQuestion + 1} / {questions.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
      )}

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {questions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📝</div>
            <p>Inga quiz-frågor finns för den här kursen</p>
            <button
              onClick={() => navigate('/student/courses')}
              className="mt-4 text-blue-500 text-sm hover:underline"
            >
              Tillbaka till kurser
            </button>
          </div>
        ) : result ? (
          <div>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{result.score === result.total ? '🎉' : '📝'}</div>
              <p className="text-3xl font-bold text-gray-900">{result.score}/{result.total}</p>
              <p className="text-gray-500 mt-1">{Math.round((result.score / result.total) * 100)}% rätt</p>
            </div>

            <div className="space-y-3">
              {result.results?.map((r, i) => (
                <div key={i} className={`p-4 rounded-2xl ${r.isCorrect ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                  <p className="font-medium text-gray-800 text-sm">{r.question}</p>
                  <p className={`text-xs mt-1 ${r.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {r.isCorrect ? 'Rätt' : `Fel – rätt svar: ${r.options?.[r.correct]}`}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/student/courses')}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Tillbaka till kurser
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="font-semibold text-gray-900 mb-5">{questions[currentQuestion]?.question}</p>
            <div className="space-y-2">
              {questions[currentQuestion]?.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={`w-full text-left px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    answers[currentQuestion] === i
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(q => q + 1)}
                  disabled={answers[currentQuestion] === null}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Nästa fråga →
                </button>
              ) : (
                <button
                  onClick={submitQuiz}
                  disabled={answers.some(a => a === null) || submitting}
                  className="w-full bg-purple-600 text-white py-4 rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-40 transition-colors"
                >
                  {submitting ? 'Skickar...' : 'Skicka in quiz'}
                </button>
              )}
            </div>

            {answers.some(a => a !== null) && (
              <div className="mt-3 flex gap-1 justify-center">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentQuestion ? 'bg-blue-500' : answers[i] !== null ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
