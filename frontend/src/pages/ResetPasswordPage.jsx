import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Lösenorden matchar inte');
      return;
    }
    if (form.password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Något gick fel. Länken kan ha gått ut.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <p className="text-red-600 text-sm mb-4">Ogiltig länk.</p>
          <Link to="/login" className="text-blue-600 text-sm font-medium hover:underline">
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nytt lösenord</h1>

        {success ? (
          <div>
            <p className="text-gray-600 text-sm mb-6">
              Ditt lösenord har uppdaterats. Du kan nu logga in med ditt nya lösenord.
            </p>
            <Link
              to="/login"
              className="w-full block text-center bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition-colors"
            >
              Logga in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">Ange ditt nya lösenord.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nytt lösenord</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta lösenord</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sparar...' : 'Spara nytt lösenord'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
