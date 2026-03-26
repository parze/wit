import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Ignore errors – always show confirmation
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Glömt lösenord?</h1>

        {submitted ? (
          <div>
            <p className="text-gray-600 text-sm mb-6">
              Om e-postadressen finns i systemet har vi skickat ett mejl med en återställningslänk.
              Kontrollera även skräpposten.
            </p>
            <Link to="/login" className="text-blue-600 text-sm font-medium hover:underline">
              Tillbaka till inloggning
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Skickar...' : 'Skicka återställningslänk'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Tillbaka till inloggning
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
