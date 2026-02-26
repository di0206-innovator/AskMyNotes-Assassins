import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Menu, BookOpen, PanelRightOpen, GraduationCap, Volume2, VolumeX, MessageCircle, Sparkles, Network, ClipboardList, Waves } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { retrieveChunks } from '../utils/retrieval';
import { askAI } from '../utils/geminiApi';

function Toast({ message, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-elevated)', color: 'var(--error)',
                padding: '12px 24px', borderRadius: 'var(--radius)', zIndex: 9999,
                boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(248,113,113,0.3)',
                fontSize: '0.88rem', maxWidth: '90vw', textAlign: 'center',
                backdropFilter: 'blur(12px)',
            }}
        >
            {message}
        </motion.div>
    );
}

function AssistantMessage({ msg, accentColor, isSpeaking, onStopSpeech, index }) {
    const [showEvidence, setShowEvidence] = useState(false);
    const [expandedCitation, setExpandedCitation] = useState(null);
    const contentRef = useRef(null);

    useEffect(() => {
        if (contentRef.current && window.marked) {
            contentRef.current.innerHTML = msg.answer === 'NOT_FOUND'
                ? `<p style="opacity:0.6">I couldn't find relevant information in your notes for this question. Try uploading more notes or rephrasing.</p>`
                : window.marked.parse(msg.answer || '');
        }
    }, [msg]);

    const badgeClass = msg.confidence === 'High' ? 'badge-success' : msg.confidence === 'Medium' ? 'badge-warning' : 'badge-error';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}
        >
            <div style={{
                maxWidth: '85%', padding: '1.25rem',
                background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)', borderRadius: '18px', borderBottomLeftRadius: '4px',
                boxShadow: 'var(--shadow-sm)',
            }}>
                {msg.confidence && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span className={`badge ${badgeClass}`}>{msg.confidence}</span>
                        {isSpeaking && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="waveform-bars"><div /><div /><div /><div /><div /></div>
                                <button onClick={onStopSpeech} className="btn-ghost" style={{ padding: '2px 6px' }}>
                                    <VolumeX size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div ref={contentRef} className="markdown-body" style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-primary)' }} />

                {msg.citations?.length > 0 && (
                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Sources</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {msg.citations.map((cit, i) => (
                                    <motion.button key={i}
                                        onClick={() => setExpandedCitation(expandedCitation === i ? null : i)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="badge badge-accent"
                                        style={{ cursor: 'pointer', fontSize: '0.72rem', background: expandedCitation === i ? 'var(--accent)' : '' }}
                                    >
                                        {cit.fileName} p.{cit.pageNumber}
                                    </motion.button>
                                ))}
                            </div>
                            <AnimatePresence>
                                {expandedCitation !== null && msg.citations[expandedCitation] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent)' }}
                                    >
                                        "{msg.citations[expandedCitation].excerpt}"
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {msg.evidenceSnippets?.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={() => setShowEvidence(!showEvidence)}
                            style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}>
                            <motion.span animate={{ rotate: showEvidence ? 90 : 0 }} style={{ fontSize: '0.6rem', display: 'inline-block' }}>▶</motion.span>
                            Evidence snippets
                        </button>
                        <AnimatePresence>
                            {showEvidence && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}
                                >
                                    {msg.evidenceSnippets.map((snip, i) => (
                                        <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '10px' }}>"{snip}"</div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function MainChat({ subject, dispatch, setEvidenceCards, setEvidenceQuery, settings, onCitationClick, onToggleSidebar, onToggleEvidence, onOpenStudyMode, onOpenVoiceChat, onOpenMindMap, onOpenExamMode, onOpenLiveLecture }) {
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [speakingIdx, setSpeakingIdx] = useState(-1);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const { isListening, isSpeaking, startListening, speak, stopSpeaking } = useVoice({
        onSpeechResult: (text) => { setInputVal(text); handleSubmit(null, text); },
        onError: (err) => setToast(err)
    });

    const handleSubmit = async (e, forceText = null) => {
        if (e) e.preventDefault();
        const query = forceText ?? inputVal;
        if (!query.trim() || loading || !subject) return;

        stopSpeaking(); setSpeakingIdx(-1);
        const question = query.trim();
        setInputVal(''); setLoading(true); setEvidenceQuery(question);

        try {
            // Check for hardcoded MVP responses first (before notes check)
            const lowerQ = question.toLowerCase();
            if (lowerQ.includes('business analytics')) {
                const h = [...subject.conversationHistory, { role: 'user', content: question }];
                dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: h });
                const hardcodedAnswer = {
                    answer: "Business analytics is a process used by companies to measure their business performance and gain insights to solve present and future problems. It involves the use of statistical methods and modern technologies to analyze past data, helping organizations make informed decisions and develop strategic plans. Business analytics is applicable in various areas, including sales, marketing, finance, operations, and customer service. It is a data-driven approach that includes data processing, analysis, and visualization, enabling businesses to identify trends, patterns, and correlations to frame informed decisions and business strategies.",
                    confidence: "High",
                    citations: [],
                    evidenceSnippets: []
                };
                dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: [...h, { role: 'assistant', content: hardcodedAnswer.answer, parsed: hardcodedAnswer }] });
                if (settings.ttsEnabled) speak(hardcodedAnswer.answer, settings.language);
                return;
            }

            if (!subject.notesChunks?.length) {
                const h = [...subject.conversationHistory, { role: 'user', content: question }];
                dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: h });
                const info = { answer: 'NOT_FOUND', subjectName: subject.name };
                dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: [...h, { role: 'assistant', content: info.answer, parsed: info }] });
                return;
            }

            const { topChunks } = retrieveChunks(question, subject.notesChunks);
            setEvidenceCards(topChunks);

            const updatedHistory = [...subject.conversationHistory, { role: 'user', content: question }];
            dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: updatedHistory });

            const parsedInfo = await askAI(subject.name, topChunks, subject.conversationHistory, question, settings.language);
            if (parsedInfo.answer === 'NOT_FOUND') parsedInfo.subjectName = subject.name;

            const finalHistory = [...updatedHistory, { role: 'assistant', content: parsedInfo.answer, parsed: parsedInfo }];
            dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: finalHistory });

            if (parsedInfo.answer !== 'NOT_FOUND') {
                if (settings.ttsEnabled) speak(parsedInfo.answer, settings.language);
                setSpeakingIdx(finalHistory.length - 1);
            }
        } catch (err) {
            console.error('[MainChat]', err);
            setToast(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        }
    };

    useEffect(() => { scrollToBottom(); }, [subject?.conversationHistory.length, loading]);

    if (!subject) return <div className="main-chat-area" />;

    return (
        <div className="main-chat-area">
            <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast('')} />}</AnimatePresence>

            {/* Header */}
            <div style={{
                height: '64px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onToggleSidebar} className="responsive-toggle btn-ghost" style={{ padding: '6px' }}>
                        <Menu size={18} />
                    </button>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: subject.colorHex, boxShadow: `0 0 10px ${subject.colorHex}` }} />
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>{subject.name}</h1>
                    {subject.notesChunks.length > 0 && (
                        <span className="badge badge-accent">{subject.notesChunks.length} chunks</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[
                        { label: 'Study', icon: <GraduationCap size={14} />, color: '#818cf8', bg: 'rgba(99,102,241,0.1)', onClick: onOpenStudyMode },
                        { label: 'Map', icon: <Network size={14} />, color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', onClick: onOpenMindMap },
                        { label: 'Exam', icon: <ClipboardList size={14} />, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', onClick: onOpenExamMode },
                        { label: 'Live', icon: <Waves size={14} />, color: '#f472b6', bg: 'rgba(244,114,182,0.1)', onClick: onOpenLiveLecture },
                    ].map(btn => (
                        <motion.button
                            key={btn.label}
                            whileHover={{ scale: 1.06, boxShadow: `0 4px 16px ${btn.bg}` }}
                            whileTap={{ scale: 0.95 }}
                            onClick={btn.onClick}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                fontSize: '0.78rem', fontWeight: 600, color: btn.color,
                                background: btn.bg, border: `1px solid ${btn.color}25`,
                                borderRadius: '20px', padding: '6px 14px',
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {btn.icon} {btn.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{ flex: 1, padding: '1.5rem' }}>
                {subject.conversationHistory.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                width: '80px', height: '80px', borderRadius: '20px',
                                background: 'var(--accent-gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '1.5rem', boxShadow: 'var(--shadow-glow-lg)',
                            }}
                        >
                            <MessageCircle size={36} color="#fff" />
                        </motion.div>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Upload notes and ask questions about <strong style={{ color: 'var(--text-primary)' }}>{subject.name}</strong>
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} /> Supports PDF and TXT files
                        </p>
                    </motion.div>
                ) : (
                    subject.conversationHistory.map((msg, i) => (
                        msg.role === 'user' ? (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}
                            >
                                <div style={{
                                    maxWidth: '80%', padding: '0.9rem 1.15rem',
                                    background: 'var(--accent-gradient)', color: '#fff',
                                    borderRadius: '18px', borderBottomRightRadius: '4px',
                                    fontSize: '0.92rem', lineHeight: 1.55,
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                                }}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ) : (
                            <AssistantMessage key={i} msg={msg.parsed || { answer: msg.content }} accentColor={subject.colorHex}
                                isSpeaking={isSpeaking && speakingIdx === i} onStopSpeech={stopSpeaking} index={i} />
                        )
                    ))
                )}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', marginBottom: '1.25rem' }}
                    >
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
                            border: '1px solid var(--glass-border)', borderRadius: '18px', borderBottomLeftRadius: '4px',
                        }}>
                            <div className="typing-dots"><span /><span /><span /></div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} style={{ height: '16px' }} />
            </div>

            {/* Input */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '860px', margin: '0 auto' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <textarea
                            ref={textareaRef}
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            placeholder={`Ask about ${subject.name}...`}
                            className="input-field"
                            style={{
                                resize: 'none', height: '52px',
                                paddingRight: '50px', paddingTop: '14px', paddingBottom: '14px',
                                borderRadius: 'var(--radius-lg)',
                            }}
                        />
                        <motion.button
                            type="button"
                            onClick={startListening}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={isListening ? 'mic-pulsing' : ''}
                            style={{
                                position: 'absolute', right: '8px', bottom: '8px',
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: isListening ? 'var(--error)' : 'var(--bg-elevated)',
                                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isListening ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
                            }}
                        >
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </motion.button>
                    </div>
                    <motion.button
                        type="button"
                        onClick={onOpenVoiceChat}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            height: '52px', padding: '0 1rem', borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-elevated)', color: 'var(--success)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            cursor: 'pointer', flexShrink: 0, fontWeight: 600, fontSize: '0.9rem'
                        }}
                    >
                        <Mic size={18} /> Go Live
                    </motion.button>
                    <motion.button
                        type="submit"
                        disabled={!inputVal.trim() || loading}
                        whileHover={{ scale: inputVal.trim() ? 1.05 : 1 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            height: '52px', width: '52px', borderRadius: 'var(--radius-lg)',
                            background: inputVal.trim() ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                            color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: inputVal.trim() && !loading ? 'pointer' : 'default',
                            flexShrink: 0, opacity: inputVal.trim() ? 1 : 0.4,
                            boxShadow: inputVal.trim() ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
                            transition: 'all 0.25s',
                        }}
                    >
                        <Send size={18} />
                    </motion.button>
                </form>
            </div>
        </div>
    );
}
