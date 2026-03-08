import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAPI } from '../api';
import { getAuthCredentials, getLastOpenedJournalId, setAuthCredentials } from '../utils/storage';
import type { UserCreate } from '../types';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [username, setUsername] = useState('');
  const [keyphrase, setKeyphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const creds = await getAuthCredentials();
      if (creds && creds.username && creds.keyphrase) {
        try {
          await UserAPI.getUser(creds.username, creds.keyphrase);
          const lastJournal = await getLastOpenedJournalId();
          if (lastJournal) {
            navigate(`/journals/${lastJournal}`);
          } else {
            navigate('/journals');
          }
        } catch (err) {
          console.error('Initial auth check failed:', err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !keyphrase) {
      setError('Both username and keyphrase are required.');
      return;
    }
    setError('');
    setLoading(true);
    setUserNotFound(false);

    try {
      await UserAPI.getUser(username, keyphrase);
      await setAuthCredentials({ username, keyphrase });
      navigate('/journals');
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 404)) {
        setUserNotFound(true);
      } else {
        setError(err.response?.data?.detail || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError('');
    setLoading(true);
    try {
      const newUser: UserCreate = { username, keyphrase };
      await UserAPI.createUser(newUser);
      await setAuthCredentials({ username, keyphrase });
      navigate('/journals');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !username) {
    return (
      <div className="flex items-center justify-center min-h-[500px] w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full px-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Scribe</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">Your cloud-based note-taking app</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white dark:text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
              placeholder="johndoe"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Keyphrase</label>
            <input
              type="password"
              value={keyphrase}
              onChange={(e) => setKeyphrase(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white dark:text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!userNotFound ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Continuing...' : 'Continue'}
            </button>
          ) : (
            <div className="space-y-4 pt-2 border-t border-zinc-300 dark:border-zinc-800">
              <p className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 text-center">User not found. Create a new account?</p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white dark:text-black dark:text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setUserNotFound(false)}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-zinc-200 dark:bg-zinc-800 text-white dark:text-black dark:text-white font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Retry Login
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
