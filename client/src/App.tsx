import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import Journals from './views/Journals';
import JournalDetail from './views/JournalDetail';
import NoteDetail from './views/NoteDetail';

function App() {
  return (
    <div className="w-[450px] min-h-[550px] bg-zinc-950 text-white font-sans overflow-hidden relative">
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
  );
}

export default App;
