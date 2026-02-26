import { useState, useReducer } from 'react';
import Sidebar from './components/Sidebar';
import MainChat from './components/MainChat';
import EvidencePanel from './components/EvidencePanel';
import StudyMode from './components/StudyMode';
import './App.css';

const initialSubjects = [
  { id: 'sub1', name: 'Subject 1', colorHex: '#C8A96E', files: [], notesChunks: [], conversationHistory: [] },
  { id: 'sub2', name: 'Subject 2', colorHex: '#6E9EC8', files: [], notesChunks: [], conversationHistory: [] },
  { id: 'sub3', name: 'Subject 3', colorHex: '#9EC87A', files: [], notesChunks: [], conversationHistory: [] },
];

function subjectsReducer(state, action) {
  switch (action.type) {
    case 'RENAME_SUBJECT':
      return state.map(s => s.id === action.id ? { ...s, name: action.name } : s);
    case 'ADD_FILE':
      return state.map(s => s.id === action.subjectId ? { ...s, files: [...s.files, action.file] } : s);
    case 'REMOVE_FILE':
      return state.map(s => {
        if (s.id !== action.subjectId) return s;
        return {
          ...s,
          files: s.files.filter(f => f.name !== action.fileName),
          notesChunks: s.notesChunks.filter(c => c.fileName !== action.fileName)
        };
      });
    case 'ADD_CHUNKS':
      return state.map(s => s.id === action.subjectId ? { ...s, notesChunks: [...s.notesChunks, ...action.chunks] } : s);
    case 'UPDATE_HISTORY':
      return state.map(s => s.id === action.subjectId ? { ...s, conversationHistory: action.history } : s);
    default:
      return state;
  }
}

function App() {
  const [subjects, dispatch] = useReducer(subjectsReducer, initialSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState('sub1');
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);

  const [evidenceCards, setEvidenceCards] = useState([]);
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [highlightCitation, setHighlightCitation] = useState(null);

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  return (
    <div className="layout-wrapper">
      <Sidebar
        subjects={subjects}
        activeSubjectId={activeSubjectId}
        onSelect={setActiveSubjectId}
        dispatch={dispatch}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <MainChat
        subject={activeSubject}
        dispatch={dispatch}
        setEvidenceCards={setEvidenceCards}
        setEvidenceQuery={setEvidenceQuery}
        onCitationClick={(citation) => {
          setHighlightCitation(citation);
          setIsEvidenceOpen(true);
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleEvidence={() => setIsEvidenceOpen(!isEvidenceOpen)}
        onOpenStudyMode={() => setIsStudyModeOpen(true)}
      />

      <EvidencePanel
        chunks={evidenceCards}
        query={evidenceQuery}
        highlightCitation={highlightCitation}
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
      />

      {isStudyModeOpen && (
        <StudyMode
          subject={activeSubject}
          onClose={() => setIsStudyModeOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="bottom-nav">
        <button onClick={() => { setIsSidebarOpen(true); setIsEvidenceOpen(false); }} style={{ flex: 1 }}>📚 Subjects</button>
        <button onClick={() => { setIsSidebarOpen(false); setIsEvidenceOpen(false); }} style={{ flex: 1 }}>💬 Chat</button>
        <button onClick={() => { setIsEvidenceOpen(true); setIsSidebarOpen(false); }} style={{ flex: 1 }}>📖 Evidence</button>
        <button onClick={() => setIsStudyModeOpen(true)} style={{ flex: 1 }}>🎓 Study</button>
      </div>
    </div>
  );
}

export default App;
