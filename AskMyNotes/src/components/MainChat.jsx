import { useState, useRef, useEffect } from 'react';
import { useVoice } from '../hooks/useVoice';
import { retrieveChunks } from '../utils/retrieval';
import { askAI } from '../utils/geminiApi';

function Toast({ message, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-elevated)', color: 'var(--error)', padding: '12px 24px', borderRadius: '12px', zIndex: 9999, boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(248,113,113,0.3)', fontSize: '0.9rem', maxWidth: '90vw', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
            {message}
        </div>
    );
}

function AssistantMessage({ msg, accentColor, onCitationClick, isSpeaking, onStopSpeech }) {
    const [showEvidence, setShowEvidence] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (contentRef.current && window.marked) {
            contentRef.current.innerHTML = msg.answer === 'NOT_FOUND'
                ? `<p style="opacity:0.6">I couldn't find relevant information in your notes for this question. Try uploading more notes or rephrasing.</p>`
                : window.marked.parse(msg.answer || '');
        }
    }, [msg]);

    const badgeColor = msg.confidence === 'High' ? 'var(--success)' : msg.confidence === 'Medium' ? 'var(--warning)' : 'var(--error)';

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ maxWidth: '85%', padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                {msg.confidence && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${badgeColor}`, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {msg.confidence}
                        </span>
                        {isSpeaking && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="waveform-bars"><div /><div /><div /><div /><div /></div>
                                <button onClick={onStopSpeech} style={{ fontSize: '0.75rem', opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>⏹</button>
                            </div>
                        )}
                    </div>
                )}

                <div ref={contentRef} className="markdown-body" style={{ fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-primary)' }} />

                {msg.citations?.length > 0 && (
                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sources</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {msg.citations.map((cit, i) => (
                                <button key={i} onClick={() => onCitationClick(cit)}
                                    style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-active)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', color: 'var(--accent-light)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                                >{cit.fileName} p.{cit.pageNumber}</button>
                            ))}
                        </div>
                    </div>
                )}

                {msg.evidenceSnippets?.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={() => setShowEvidence(!showEvidence)}
                            style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <span style={{ fontSize: '0.6rem', transition: 'transform 0.2s', transform: showEvidence ? 'rotate(90deg)' : '' }}>▶</span> Evidence
                        </button>
                        {showEvidence && (
                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                                {msg.evidenceSnippets.map((snip, i) => (
                                    <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '10px' }}>"{snip}"</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MainChat({ subject, dispatch, setEvidenceCards, setEvidenceQuery, onCitationClick, onToggleSidebar, onToggleEvidence, onOpenStudyMode, onOpenVoiceChat }) {
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [speakingIdx, setSpeakingIdx] = useState(-1);
    const messagesEndRef = useRef(null);

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

            const parsedInfo = await askAI(subject.name, topChunks, subject.conversationHistory, question);
            if (parsedInfo.answer === 'NOT_FOUND') parsedInfo.subjectName = subject.name;

            const finalHistory = [...updatedHistory, { role: 'assistant', content: parsedInfo.answer, parsed: parsedInfo }];
            dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: finalHistory });

            if (parsedInfo.answer !== 'NOT_FOUND') {
                speak(parsedInfo.answer);
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
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            {/* Header */}
            <div style={{ height: '64px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onToggleSidebar} className="responsive-toggle" style={{ fontSize: '1.1rem', padding: '4px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>☰</button>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: subject.colorHex, boxShadow: `0 0 8px ${subject.colorHex}` }} />
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{subject.name}</h1>
                    {subject.notesChunks.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px' }}>{subject.notesChunks.length} chunks</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={onOpenVoiceChat}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', fontSize: '0.82rem', fontWeight: 600, color: '#00d4ff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '4px', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
                    >🎤 Voice</button>
                    <button onClick={onOpenStudyMode}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--accent-glow)', border: '1px solid var(--border-active)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-light)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '4px', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                    >🎓 Study</button>
                    <button onClick={onToggleEvidence} className="responsive-toggle" style={{ fontSize: '1.1rem', padding: '4px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>📖</button>
                </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{ flex: 1, padding: '1.5rem' }}>
                {subject.conversationHistory.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', opacity: 0.3 }}>📚</div>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Upload notes and ask questions about <strong style={{ color: 'var(--text-primary)' }}>{subject.name}</strong></p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PDF and TXT files</p>
                    </div>
                ) : (
                    subject.conversationHistory.map((msg, i) => (
                        msg.role === 'user' ? (
                            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                                <div style={{ maxWidth: '80%', padding: '0.85rem 1.1rem', background: 'var(--accent-gradient)', color: '#fff', borderRadius: '16px', borderBottomRightRadius: '4px', fontSize: '0.92rem', lineHeight: 1.5, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            <AssistantMessage key={i} msg={msg.parsed || { answer: msg.content }} accentColor={subject.colorHex}
                                onCitationClick={onCitationClick} isSpeaking={isSpeaking && speakingIdx === i} onStopSpeech={stopSpeaking} />
                        )
                    ))
                )}
                {loading && (
                    <div style={{ display: 'flex', marginBottom: '1.25rem' }}>
                        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                            <div className="typing-dots"><span /><span /><span /></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ height: '16px' }} />
            </div>

            {/* Input */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '860px', margin: '0 auto' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <textarea value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            placeholder={`Ask about ${subject.name}...`}
                            style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 50px 14px 18px', resize: 'none', height: '50px', fontSize: '0.92rem', lineHeight: '1.5', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <button type="button" onClick={startListening} className={isListening ? 'mic-pulsing' : ''}
                            style={{ position: 'absolute', right: '6px', bottom: '6px', width: '36px', height: '36px', borderRadius: '50%', background: isListening ? 'var(--error)' : 'var(--bg-elevated)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                        >🎤</button>
                    </div>
                    <button type="submit" disabled={!inputVal.trim() || loading}
                        style={{ height: '50px', width: '50px', borderRadius: '14px', background: inputVal.trim() ? 'var(--accent-gradient)' : 'var(--bg-elevated)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: inputVal.trim() && !loading ? 'pointer' : 'default', transition: 'all 0.2s', flexShrink: 0, opacity: inputVal.trim() ? 1 : 0.4 }}
                    >➤</button>
                </form>
            </div>
        </div>
    );
}
