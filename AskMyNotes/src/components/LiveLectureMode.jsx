import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, X, RefreshCw, FileText, CheckCircle, AlertCircle, Waves } from 'lucide-react';
import { getApiUrl } from '../utils/geminiApi';
import toast from 'react-hot-toast';

export default function LiveLectureMode({ subject, dispatch, onClose }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript, interimTranscript]);

    useEffect(() => {
        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentFinal += event.results[i][0].transcript + ' ';
                } else {
                    currentInterim += event.results[i][0].transcript;
                }
            }

            if (currentFinal) {
                setTranscript(prev => prev + currentFinal);
            }
            setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            if (event.error !== 'no-speech') {
                setError(`Microphone error: ${event.error}`);
                setIsRecording(false);
            }
        };

        recognition.onend = () => {
            // Auto restart if still supposed to be recording (handles internal timeouts)
            if (isRecording && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) { }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [isRecording]);

    const toggleRecording = () => {
        if (!recognitionRef.current) return;

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            setError('');
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error(err);
                // If it's already started
                setIsRecording(true);
            }
        }
    };

    const processLecture = async () => {
        const fullText = (transcript + ' ' + interimTranscript).trim();
        if (!fullText) {
            toast.error("No audio transcribed yet.");
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        }

        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch(getApiUrl('/api/summarize-lecture'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: fullText })
            });

            if (!response.ok) throw new Error('Failed to summarize lecture');

            const data = await response.json();

            // Add the new chunk to the subject
            const newChunkId = `lecture-${Date.now()}`;
            const newChunk = {
                id: newChunkId,
                text: `[LIVE LECTURE SUMMARY]\n\n${data.summary}\n\n[ORIGINAL TRANSCRIPT]\n${fullText}`,
                metadata: {
                    fileName: 'Live Lecture Capture',
                    pageNumber: 1
                }
            };

            dispatch({
                type: 'ADD_CHUNKS',
                payload: { subjectId: subject.id, chunks: [newChunk] }
            });

            toast.success("Lecture summarized and added to your notes!");
            onClose(); // Exit on success

        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: '800px', height: '85vh',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mic size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Live Lecture Mode</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{subject.name} · Real-time Transcription</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }} disabled={isProcessing}><X size={20} /></button>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>

                    {error && (
                        <div style={{ padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <AlertCircle size={20} />
                            <span style={{ fontSize: '0.9rem' }}>{error}</span>
                        </div>
                    )}

                    {!error && (
                        <div
                            ref={scrollRef}
                            style={{
                                flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border)',
                                borderRadius: '12px', padding: '1.5rem', overflowY: 'auto',
                                fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-primary)',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            {!transcript && !interimTranscript && !isProcessing && (
                                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Mic size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                    <p>Tap the microphone below to start capturing the lecture.</p>
                                    <p style={{ fontSize: '0.85rem' }}>AI will transcribe in real-time and summarize when you finish.</p>
                                </div>
                            )}

                            {isProcessing ? (
                                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ marginBottom: '1rem' }}>
                                        <RefreshCw size={40} color="#f59e0b" style={{ margin: 'auto' }} />
                                    </motion.div>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#f59e0b' }}>AI is summarizing the lecture...</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>This will be added to your study notes automatically.</p>
                                </div>
                            ) : (
                                <div>
                                    <span>{transcript}</span>
                                    {interimTranscript && (
                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}> {interimTranscript}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>

                    {/* Record Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleRecording}
                        disabled={isProcessing}
                        style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: isRecording ? 'rgba(248,113,113,0.1)' : 'var(--brand-primary)',
                            border: isRecording ? '2px solid #ef4444' : 'none',
                            color: isRecording ? '#ef4444' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 4px 15px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.3s', cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
                    </motion.button>

                    {/* Process Button */}
                    {(transcript || interimTranscript) && !isProcessing && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={processLecture}
                            className="btn-primary"
                            style={{
                                position: 'absolute', right: '1.5rem',
                                display: 'flex', alignItems: 'center', gap: '8px', background: '#f59e0b', color: '#fff',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                            }}
                        >
                            <FileText size={16} /> Summarize & Save
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
