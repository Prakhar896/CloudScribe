import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import Login from './views/Login';
import Journals from './views/Journals';
import JournalDetail from './views/JournalDetail';
import NoteDetail from './views/NoteDetail';

function App() {
  return (
    <ThemeProvider>
      <div className="w-[450px] min-h-[550px] bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white font-sans overflow-hidden relative transition-colors duration-200">
        <MemoryRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
          <Route path="/journals" element={<Journals />} />
          <Route path="/journals/:journalId" element={<JournalDetail />} />
          <Route path="/journals/:journalId/notes/:noteId" element={<NoteDetail />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </MemoryRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
