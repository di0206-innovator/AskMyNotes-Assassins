import { useState, useReducer, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import MainChat from './components/MainChat';
import EvidencePanel from './components/EvidencePanel';
import StudyMode from './components/StudyMode';
import VoiceChat from './components/VoiceChat';
import MindMapPanel from './components/MindMapPanel';
import ExamMode from './components/ExamMode';
import LiveLectureMode from './components/LiveLectureMode';
import Home from './components/Home';
import Settings from './components/Settings';
import CustomCursor from './components/CustomCursor';
import './App.css';

const initialSubjects = [
  { id: 'sub1', name: 'Subject 1', colorHex: '#6366f1', files: [], notesChunks: [], conversationHistory: [] },
  { id: 'sub2', name: 'Subject 2', colorHex: '#06b6d4', files: [], notesChunks: [], conversationHistory: [] },
  { id: 'sub3', name: 'Subject 3', colorHex: '#f59e0b', files: [], notesChunks: [], conversationHistory: [] },
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
  const [user, setUser] = useState(null);
  const [subjects, dispatch] = useReducer(subjectsReducer, initialSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState('sub1');
  const [activeView, setActiveView] = useState('home'); // 'home', 'subject', 'settings'

  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'English',
    ttsEnabled: true,
    cursorEnabled: true
  });

  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isExamModeOpen, setIsExamModeOpen] = useState(false);
  const [isLiveLectureOpen, setIsLiveLectureOpen] = useState(false);

  const [evidenceCards, setEvidenceCards] = useState([]);
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [highlightCitation, setHighlightCitation] = useState(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  if (!user) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ className: 'toast-custom', duration: 4000 }} />
        <AuthPage onLogin={(u) => setUser(u)} />
      </>
    );
  }

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  return (
    <>
      <Toaster position="top-center" toastOptions={{ className: 'toast-custom', duration: 4000 }} />

      <div className="layout-wrapper">
        <Sidebar
          subjects={subjects}
          activeSubjectId={activeSubjectId}
          onSelect={(subId) => { setActiveSubjectId(subId); setActiveView('subject'); }}
          dispatch={dispatch}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          userName={user.name}
          onLogout={() => setUser(null)}
          onNavigateHome={() => setActiveView('home')}
          onNavigateSettings={() => setActiveView('settings')}
        />

        {activeView === 'home' && (
          <Home
            user={user}
            subjects={subjects}
            onNavigate={(view, subId) => { setActiveSubjectId(subId); setActiveView(view); }}
          />
        )}

        {activeView === 'settings' && (
          <Settings
            user={user}
            onLogout={() => setUser(null)}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}

        {activeView === 'subject' && (
          <>
            <MainChat
              subject={activeSubject}
              dispatch={dispatch}
              setEvidenceCards={setEvidenceCards}
              setEvidenceQuery={setEvidenceQuery}
              settings={settings}
              onCitationClick={(citation) => {
                setHighlightCitation(citation);
                setIsEvidenceOpen(true);
              }}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onToggleEvidence={() => setIsEvidenceOpen(!isEvidenceOpen)}
              onOpenStudyMode={() => setIsStudyModeOpen(true)}
              onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
              onOpenMindMap={() => setIsMindMapOpen(true)}
              onOpenExamMode={() => setIsExamModeOpen(true)}
              onOpenLiveLecture={() => setIsLiveLectureOpen(true)}
            />

            <EvidencePanel
              chunks={evidenceCards}
              query={evidenceQuery}
              highlightCitation={highlightCitation}
              isOpen={isEvidenceOpen}
              onClose={() => setIsEvidenceOpen(false)}
            />
          </>
        )}

        {isStudyModeOpen && (
          <StudyMode
            subject={activeSubject}
            onClose={() => setIsStudyModeOpen(false)}
          />
        )}

        {isExamModeOpen && (
          <ExamMode
            subject={activeSubject}
            onClose={() => setIsExamModeOpen(false)}
          />
        )}

        <MindMapPanel
          chunks={activeSubject?.notesChunks || []}
          isOpen={isMindMapOpen}
          onClose={() => setIsMindMapOpen(false)}
        />

        {isVoiceChatOpen && (
          <VoiceChat
            subject={activeSubject}
            onClose={() => setIsVoiceChatOpen(false)}
            settings={settings}
          />
        )}

        {isLiveLectureOpen && (
          <LiveLectureMode
            subject={activeSubject}
            dispatch={dispatch}
            onClose={() => setIsLiveLectureOpen(false)}
          />
        )}

        {/* Global Floating Elements */}
        <CustomCursor isEnabled={settings.cursorEnabled} />

        {/* Mobile Bottom Navigation */}
        <div className="bottom-nav">
          <button onClick={() => { setActiveView('home'); setIsSidebarOpen(false); }}>🏠 Home</button>
          <button onClick={() => { setIsSidebarOpen(true); setIsEvidenceOpen(false); }}>📚 Subjects</button>
          <button onClick={() => { setActiveView('settings'); setIsSidebarOpen(false); }}>⚙️ Settings</button>
        </div>
      </div>
    </>
  );
}

export default App;
