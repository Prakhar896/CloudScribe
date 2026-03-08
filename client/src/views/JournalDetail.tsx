import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JournalAPI, NoteAPI } from '../api';
import type { Journal, Note, NoteCreate } from '../types';
import { setLastOpenedJournalId } from '../utils/storage';
import { ArrowLeftIcon, PlusIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

export default function JournalDetail() {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate = useNavigate();

  const [journal, setJournal] = useState<Journal | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Note Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');

  useEffect(() => {
    if (journalId) {
      setLastOpenedJournalId(journalId);
      fetchData(journalId);
    }
  }, [journalId]);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [jData, nData] = await Promise.all([
        JournalAPI.getJournal(id),
        NoteAPI.getNotes(id)
      ]);
      setJournal(jData);
      // Backend may return empty array or notes directly, ensure it's an array
      setNotes(nData || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch journal data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent || !journalId) return;

    try {
      const parsedTags = newTagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const newNote: NoteCreate = {
        journal_id: journalId,
        title: newTitle,
        content: newContent,
        tags: parsedTags,
      };

      const created = await NoteAPI.createNote(newNote);
      setNotes([...notes, created]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setNewTagsInput('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create note');
    }
  };

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagsSet.add(tag.toLowerCase()));
    });
    return Array.from(tagsSet).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag ? note.tags?.map(t => t.toLowerCase()).includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-zinc-950 text-white p-6 text-center">
        <p className="text-red-500 mb-4">{error || 'Journal not found'}</p>
        <button
          onClick={() => navigate('/journals')}
          className="px-4 py-2 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors"
        >
          Back to Journals
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-white relative">
      <header className="flex items-center p-4 border-b border-zinc-800 shrink-0 gap-3">
        <button
          onClick={() => {
            setLastOpenedJournalId(''); // Clear when leaving manually
            navigate('/journals');
          }}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-zinc-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{journal.title}</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          title="Create Note"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 border-b border-zinc-800 shrink-0 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 transition-colors"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 max-h-16 overflow-y-auto hide-scrollbar">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                selectedTag === null
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-10">
            <p className="text-sm">No notes found.</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/journals/${journalId}/notes/${note.id}`)}
              className="flex flex-col p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 cursor-pointer transition-colors"
            >
              <h2 className="text-sm font-semibold text-zinc-100 line-clamp-1">{note.title}</h2>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{note.content}</p>

              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-1.5 overflow-hidden">
                  {note.tags?.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                      {tag}
                    </span>
                  ))}
                  {(note.tags?.length || 0) > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-zinc-500">
                      +{note.tags!.length - 3}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {new Date(note.created).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-700 w-full max-w-sm flex flex-col h-[80%] max-h-[500px]">
            <h3 className="text-lg font-semibold mb-4 text-zinc-100 shrink-0">New Note</h3>
            <form onSubmit={handleCreateNote} className="flex flex-col flex-1 space-y-3 overflow-hidden">
              <div className="shrink-0">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white text-sm"
                  placeholder="Note Title"
                  autoFocus
                />
              </div>
              <div className="flex-1 min-h-0">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full h-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white resize-none text-sm"
                  placeholder="Start typing your note here..."
                />
              </div>
              <div className="shrink-0">
                <input
                  type="text"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white text-xs"
                  placeholder="Tags (comma separated, e.g. work, ideas)"
                />
              </div>
              <div className="flex space-x-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 bg-zinc-800 text-white text-sm font-semibold rounded-md hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle || !newContent}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hide scrollbar styles for tags list */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
