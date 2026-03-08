import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NoteAPI } from '../api';
import type { Note, NoteUpdate } from '../types';
import { ArrowLeftIcon, CopyIcon, CheckIcon, TrashIcon, Pencil1Icon } from '@radix-ui/react-icons';
import ThemeToggle from '../components/ThemeToggle';

export default function NoteDetail() {
  const { journalId, noteId } = useParams<{ journalId: string; noteId: string }>();
  const navigate = useNavigate();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');

  // Copy success state
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (journalId && noteId) {
      fetchNote(journalId, noteId);
    }
  }, [journalId, noteId]);

  const fetchNote = async (jId: string, nId: string) => {
    setLoading(true);
    try {
      const data = await NoteAPI.getNote(jId, nId);
      setNote(data);
      setEditTitle(data.title);
      setEditContent(data.content);
      setEditTagsInput(data.tags?.join(', ') || '');
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch note');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (note?.content) {
      navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!journalId || !noteId) return;
    try {
      await NoteAPI.deleteNote(journalId, noteId);
      navigate(`/journals/${journalId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete note');
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalId || !noteId || !editTitle || !editContent) return;

    try {
      const parsedTags = editTagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const updateData: NoteUpdate = {
        title: editTitle,
        content: editContent,
        tags: parsedTags,
      };

      const updatedNote = await NoteAPI.updateNote(journalId, noteId, updateData);
      setNote(updatedNote);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update note');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-white dark:bg-zinc-950 text-black dark:text-white p-6 text-center">
        <p className="text-red-500 mb-4">{error || 'Note not found'}</p>
        <button
          onClick={() => navigate(`/journals/${journalId}`)}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Back to Journal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-zinc-950 text-black dark:text-white">
      <header className="flex items-center p-4 border-b border-zinc-300 dark:border-zinc-800 shrink-0 gap-3">
        <button
          onClick={() => navigate(`/journals/${journalId}`)}
          className="p-2 hover:bg-zinc-200 dark:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-lg font-bold truncate">Note Detail</h1>
          <ThemeToggle />
        </div>
        {!isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-md transition-colors text-zinc-600 dark:text-zinc-300"
              title="Edit Note"
            >
              <Pencil1Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
              title="Delete Note"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="flex flex-col flex-1 p-4 space-y-4 overflow-hidden">
          <div className="shrink-0">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-white text-base"
              autoFocus
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-white resize-none text-sm leading-relaxed"
            />
          </div>
          <div className="shrink-0">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={editTagsInput}
              onChange={(e) => setEditTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-white text-xs"
            />
          </div>
          <div className="flex space-x-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(note.title);
                setEditContent(note.content);
                setEditTagsInput(note.tags?.join(', ') || '');
              }}
              className="flex-1 py-2 px-4 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white text-sm font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editTitle || !editContent}
              className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <main className="flex-1 overflow-y-auto p-5 relative">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{note.title}</h2>

          <div className="flex flex-wrap gap-2 mb-6">
            {note.tags?.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-400 dark:border-zinc-700">
                #{tag}
              </span>
            ))}
          </div>

          <div className="prose prose-invert max-w-none text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
            {note.content}
          </div>

          <div className="mt-8 pt-4 pb-20 border-t border-zinc-300 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 flex justify-between">
            <span>Created: {new Date(note.created).toLocaleString()}</span>
            {note.modified && <span>Updated: {new Date(note.modified).toLocaleString()}</span>}
          </div>
        </main>
      )}

      {/* Floating Action Button for Copy (Outside main so it stays fixed relative to the viewport container) */}
      {!isEditing && (
        <button
          onClick={handleCopy}
          className="absolute bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-all hover:scale-105 group flex items-center justify-center gap-2 z-10"
          title="Copy Note Content"
        >
          {copied ? <CheckIcon className="w-6 h-6" /> : <CopyIcon className="w-6 h-6" />}
        </button>
      )}

      {/* Delete Note Confirm Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-lg border border-zinc-400 dark:border-zinc-700 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2 text-red-400">Delete Note?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-5">
              Are you sure you want to delete this note? This action cannot be undone.
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
                onClick={handleDelete}
                className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
