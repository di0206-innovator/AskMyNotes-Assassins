import { useState, useEffect } from 'react';
import { generateStudyMaterials } from '../utils/anthropicApi';

function Flashcard({ mcq }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="flashcard-container" style={{ height: '320px', marginBottom: '1rem' }} onClick={() => setFlipped(!flipped)}>
            <div className={`flashcard ${flipped ? 'flipped' : ''} card`} style={{ padding: 0 }}>

                {/* Front */}
                <div className="flashcard-face flashcard-front" style={{ padding: '1.5rem', justifyContent: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', lineHeight: 1.4 }}>{mcq.question}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <div key={opt} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.9rem' }}>
                                <strong style={{ opacity: 0.8 }}>{opt}.</strong> {mcq.options[opt]}
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>Click to flip</div>
                </div>

                {/* Back */}
                <div className="flashcard-face flashcard-back" style={{ padding: '1.5rem', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#4ade80' }}>Correct Answer: {mcq.correctOption}</h3>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem', overflowY: 'auto', flex: 1 }}>{mcq.explanation}</p>
                    <div style={{ marginTop: 'auto', fontSize: '0.8rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                        Source: {mcq.citation?.fileName} | Page {mcq.citation?.pageNumber}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>Click to flip back</div>
                </div>

            </div>
        </div>
    );
}

function Accordion({ item }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
            <div
                onClick={() => setOpen(!open)}
                style={{ padding: '1.25rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: open ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background var(--transition)' }}
            >
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', lineHeight: 1.4, paddingRight: '1rem' }}>{item.question}</span>
                <span style={{ fontSize: '1.5rem', lineHeight: 0.5, opacity: 0.5 }}>{open ? '−' : '+'}</span>
            </div>
            {open && (
                <div style={{ padding: '1.25rem 1rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{item.modelAnswer}</p>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                        Source: {item.citation?.fileName} | Page {item.citation?.pageNumber}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudyMode({ subject, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const fetchMaterials = async () => {
        setLoading(true);
        setError('');
        setData(null);

        const first20Chunks = subject.notesChunks.slice(0, 20);
        if (first20Chunks.length === 0) {
            setError('No document chunks available to generate study materials. Please upload notes first.');
            setLoading(false);
            return;
        }

        try {
            const result = await generateStudyMaterials(null, subject.name, first20Chunks);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    return (
        <div className="modal-overlay open" style={{ padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', color: subject.colorHex }}>Study Mode: {subject.name}</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Generated from the first 20 chunks of your notes.</p>
                    </div>
                    <button onClick={onClose} style={{ fontSize: '1.75rem', lineHeight: 1, opacity: 0.6, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>✕</button>
                </div>

                <div className="scroll-y" style={{ flex: 1, padding: '1.5rem', background: 'var(--bg-color)' }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', opacity: 0.8 }}>
                            <div className="typing-dots" style={{ transform: 'scale(2)' }}><span /><span /><span /></div>
                            <p style={{ fontSize: '1.1rem' }}>Generating flashcards and questions from your notes...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', textAlign: 'center', marginTop: '3rem', maxWidth: '500px', margin: '3rem auto' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠</div>
                            <p style={{ fontSize: '1.1rem', lineHeight: 1.5 }}>{error}</p>
                        </div>
                    )}

                    {data && !loading && (
                        <>
                            <div style={{ marginBottom: '3rem' }}>
                                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', color: subject.colorHex }}>Multiple Choice</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {data.mcqs?.map((mcq, i) => <Flashcard key={i} mcq={mcq} />)}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', color: subject.colorHex }}>Short Answer</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {data.shortAnswer?.map((sa, i) => <Accordion key={i} item={sa} />)}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={fetchMaterials}
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'white',
                            color: 'black',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            opacity: loading ? 0.5 : 1,
                            transition: 'opacity var(--transition)'
                        }}
                    >
                        Regenerate
                    </button>
                </div>
            </div>
        </div>
    );
}
