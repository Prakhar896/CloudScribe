import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalAPI, UserAPI } from '../api';
import type { Journal, JournalCreate } from '../types';
import { clearAuthCredentials, getAuthCredentials } from '../utils/storage';
import { PlusIcon, ExitIcon, TrashIcon } from '@radix-ui/react-icons';
import ThemeToggle from '../components/ThemeToggle';

export default function Journals() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [username, setUsername] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchJournals();
    getAuthCredentials().then((creds) => {
      if (creds) setUsername(creds.username);
    });
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const data = await JournalAPI.getJournals();
      setJournals(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch journals');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      const newJournal: JournalCreate = { title: newTitle, description: newDescription };
      const created = await JournalAPI.createJournal(newJournal);
      setJournals([...journals, created]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create journal');
    }
  };

  const handleLogout = async () => {
    await clearAuthCredentials();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      await UserAPI.deleteUser();
      await clearAuthCredentials();
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete account');
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-zinc-950 text-black dark:text-white relative">
      <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-300 dark:border-zinc-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Journals</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">@{username}</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Create Journal"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Logout"
          >
            <ExitIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
            title="Delete Account"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {journals.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500 space-y-4">
            <p>No journals yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Create your first journal
            </button>
          </div>
        ) : (
          journals.map((journal) => (
            <div
              key={journal.id}
              onClick={() => navigate(`/journals/${journal.id}`)}
              className="group flex flex-col p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-colors"
            >
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-400 transition-colors">
                {journal.title}
              </h2>
              {journal.description && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{journal.description}</p>
              )}
              <div className="flex justify-between items-center mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{new Date(journal.created).toLocaleDateString()}</span>
                <span>{journal.notes?.length || 0} notes</span>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-lg border border-zinc-400 dark:border-zinc-700 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">New Journal</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
                  placeholder="e.g. Work Notes"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Description (Optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white resize-none h-20"
                  placeholder="A space for my daily tasks..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white text-sm font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirm Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-lg border border-zinc-400 dark:border-zinc-700 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2 text-red-400">Delete Account?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-5">
              Are you sure you want to delete your account? This action cannot be undone and all your journals and notes will be permanently lost.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-4 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white text-sm font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
