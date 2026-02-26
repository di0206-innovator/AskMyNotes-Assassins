import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, X, RefreshCw, Send, CheckCircle, AlertCircle, Award } from 'lucide-react';
import { getApiUrl } from '../utils/geminiApi';
import confetti from 'canvas-confetti';

export default function ExamMode({ subject, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [examData, setExamData] = useState(null);

    // State for student answers
    const [answers, setAnswers] = useState({});

    // State for grading
    const [isGrading, setIsGrading] = useState(false);
    const [results, setResults] = useState(null); // { mcqs: { score, total }, essays: { id: { score, feedback } } }
    const [isSubmitted, setIsSubmitted] = useState(false);

    const generateExam = async () => {
        setLoading(true); setError(''); setExamData(null); setAnswers({}); setIsSubmitted(false); setResults(null);
        const chunks = subject.notesChunks.slice(0, 20); // first 20 chunks
        if (!chunks.length) { setError('Upload notes first to generate an exam.'); setLoading(false); return; }

        try {
            const response = await fetch(getApiUrl('/api/exam'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: subject.name, chunks })
            });
            if (!response.ok) throw new Error('Failed to generate exam');
            const data = await response.json();
            setExamData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { generateExam(); }, []);

    const handleMcqSelect = (id, option) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [id]: option }));
    };

    const handleEssayChange = (id, text) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [id]: text }));
    };

    const submitExam = async () => {
        setIsGrading(true);
        setIsSubmitted(true);
        try {
            // Grade MCQs instantly
            let mcqCorrect = 0;
            examData.mcqs.forEach(mcq => {
                if (answers[mcq.id] === mcq.correctOption) mcqCorrect++;
            });

            // Grade essays via AI sequentially
            let essayResults = {};
            const chunks = subject.notesChunks.slice(0, 20);

            for (const essay of examData.essays) {
                const studentAns = answers[essay.id] || "No answer provided.";
                const res = await fetch(getApiUrl('/api/grade'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: essay.question, studentAnswer: studentAns, chunks })
                });

                if (res.ok) {
                    const gradeData = await res.json();
                    essayResults[essay.id] = gradeData;
                } else {
                    essayResults[essay.id] = { score: 0, feedback: "Failed to grade this question.", idealPoints: [] };
                }
            }

            setResults({
                mcqs: { correct: mcqCorrect, total: examData.mcqs.length },
                essays: essayResults
            });

            // Trigger confetti if they did well
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

        } catch (err) {
            console.error("Grading failed:", err);
            setError("Failed to grade exam automatically.");
        } finally {
            setIsGrading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: '850px', height: '90vh',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ClipboardList size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Mock Exam</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{subject.name} · AI Evaluated</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}><X size={20} /></button>
                </div>

                {/* Content Area */}
                <div className="scroll-y" style={{ flex: 1, padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                <RefreshCw size={32} color="var(--brand-primary)" />
                            </motion.div>
                            <p style={{ color: 'var(--text-secondary)' }}>Drafting exam questions from your notes...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--error)' }}>
                            <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                            <p>{error}</p>
                        </div>
                    )}

                    {examData && !loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* RESULTS HEADER */}
                            {isSubmitted && !isGrading && results && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                                    style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}
                                >
                                    <Award size={40} color="#34d399" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ color: '#34d399', fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>Exam Graded</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Multiple Choice: {results.mcqs.correct}/{results.mcqs.total} correct.
                                        Check detailed feedback below for your essays.
                                    </p>
                                </motion.div>
                            )}

                            {/* MCQs */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Multiple Choice</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {examData.mcqs.map((mcq, idx) => (
                                        <div key={mcq.id} style={{ background: 'var(--bg-glass)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <p style={{ margin: '0 0 1rem 0', fontWeight: 500, lineHeight: 1.5 }}>{idx + 1}. {mcq.question}</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.5rem' }}>
                                                {Object.entries(mcq.options).map(([optKey, optText]) => {
                                                    const isSelected = answers[mcq.id] === optKey;
                                                    const isCorrect = mcq.correctOption === optKey;

                                                    let bg = isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.2)';
                                                    let borderColor = isSelected ? 'var(--brand-primary)' : 'var(--border)';

                                                    // Grading override
                                                    if (isSubmitted) {
                                                        if (isCorrect) { bg = 'rgba(52,211,153,0.2)'; borderColor = '#34d399'; }
                                                        else if (isSelected && !isCorrect) { bg = 'rgba(248,113,113,0.2)'; borderColor = '#f87171'; }
                                                    }

                                                    return (
                                                        <div
                                                            key={optKey}
                                                            onClick={() => handleMcqSelect(mcq.id, optKey)}
                                                            style={{
                                                                padding: '0.75rem', borderRadius: '8px', border: `1px solid ${borderColor}`, background: bg,
                                                                cursor: isSubmitted ? 'default' : 'pointer', transition: 'all 0.2s', display: 'flex', gap: '10px'
                                                            }}
                                                        >
                                                            <strong style={{ color: 'var(--text-muted)' }}>{optKey}.</strong>
                                                            <span style={{ flex: 1 }}>{optText}</span>
                                                            {isSubmitted && isCorrect && <CheckCircle size={16} color="#34d399" />}
                                                            {isSubmitted && isSelected && !isCorrect && <X size={16} color="#f87171" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Essays */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Short Essay</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {examData.essays.map((essay, idx) => {
                                        const gradeData = results?.essays?.[essay.id];
                                        return (
                                            <div key={essay.id} style={{ background: 'var(--bg-glass)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <p style={{ margin: '0 0 1rem 0', fontWeight: 500, lineHeight: 1.5 }}>{idx + 1}. {essay.question}</p>
                                                <textarea
                                                    value={answers[essay.id] || ''}
                                                    onChange={e => handleEssayChange(essay.id, e.target.value)}
                                                    placeholder="Type your answer here..."
                                                    disabled={isSubmitted}
                                                    style={{
                                                        width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '8px',
                                                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                                                        resize: 'vertical', fontFamily: 'inherit', marginBottom: gradeData ? '1rem' : 0
                                                    }}
                                                />

                                                {/* Essay Feedback */}
                                                <AnimatePresence>
                                                    {gradeData && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                            style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '1rem', borderLeft: `3px solid ${gradeData.score >= 80 ? '#34d399' : gradeData.score >= 50 ? '#f59e0b' : '#f87171'}` }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                <strong style={{ color: 'var(--text-primary)' }}>AI Feedback</strong>
                                                                <strong style={{ color: gradeData.score >= 80 ? '#34d399' : '#f87171' }}>Score: {gradeData.score}/100</strong>
                                                            </div>
                                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{gradeData.feedback}</p>
                                                            {gradeData.idealPoints?.length > 0 && (
                                                                <div>
                                                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Key points missed:</strong>
                                                                    <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                        {gradeData.idealPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn-ghost small" onClick={generateExam} disabled={loading || isGrading} style={{ opacity: (loading || isGrading) ? 0.5 : 1 }}>
                        <RefreshCw size={14} /> New Exam
                    </button>

                    {examData && !isSubmitted && (
                        <button className="btn-primary" onClick={submitExam} disabled={isGrading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isGrading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                            {isGrading ? 'Grading Exam...' : 'Submit to Professor AI'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
