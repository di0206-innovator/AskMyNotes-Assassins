import { useState, useRef, useEffect } from 'react';
import { useVoice } from '../hooks/useVoice';
import { retrieveChunks } from '../utils/retrieval';
import { askClaude } from '../utils/anthropicApi';

function Toast({ message, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontWeight: 'bold' }}>
            {message}
        </div>
    );
}

function AssistantMessage({ msg, subjectColor, onCitationClick, isSpeaking, onStopSpeech }) {
    const [showEvidence, setShowEvidence] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (contentRef.current && window.marked) {
            if (msg.answer === 'NOT_FOUND') {
                contentRef.current.innerHTML = `<p>Not found in your notes for ${msg.subjectName}</p>`;
            } else {
                contentRef.current.innerHTML = window.marked.parse(msg.answer || '');
            }
        }
    }, [msg]);

    if (msg.answer === 'NOT_FOUND') {
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', width: '100%' }}>
                <div className="card" style={{ maxWidth: '85%', padding: '1.25rem', backgroundColor: 'var(--surface-color)' }}>
                    <div ref={contentRef} className="markdown-body" />
                </div>
            </div>
        );
    }

    const badgeColor = msg.confidence === 'High' ? '#4ade80' : msg.confidence === 'Medium' ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', width: '100%' }}>
            <div className="card" style={{ maxWidth: '85%', padding: '1.25rem', backgroundColor: 'var(--surface-color)', position: 'relative' }}>

                {/* Header: Confidence & Audio Control */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    {msg.confidence && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${badgeColor}`, color: badgeColor, background: `${badgeColor}20` }}>
                            {msg.confidence} Confidence
                        </span>
                    )}

                    {isSpeaking && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                            <div className="waveform-bars">
                                <div /><div /><div /><div /><div />
                            </div>
                            <button onClick={onStopSpeech} style={{ fontSize: '0.8rem', opacity: 0.8, cursor: 'pointer' }} title="Stop Reading">⏹</button>
                        </div>
                    )}
                </div>

                <div ref={contentRef} className="markdown-body" style={{ fontSize: '0.95rem', lineHeight: 1.6 }} />

                {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources cited</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {msg.citations.map((cit, i) => (
                                <button
                                    key={i}
                                    onClick={() => onCitationClick(cit)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${subjectColor}60`, padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', color: subjectColor, cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                >
                                    {cit.fileName} — Page {cit.pageNumber}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {msg.evidenceSnippets && msg.evidenceSnippets.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                        <button
                            onClick={() => setShowEvidence(!showEvidence)}
                            style={{ fontSize: '0.8rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
                        >
                            <span style={{ fontSize: '0.6rem', transition: 'transform 0.2s', transform: showEvidence ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span> Show Evidence Snippets
                        </button>
                        {showEvidence && (
                            <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                {msg.evidenceSnippets.map((snip, i) => (
                                    <div key={i} style={{ borderLeft: `2px solid ${subjectColor}60`, paddingLeft: '12px' }}>"{snip}"</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

export default function MainChat({ subject, dispatch, setEvidenceCards, setEvidenceQuery, onCitationClick, onToggleSidebar, onToggleEvidence, onOpenStudyMode }) {
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [currentSpeakingMsgIndex, setCurrentSpeakingMsgIndex] = useState(-1);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSpeechResult = (text) => {
        setInputVal(text);
        handleSubmit(null, text);
    };

    const { isListening, isSpeaking, startListening, speak, stopSpeaking } = useVoice({
        onSpeechResult: handleSpeechResult,
        onError: (err) => setToast(err)
    });

    const handleSubmit = async (e, forceText = null) => {
        if (e) e.preventDefault();
        const query = forceText !== null ? forceText : inputVal;
        if (!query.trim() || loading || !subject) return;

        stopSpeaking();
        setCurrentSpeakingMsgIndex(-1);

        const question = query.trim();
        setInputVal('');
        setLoading(true);
        setEvidenceQuery(question);

        try {
            const { topChunks, insufficientContext } = retrieveChunks(question, subject.notesChunks);
            setEvidenceCards(topChunks);

            const updatedHistory = [...subject.conversationHistory, { role: 'user', content: question }];
            dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: updatedHistory });

            let parsedInfo = null;
            if (insufficientContext) {
                parsedInfo = { answer: 'NOT_FOUND', subjectName: subject.name };
            } else {
                parsedInfo = await askClaude(null, subject.name, topChunks, subject.conversationHistory, question);
            }

            if (parsedInfo.answer === 'NOT_FOUND') {
                parsedInfo.subjectName = subject.name;
            }

            const newAssistantMsg = { role: 'assistant', content: parsedInfo.answer, parsed: parsedInfo };
            const finalHistory = [...updatedHistory, newAssistantMsg];
            dispatch({ type: 'UPDATE_HISTORY', subjectId: subject.id, history: finalHistory });

            if (parsedInfo.answer !== 'NOT_FOUND') {
                speak(parsedInfo.answer);
                setCurrentSpeakingMsgIndex(finalHistory.length - 1);
            }

        } catch (err) {
            setToast(err.message);
        } finally {
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [subject?.conversationHistory.length, loading]);

    if (!subject) return <div className="main-chat-area" />;

    return (
        <div className="main-chat-area">
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            {/* Top Header */}
            <div style={{ height: '70px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-color)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={onToggleSidebar} style={{ fontSize: '1.2rem', padding: '4px', display: window.innerWidth < 1024 ? 'block' : 'none' }}>☰</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: subject.colorHex, boxShadow: `0 0 12px ${subject.colorHex}90` }} />
                        <h1 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>{subject.name}</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={onOpenStudyMode}
                        style={{ padding: '8px 16px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', gap: '6px', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = subject.colorHex; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                        <span style={{ color: subject.colorHex }}>★</span> Study Mode
                    </button>
                    <button onClick={onToggleEvidence} style={{ fontSize: '1.2rem', padding: '4px', display: window.innerWidth < 1024 ? 'block' : 'none' }}>📖</button>
                </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{ flex: 1, padding: '2rem' }}>
                {subject.conversationHistory.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'grayscale(1)', opacity: 0.5 }}>📚</div>
                        <p style={{ fontSize: '1.1rem' }}>Ask a question regarding your notes in {subject.name}</p>
                    </div>
                ) : (
                    subject.conversationHistory.map((msg, i) => {
                        if (msg.role === 'user') {
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', width: '100%' }}>
                                    <div style={{ maxWidth: '80%', padding: '1rem 1.25rem', backgroundColor: subject.colorHex, color: '#000', borderRadius: '16px', borderBottomRightRadius: '4px', fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        } else {
                            const parsedInfo = msg.parsed || { answer: msg.content };
                            return (
                                <AssistantMessage
                                    key={i}
                                    msg={parsedInfo}
                                    subjectColor={subject.colorHex}
                                    onCitationClick={onCitationClick}
                                    isSpeaking={isSpeaking && currentSpeakingMsgIndex === i}
                                    onStopSpeech={stopSpeaking}
                                />
                            );
                        }
                    })
                )}

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.25rem 2rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                            <div className="typing-dots" style={{ transform: 'scale(1.2)' }}><span /><span /><span /></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ height: '20px' }} />
            </div>

            {/* Input Bar */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-color)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <textarea
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder={`Ask about ${subject.name}...`}
                            style={{
                                width: '100%',
                                background: 'var(--surface-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                padding: '16px 56px 16px 24px',
                                resize: 'none',
                                height: '56px',
                                fontSize: '1rem',
                                lineHeight: '1.5',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                color: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = subject.colorHex}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        <button
                            type="button"
                            onClick={startListening}
                            className={isListening ? 'mic-pulsing' : ''}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                bottom: '8px',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isListening ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                opacity: isListening ? 1 : 0.8,
                                transition: 'all 0.2s',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => { if (!isListening) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseOut={(e) => { if (!isListening) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            title="Voice Input"
                        >
                            🎤
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={!inputVal.trim() || loading}
                        style={{
                            height: '56px',
                            width: '56px',
                            borderRadius: '50%',
                            background: inputVal.trim() ? subject.colorHex : 'var(--surface-color)',
                            color: inputVal.trim() ? 'black' : 'rgba(255,255,255,0.3)',
                            border: inputVal.trim() ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            transition: 'all 0.2s',
                            cursor: inputVal.trim() && !loading ? 'pointer' : 'default',
                            flexShrink: 0
                        }}
                        title="Send Message"
                    >
                        ➤
                    </button>
                </form>
            </div>

        </div>
    );
}
