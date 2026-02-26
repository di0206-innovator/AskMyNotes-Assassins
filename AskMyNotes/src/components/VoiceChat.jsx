import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Trash2, Volume2, VolumeX, ArrowLeft, Sparkles } from 'lucide-react';
import { voiceChat } from '../utils/geminiApi';

const NUM_BARS = 24;

export default function VoiceChat({ subject, onClose, settings }) {
    const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking | error
    const [messages, setMessages] = useState([]);
    const [liveText, setLiveText] = useState('');
    const [barHeights, setBarHeights] = useState(Array(NUM_BARS).fill(4));
    const [muted, setMuted] = useState(false);
    const [voice, setVoice] = useState('');
    const [voices, setVoices] = useState([]);
    const [error, setError] = useState('');

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const animFrameRef = useRef(null);
    const transcriptRef = useRef(null);
    const conversationRef = useRef([]);

    const langMap = {
        'English': 'en-US', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN',
        'Gujarati': 'gu-IN', 'Telugu': 'te-IN', 'Punjabi': 'pa-IN', 'Bengali': 'bn-IN'
    };
    const langCode = langMap[settings?.language || 'English'] || 'en-US';

    // Load TTS voices
    useEffect(() => {
        const loadVoices = () => {
            const v = synthRef.current.getVoices().filter(v => v.lang.startsWith(langCode.split('-')[0]));
            setVoices(v);
            if (!voice && v.length) setVoice(v[0].name);
        };
        loadVoices();
        synthRef.current.onvoiceschanged = loadVoices;
    }, [langCode]);

    // Scroll transcript
    useEffect(() => {
        if (transcriptRef.current)
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }, [messages]);

    // Animate bars
    const animateBars = useCallback((active, style = 'listen') => {
        if (!active) { setBarHeights(Array(NUM_BARS).fill(4)); return; }
        const tick = () => {
            setBarHeights(prev =>
                prev.map((h, i) => {
                    if (style === 'think') {
                        const target = 4 + 20 * Math.abs(Math.sin(Date.now() / 400 + i * 0.5));
                        return h + (target - h) * 0.2;
                    }
                    const rand = Math.random();
                    const target = rand > 0.6 ? 4 + Math.random() * 28 : 4;
                    return h + (target - h) * 0.3;
                })
            );
            animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
    }, []);

    const stopAnim = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setBarHeights(Array(NUM_BARS).fill(4));
    }, []);

    // Speak response
    const speak = useCallback((text) => {
        if (muted) { setStatus('idle'); return; }
        synthRef.current.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const selectedVoice = voices.find(v => v.name === voice);
        if (selectedVoice) utter.voice = selectedVoice;
        utter.rate = 1;
        utter.pitch = 1;

        utter.onstart = () => { setStatus('speaking'); animateBars(true, 'speak'); };
        utter.onend = () => { stopAnim(); setStatus('idle'); };
        utter.onerror = () => { stopAnim(); setStatus('idle'); };

        synthRef.current.speak(utter);
    }, [muted, voice, voices, animateBars, stopAnim]);

    // Call API
    const askAI = useCallback(async (userText) => {
        setStatus('thinking');
        animateBars(true, 'think');

        const newMsg = { role: 'user', content: `[Respond strictly in ${settings?.language || 'English'}] ` + userText };
        conversationRef.current = [...conversationRef.current, newMsg];
        setMessages(prev => [...prev, { role: 'user', text: userText }]);

        try {
            // Gather notes context if available
            const notesContext = subject?.notesChunks?.length
                ? subject.notesChunks.slice(0, 10).map(c => c.text).join('\n\n')
                : null;

            const reply = await voiceChat(conversationRef.current, notesContext);

            conversationRef.current = [...conversationRef.current, { role: 'assistant', content: reply }];
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

            stopAnim();
            speak(reply);
        } catch (err) {
            stopAnim();
            setError('API error: ' + err.message);
            setStatus('error');
        }
    }, [animateBars, stopAnim, speak, subject]);

    // Start listening
    const startListening = useCallback(() => {
        setError('');
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setError('Speech recognition not supported. Try Chrome or Edge.'); setStatus('error'); return; }

        synthRef.current.cancel();
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = langCode;
        recognitionRef.current = rec;

        rec.onstart = () => { setStatus('listening'); animateBars(true, 'listen'); };
        rec.onresult = (e) => {
            const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
            setLiveText(transcript);
        };
        rec.onend = () => {
            stopAnim();
            setLiveText(prev => {
                if (prev.trim()) { askAI(prev.trim()); }
                else { setStatus('idle'); }
                return '';
            });
        };
        rec.onerror = (e) => {
            stopAnim();
            setLiveText('');
            if (e.error !== 'aborted') { setError('Mic error: ' + e.error); setStatus('error'); }
            else { setStatus('idle'); }
        };

        rec.start();
    }, [animateBars, stopAnim, askAI]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
    }, []);

    const handleMainBtn = () => {
        if (status === 'listening') stopListening();
        else if (status === 'idle' || status === 'error') startListening();
    };

    const clearAll = () => {
        synthRef.current.cancel();
        if (recognitionRef.current) recognitionRef.current.abort();
        stopAnim();
        setMessages([]);
        conversationRef.current = [];
        setLiveText('');
        setError('');
        setStatus('idle');
    };

    const isRecording = status === 'listening';
    const isBusy = status === 'thinking' || status === 'speaking';

    const statusConfig = {
        idle: { label: 'READY', color: 'var(--text-muted)', bg: 'transparent', borderColor: 'var(--border)' },
        listening: { label: 'LISTENING', color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', borderColor: '#00d4ff' },
        thinking: { label: 'THINKING', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', borderColor: '#fbbf24' },
        speaking: { label: 'SPEAKING', color: 'var(--success)', bg: 'var(--success-bg)', borderColor: 'var(--success)' },
        error: { label: 'ERROR', color: 'var(--error)', bg: 'var(--error-bg)', borderColor: 'var(--error)' },
    };

    const sc = statusConfig[status] || statusConfig.idle;

    const orbClass = status === 'listening' ? 'orb-listening' : status === 'thinking' ? 'orb-thinking' : status === 'speaking' ? 'orb-speaking' : '';

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <style>{`
                @keyframes orb-listen { from { transform: scale(1); } to { transform: scale(1.08); } }
                @keyframes orb-think { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.05) rotate(180deg); } }
                @keyframes orb-speak { from { transform: scale(1); } to { transform: scale(1.06); } }
                @keyframes ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes msg-in { to { opacity: 1; transform: translateY(0); } }
                .orb-listening { animation: orb-listen 0.5s ease-in-out infinite alternate; box-shadow: 0 0 30px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,0,0,0.5) !important; }
                .orb-thinking { animation: orb-think 1.5s ease-in-out infinite; box-shadow: 0 0 30px rgba(251,191,36,0.4), 0 0 60px rgba(251,191,36,0.15), inset 0 0 20px rgba(0,0,0,0.5) !important; background: radial-gradient(circle at 35% 35%, rgba(251,191,36,0.4), rgba(124,58,237,0.6), #0d1117) !important; }
                .orb-speaking { animation: orb-speak 0.3s ease-in-out infinite alternate; box-shadow: 0 0 30px rgba(52,211,153,0.4), 0 0 80px rgba(52,211,153,0.15), inset 0 0 20px rgba(0,0,0,0.5) !important; background: radial-gradient(circle at 35% 35%, rgba(52,211,153,0.4), rgba(0,212,255,0.5), #0d1117) !important; }
                .vc-msg { display: flex; gap: 10px; margin-bottom: 14px; animation: msg-in 0.3s ease forwards; opacity: 0; transform: translateY(6px); }
                .vc-msg:last-child { margin-bottom: 0; }
            `}</style>

            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'relative', width: '100%', maxWidth: '700px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl), 0 0 0 1px rgba(0,212,255,0.05)',
                }}
            >
                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="btn-ghost"
                            style={{ padding: '6px' }}
                        >
                            <ArrowLeft size={18} />
                        </motion.button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 10px #00d4ff', animation: 'pulse 2s ease-in-out infinite' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00d4ff' }}>
                                VOICE CHAT
                            </span>
                        </div>
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '4px 10px',
                        borderRadius: '20px', border: `1px solid ${sc.borderColor}`,
                        color: sc.color, background: sc.bg, transition: 'all 0.3s',
                    }}>
                        {sc.label}
                    </span>
                </div>

                {/* Subject context indicator */}
                {subject?.notesChunks?.length > 0 && (
                    <div style={{
                        padding: '8px 24px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        background: 'rgba(99,102,241,0.04)', position: 'relative', zIndex: 1,
                    }}>
                        <Sparkles size={11} color="var(--accent-light)" />
                        Using notes from <strong style={{ color: 'var(--accent-light)' }}>{subject.name}</strong> ({subject.notesChunks.length} chunks)
                    </div>
                )}

                {/* Visualizer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: '180px', position: 'relative', zIndex: 1 }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Rings */}
                        {[0, -12, -24].map((inset, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                inset: `${inset}px`,
                                borderRadius: '50%',
                                border: `1px solid rgba(0,212,255,${0.2 - i * 0.06})`,
                                animation: `ring-spin ${8 + i * 4}s linear infinite ${i % 2 ? 'reverse' : ''}`,
                            }} />
                        ))}
                        {/* Orb */}
                        <div className={orbClass} style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.4), rgba(124,58,237,0.6), #0d1117)',
                            boxShadow: '0 0 20px rgba(0,212,255,0.3), 0 0 60px rgba(124,58,237,0.2), inset 0 0 20px rgba(0,0,0,0.5)',
                            transition: 'transform 0.1s', position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{ position: 'absolute', top: '15%', left: '20%', width: '30%', height: '20%', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(4px)' }} />
                        </div>
                    </div>
                    {/* Bars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '24px', height: '40px' }}>
                        {barHeights.map((h, i) => (
                            <div key={i} style={{
                                width: '3px', borderRadius: '2px',
                                height: `${Math.max(4, Math.min(40, h))}px`,
                                background: status === 'speaking' ? 'var(--success)' : status === 'thinking' ? '#fbbf24' : '#00d4ff',
                                opacity: status !== 'idle' && status !== 'error' ? 1 : 0.3,
                                boxShadow: status !== 'idle' && status !== 'error' ? `0 0 6px ${status === 'speaking' ? 'var(--success)' : status === 'thinking' ? '#fbbf24' : '#00d4ff'}` : 'none',
                                transition: 'height 0.1s, opacity 0.1s',
                            }} />
                        ))}
                    </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={{
                                margin: '0 24px 16px', padding: '10px 14px',
                                background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.3)',
                                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem', color: 'var(--error)', position: 'relative', zIndex: 1,
                            }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Transcript */}
                <div ref={transcriptRef} className="scroll-y" style={{
                    margin: '0 24px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    minHeight: '150px', maxHeight: '220px',
                    padding: '16px', position: 'relative', zIndex: 1,
                }}>
                    {messages.length === 0 ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%', minHeight: '118px',
                            fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                            color: 'var(--text-muted)', letterSpacing: '0.05em',
                        }}>
                            — tap mic to start talking —
                        </div>
                    ) : (
                        messages.map((m, i) => (
                            <div key={i} className="vc-msg">
                                <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500,
                                    letterSpacing: '0.08em', textTransform: 'uppercase',
                                    marginTop: '2px', flexShrink: 0, width: '48px',
                                    color: m.role === 'user' ? '#00d4ff' : 'var(--success)',
                                }}>
                                    {m.role === 'user' ? 'YOU' : 'AI'}
                                </span>
                                <span style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-primary)', flex: 1 }}>
                                    {m.text}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Live transcript */}
                <div style={{
                    margin: '12px 24px 0', minHeight: '24px',
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                    color: '#00d4ff', opacity: liveText ? 0.7 : 0,
                    fontStyle: 'italic', letterSpacing: '0.02em',
                    transition: 'opacity 0.3s', position: 'relative', zIndex: 1,
                }}>
                    {liveText}
                </div>

                {/* Controls */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '16px', padding: '28px 24px', position: 'relative', zIndex: 1,
                }}>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setMuted(m => !m)}
                        style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: 'var(--border)', color: 'var(--text-muted)',
                            border: 'none', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        title={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </motion.button>

                    <motion.button
                        whileHover={!isBusy ? { scale: 1.08 } : {}}
                        whileTap={!isBusy ? { scale: 0.92 } : {}}
                        onClick={handleMainBtn}
                        disabled={isBusy}
                        style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: isRecording
                                ? 'linear-gradient(135deg, var(--error), #9f1239)'
                                : 'linear-gradient(135deg, #00d4ff, #6366f1)',
                            border: 'none', cursor: isBusy ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: isBusy ? 0.5 : 1,
                            boxShadow: isRecording
                                ? '0 0 20px rgba(248,113,113,0.4)'
                                : '0 0 20px rgba(0,212,255,0.4)',
                            transition: 'all 0.2s',
                            animation: isRecording ? 'mic-pulse 1.5s ease-out infinite' : 'none',
                        }}
                    >
                        {isRecording ? <Square size={22} color="#fff" /> : <Mic size={24} color="#fff" />}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={clearAll}
                        style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: 'var(--border)', color: 'var(--text-muted)',
                            border: 'none', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        title="Clear conversation"
                    >
                        <Trash2 size={16} />
                    </motion.button>
                </div>

                {/* Voice selector */}
                <div style={{
                    borderTop: '1px solid var(--border)', padding: '14px 24px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    position: 'relative', zIndex: 1,
                }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Voice
                    </span>
                    <select
                        value={voice}
                        onChange={e => setVoice(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                            padding: '5px 10px', cursor: 'pointer', outline: 'none',
                            transition: 'border-color 0.2s', flex: 1,
                        }}
                    >
                        {voices.map(v => (
                            <option key={v.name} value={v.name} style={{ background: '#0d1117' }}>{v.name}</option>
                        ))}
                    </select>
                </div>
            </motion.div>
        </div>
    );
}
