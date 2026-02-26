import { useState, useEffect } from 'react';
import { generateStudyMaterials } from '../utils/geminiApi';

function Flashcard({ mcq, color }) {
    const [flipped, setFlipped] = useState(false);
    return (
        <div className="flashcard-container" style={{ height: '300px', marginBottom: '0.75rem' }} onClick={() => setFlipped(!flipped)}>
            <div className={`flashcard ${flipped ? 'flipped' : ''}`} style={{ padding: 0 }}>
                <div className="flashcard-face flashcard-front" style={{ padding: '1.25rem', justifyContent: 'space-between', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <h3 style={{ fontSize: '0.95rem', lineHeight: 1.4, fontWeight: 500, marginBottom: '0.75rem' }}>{mcq.question}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <div key={opt} style={{ padding: '0.45rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid var(--border)' }}>
                                <strong style={{ color: 'var(--accent-light)', marginRight: '6px' }}>{opt}.</strong>{mcq.options?.[opt]}
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap to reveal answer</div>
                </div>
                <div className="flashcard-face flashcard-back" style={{ padding: '1.25rem', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Answer: {mcq.correctOption}</div>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.55, flex: 1, overflowY: 'auto', color: 'var(--text-secondary)' }}>{mcq.explanation}</p>
                    <div style={{ marginTop: 'auto', paddingTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {mcq.citation?.fileName} p.{mcq.citation?.pageNumber}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap to flip back</div>
                </div>
            </div>
        </div>
    );
}

function Accordion({ item }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ marginBottom: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div onClick={() => setOpen(!open)} style={{ padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: open ? 'var(--bg-elevated)' : 'transparent', transition: 'background 0.15s' }}>
                <span style={{ fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.4, paddingRight: '1rem', color: 'var(--text-primary)' }}>{item.question}</span>
                <span style={{ fontSize: '1.2rem', opacity: 0.4, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : '' }}>+</span>
            </div>
            {open && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem', color: 'var(--text-secondary)' }}>{item.modelAnswer}</p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.citation?.fileName} p.{item.citation?.pageNumber}
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
        setLoading(true); setError(''); setData(null);
        const chunks = subject.notesChunks.slice(0, 20);
        if (!chunks.length) { setError('Upload notes first to generate study materials.'); setLoading(false); return; }
        try {
            const result = await generateStudyMaterials(subject.name, chunks);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchMaterials(); }, []);

    return (
        <div className="modal-overlay" style={{ padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '880px', height: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600 }}>🎓 Study Mode</h2>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{subject.name} · AI-generated questions</p>
                    </div>
                    <button onClick={onClose} style={{ fontSize: '1.3rem', opacity: 0.5, padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: '8px', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Content */}
                <div className="scroll-y" style={{ flex: 1, padding: '1.25rem' }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
                            <div className="typing-dots" style={{ transform: 'scale(2)' }}><span /><span /><span /></div>
                            <p style={{ color: 'var(--text-secondary)' }}>Generating study materials...</p>
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
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-light)' }}>Multiple Choice</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                    {data.mcqs?.map((mcq, i) => <Flashcard key={i} mcq={mcq} />)}
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-light)' }}>Short Answer</h3>
                                {data.shortAnswer?.map((sa, i) => <Accordion key={i} item={sa} />)}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={fetchMaterials} disabled={loading}
                        style={{ padding: '0.6rem 1.25rem', background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', fontSize: '0.85rem' }}
                    >Regenerate</button>
                </div>
            </div>
        </div>
    );
}
