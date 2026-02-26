import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, X, RefreshCw, CheckCircle, ChevronDown, BookOpen, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateStudyMaterials } from '../utils/geminiApi';

function Flashcard({ mcq, index, onReview, isReviewed }) {
    const [flipped, setFlipped] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);

    const handleOptionClick = (e, opt) => {
        e.stopPropagation();
        if (selectedOption || isReviewed) return;
        setSelectedOption(opt);
        setTimeout(() => setFlipped(true), 800);
    };

    const handleRating = (e, rating) => {
        e.stopPropagation();
        onReview(index, rating);
        setFlipped(false);
    };

    if (isReviewed) return null; // Hide reviewed cards to focus on remaining

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flashcard-container"
            style={{ height: '320px', marginBottom: '0.75rem' }}
            onClick={() => { if (selectedOption) setFlipped(!flipped); }}
        >
            <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
                <div className="flashcard-face flashcard-front" style={{
                    padding: '1.25rem', justifyContent: 'space-between',
                    background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)',
                }}>
                    <h3 style={{ fontSize: '0.92rem', lineHeight: 1.5, fontWeight: 500, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>{mcq.question}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {['A', 'B', 'C', 'D'].map(opt => {
                            const isCorrect = opt === mcq.correctOption;
                            const isSelected = opt === selectedOption;
                            let bg = 'rgba(0,0,0,0.25)';
                            let borderColor = 'var(--border)';
                            if (selectedOption) {
                                if (isCorrect) { bg = 'var(--success-bg)'; borderColor = 'rgba(52,211,153,0.4)'; }
                                else if (isSelected && !isCorrect) { bg = 'var(--error-bg)'; borderColor = 'rgba(248,113,113,0.4)'; }
                            }
                            return (
                                <motion.div
                                    key={opt}
                                    whileHover={!selectedOption ? { scale: 1.01, borderColor: 'var(--accent)' } : {}}
                                    onClick={(e) => handleOptionClick(e, opt)}
                                    style={{
                                        padding: '0.5rem 0.7rem', background: bg, borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.82rem', border: `1px solid ${borderColor}`,
                                        cursor: selectedOption ? 'default' : 'pointer',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                                    }}
                                >
                                    <strong style={{ color: 'var(--accent-light)', minWidth: '20px' }}>{opt}.</strong>
                                    <span style={{ color: 'var(--text-secondary)' }}>{mcq.options?.[opt]}</span>
                                    {selectedOption && isCorrect && <CheckCircle size={14} color="var(--success)" style={{ marginLeft: 'auto' }} />}
                                </motion.div>
                            );
                        })}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {selectedOption ? 'Tap to see explanation' : 'Select an answer'}
                    </div>
                </div>

                {/* BACK OF CARD with SRS Ratings */}
                <div className="flashcard-face flashcard-back" style={{
                    padding: '1.5rem', justifyContent: 'center',
                    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column'
                }}>
                    <div className="badge badge-success" style={{ marginBottom: '0.85rem', alignSelf: 'flex-start' }}>
                        Answer: {mcq.correctOption}
                    </div>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.65, flex: 1, overflowY: 'auto', color: 'var(--text-secondary)' }}>{mcq.explanation}</p>
                    <div style={{ marginTop: 'auto', paddingTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={11} /> {mcq.citation?.fileName} p.{mcq.citation?.pageNumber}
                    </div>

                    {/* SRS Buttons */}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>How well do you know this?</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <button onClick={(e) => handleRating(e, 'hard')} style={{ flex: 1, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Hard</button>
                            <button onClick={(e) => handleRating(e, 'good')} style={{ flex: 1, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Good</button>
                            <button onClick={(e) => handleRating(e, 'easy')} style={{ flex: 1, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Easy</button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function Accordion({ item, index }) {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            style={{
                marginBottom: '0.5rem', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)',
                overflow: 'hidden', transition: 'all 0.2s',
            }}
        >
            <div onClick={() => setOpen(!open)} style={{
                padding: '1rem 1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: open ? 'rgba(99,102,241,0.05)' : 'transparent', transition: 'background 0.2s',
            }}>
                <span style={{ fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.45, paddingRight: '1rem', color: 'var(--text-primary)' }}>{item.question}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown size={18} color="var(--text-muted)" />
                </motion.div>
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '1rem 1.1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                            <p style={{ fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1rem', color: 'var(--text-secondary)' }}>{item.modelAnswer}</p>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <BookOpen size={11} /> {item.citation?.fileName} p.{item.citation?.pageNumber}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function StudyMode({ subject, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [reviewedCards, setReviewedCards] = useState({});
    const [allReviewed, setAllReviewed] = useState(false);

    const fetchMaterials = async () => {
        setLoading(true); setError(''); setData(null); setReviewedCards({}); setAllReviewed(false);
        const chunks = subject.notesChunks.slice(0, 20);
        if (!chunks.length) { setError('Upload notes first to generate study materials.'); setLoading(false); return; }
        try {
            const result = await generateStudyMaterials(subject.name, chunks);
            setData(result);
            setReviewedCards({});
            setAllReviewed(false);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const handleReview = (index, rating) => {
        const newReviewed = { ...reviewedCards, [index]: rating };
        setReviewedCards(newReviewed);

        // Check if all cards are reviewed
        if (data?.mcqs && Object.keys(newReviewed).length === data.mcqs.length) {
            setAllReviewed(true);
            triggerConfetti();
        }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    useEffect(() => { fetchMaterials(); }, []);

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    width: '100%', maxWidth: '900px', height: '90vh',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
                }}
            >
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                        }}>
                            <GraduationCap size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Study Mode</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{subject.name} · AI-generated questions</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="btn-ghost"
                        style={{ padding: '6px' }}
                    >
                        <X size={20} />
                    </motion.button>
                </div>

                {/* Content */}
                <div className="scroll-y" style={{ flex: 1, padding: '1.5rem' }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                <RefreshCw size={32} color="var(--accent-light)" />
                            </motion.div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Generating study materials...</p>
                        </div>
                    )}
                    {error && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--error)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠</div>
                            <p>{error}</p>
                        </div>
                    )}
                    {data && !loading && (
                        <>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={16} /> Multiple Choice
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                    <AnimatePresence>
                                        {data.mcqs?.map((mcq, i) => (
                                            <Flashcard
                                                key={i}
                                                mcq={mcq}
                                                index={i}
                                                isReviewed={!!reviewedCards[i]}
                                                onReview={handleReview}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                                {allReviewed && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        style={{ textAlign: 'center', padding: '2rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}
                                    >
                                        <PartyPopper size={32} color="#34d399" style={{ margin: '0 auto 1rem' }} />
                                        <h4 style={{ color: '#34d399', fontSize: '1.2rem', marginBottom: '0.5rem' }}>All Cards Reviewed!</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Great job progressing through your study material.</p>
                                    </motion.div>
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <BookOpen size={16} /> Short Answer
                                </h3>
                                {data.shortAnswer?.map((sa, i) => <Accordion key={i} item={sa} index={i} />)}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={fetchMaterials}
                        disabled={loading}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.5 : 1, fontSize: '0.85rem' }}
                    >
                        <RefreshCw size={14} /> Regenerate
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
