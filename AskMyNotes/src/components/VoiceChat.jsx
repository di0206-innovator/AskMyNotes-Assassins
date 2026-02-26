import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceChat } from '../utils/geminiApi';

const NUM_BARS = 20;

export default function VoiceChat({ notesContext, onClose }) {
    const [status, setStatus] = useState('idle');
    const [messages, setMessages] = useState([]);
    const [liveText, setLiveText] = useState('');
    const [barHeights, setBarHeights] = useState(Array(NUM_BARS).fill(4));
    const [muted, setMuted] = useState(false);
    const [error, setError] = useState('');
    const [voice, setVoice] = useState('');
    const [voices, setVoices] = useState([]);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const animRef = useRef(null);
    const scrollRef = useRef(null);
    const convoRef = useRef([]);

    // Load TTS voices
    useEffect(() => {
        const load = () => {
            const v = synthRef.current.getVoices().filter(v => v.lang.startsWith('en'));
            setVoices(v);
            if (!voice && v.length) setVoice(v[0].name);
        };
        load();
        synthRef.current.onvoiceschanged = load;
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Animate bars
    const animateBars = useCallback((active, style = 'listen') => {
        if (!active) { setBarHeights(Array(NUM_BARS).fill(4)); return; }
        const tick = () => {
            setBarHeights(prev => prev.map((h, i) => {
                if (style === 'think') {
                    const target = 4 + 20 * Math.abs(Math.sin(Date.now() / 400 + i * 0.5));
                    return h + (target - h) * 0.2;
                }
                const target = Math.random() > 0.6 ? 4 + Math.random() * 28 : 4;
                return h + (target - h) * 0.3;
            }));
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
    }, []);

    const stopAnim = useCallback(() => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setBarHeights(Array(NUM_BARS).fill(4));
    }, []);

    // Speak response
    const speak = useCallback((text) => {
        if (muted) { setStatus('idle'); return; }
        synthRef.current.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const sel = voices.find(v => v.name === voice);
        if (sel) utter.voice = sel;
        utter.rate = 1; utter.pitch = 1;
        utter.onstart = () => { setStatus('speaking'); animateBars(true, 'speak'); };
        utter.onend = () => { stopAnim(); setStatus('idle'); };
        utter.onerror = () => { stopAnim(); setStatus('idle'); };
        synthRef.current.speak(utter);
    }, [muted, voice, voices, animateBars, stopAnim]);

    // Call AI
    const askAI = useCallback(async (userText) => {
        setStatus('thinking');
        animateBars(true, 'think');

        convoRef.current = [...convoRef.current, { role: 'user', content: userText }];
        setMessages(prev => [...prev, { role: 'user', text: userText }]);

        try {
            const reply = await voiceChat(convoRef.current, notesContext);
            convoRef.current = [...convoRef.current, { role: 'assistant', content: reply }];
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
            stopAnim();
            speak(reply);
        } catch (err) {
            stopAnim();
            setError(err.message);
            setStatus('error');
        }
    }, [animateBars, stopAnim, speak, notesContext]);

    // Start listening
    const startListening = useCallback(() => {
        setError('');
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setError('Speech recognition not supported. Use Chrome.'); setStatus('error'); return; }

        synthRef.current.cancel();
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        recognitionRef.current = rec;

        rec.onstart = () => { setStatus('listening'); animateBars(true, 'listen'); };
        rec.onresult = (e) => {
            setLiveText(Array.from(e.results).map(r => r[0].transcript).join(''));
        };
        rec.onend = () => {
            stopAnim();
            setLiveText(prev => {
                if (prev.trim()) askAI(prev.trim());
                else setStatus('idle');
                return '';
            });
        };
        rec.onerror = (e) => {
            stopAnim(); setLiveText('');
            if (e.error !== 'aborted') { setError('Mic error: ' + e.error); setStatus('error'); }
            else setStatus('idle');
        };
        rec.start();
    }, [animateBars, stopAnim, askAI]);

    const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

    const handleMainBtn = () => {
        if (status === 'listening') stopListening();
        else if (status === 'idle' || status === 'error') startListening();
    };

    const clearAll = () => {
        synthRef.current.cancel();
        if (recognitionRef.current) recognitionRef.current.abort();
        stopAnim();
        setMessages([]); convoRef.current = [];
        setLiveText(''); setError(''); setStatus('idle');
    };

    const isRecording = status === 'listening';
    const isBusy = status === 'thinking' || status === 'speaking';
    const statusLabels = { idle: 'READY', listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING', error: 'ERROR' };
    const statusColors = { idle: 'var(--text-muted)', listening: '#00d4ff', thinking: '#fbbf24', speaking: 'var(--success)', error: 'var(--error)' };

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '640px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-lg), 0 0 60px rgba(99,102,241,0.1)', position: 'relative' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status], boxShadow: `0 0 10px ${statusColors[status]}`, animation: status !== 'idle' ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-light)' }}>GEMINI VOICE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${statusColors[status]}`, color: statusColors[status], background: `${statusColors[status]}12` }}>{statusLabels[status]}</span>
                        <button onClick={onClose} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '8px', padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                    </div>
                </div>

                {/* Visualizer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 20px', gap: '24px' }}>
                    {/* Orb */}
                    <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {[0, -10, -20].map((inset, i) => (
                            <div key={i} style={{
                                position: 'absolute', inset: `${inset}px`, borderRadius: '50%',
                                border: `1px solid rgba(${i === 1 ? '139,92,246' : '99,102,241'}, ${0.2 - i * 0.05})`,
                                animation: `spin ${8 + i * 4}s linear infinite ${i % 2 ? 'reverse' : ''}`
                            }} />
                        ))}
                        <div style={{
                            width: '70px', height: '70px', borderRadius: '50%',
                            background: status === 'thinking'
                                ? 'radial-gradient(circle at 35% 35%, rgba(251,191,36,0.4), rgba(139,92,246,0.6), var(--bg-primary))'
                                : status === 'speaking'
                                ? 'radial-gradient(circle at 35% 35%, rgba(52,211,153,0.4), rgba(99,102,241,0.5), var(--bg-primary))'
                                : 'radial-gradient(circle at 35% 35%, rgba(99,102,241,0.4), rgba(139,92,246,0.6), var(--bg-primary))',
                            boxShadow: `0 0 20px ${statusColors[status]}50, 0 0 60px ${statusColors[status]}20, inset 0 0 20px rgba(0,0,0,0.5)`,
                            animation: status === 'listening' ? 'orbListen 0.5s ease-in-out infinite alternate'
                                : status === 'thinking' ? 'orbThink 1.5s ease-in-out infinite'
                                : status === 'speaking' ? 'orbSpeak 0.3s ease-in-out infinite alternate'
                                : 'none',
                            transition: 'all 0.3s'
                        }} />
                    </div>

                    {/* Bars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '40px' }}>
                        {barHeights.map((h, i) => (
                            <div key={i} style={{
                                width: '3px', borderRadius: '2px',
                                height: `${Math.max(4, Math.min(40, h))}px`,
                                background: status === 'speaking' ? 'var(--success)' : status === 'thinking' ? '#fbbf24' : 'var(--accent-light)',
                                opacity: status !== 'idle' && status !== 'error' ? 1 : 0.3,
                                boxShadow: status !== 'idle' ? `0 0 4px ${statusColors[status]}` : 'none',
                                transition: 'height 0.1s, opacity 0.1s'
                            }} />
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && <div style={{ margin: '0 20px 12px', padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>{error}</div>}

                {/* Transcript */}
                <div ref={scrollRef} className="scroll-y" style={{ margin: '0 20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', minHeight: '140px', maxHeight: '200px', padding: '14px' }}>
                    {messages.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '112px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>— tap mic to start talking —</div>
                    ) : messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '12px', animation: 'fadeSlideIn 0.3s ease forwards' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: m.role === 'user' ? '#00d4ff' : 'var(--success)', width: '36px', flexShrink: 0, marginTop: '2px' }}>{m.role === 'user' ? 'YOU' : 'AI'}</span>
                            <span style={{ fontSize: '13px', lineHeight: 1.55, flex: 1 }}>{m.text}</span>
                        </div>
                    ))}
                </div>

                {/* Live text */}
                {liveText && <div style={{ margin: '8px 20px 0', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00d4ff', opacity: 0.7, fontStyle: 'italic' }}>{liveText}</div>}

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px 20px' }}>
                    <button onClick={() => setMuted(m => !m)} style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.1rem', transition: 'all 0.2s' }}>
                        {muted ? '🔇' : '🔊'}
                    </button>

                    <button onClick={handleMainBtn} disabled={isBusy} style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: isRecording ? 'linear-gradient(135deg, var(--error), #9f1239)' : 'var(--accent-gradient)',
                        border: 'none', cursor: isBusy ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isRecording ? '0 0 20px rgba(248,113,113,0.4)' : '0 0 20px rgba(99,102,241,0.3)',
                        transition: 'all 0.2s', opacity: isBusy ? 0.5 : 1,
                        animation: isRecording ? 'btnPulse 1.5s ease-out infinite' : 'none'
                    }}>
                        {isRecording ? <span style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '3px' }} /> : <span style={{ fontSize: '1.5rem' }}>🎤</span>}
                    </button>

                    <button onClick={clearAll} style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', transition: 'all 0.2s' }}>
                        🗑️
                    </button>
                </div>

                {/* Voice selector */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Voice</span>
                    <select value={voice} onChange={e => setVoice(e.target.value)} style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '5px 8px', cursor: 'pointer', outline: 'none', flex: 1
                    }}>
                        {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
                @keyframes orbListen { from { transform: scale(1) } to { transform: scale(1.08) } }
                @keyframes orbThink { 0%,100% { transform: scale(1) rotate(0deg) } 50% { transform: scale(1.05) rotate(180deg) } }
                @keyframes orbSpeak { from { transform: scale(1) } to { transform: scale(1.06) } }
                @keyframes btnPulse { 0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.4) } 70% { box-shadow: 0 0 0 14px rgba(248,113,113,0) } 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0) } }
                @keyframes fadeSlideIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
            `}</style>
        </div>
    );
}
