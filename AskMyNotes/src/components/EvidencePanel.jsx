import { useState, useEffect, useRef } from 'react';
import { extractKeywords } from '../utils/retrieval';

export default function EvidencePanel({ chunks, query, highlightCitation, isOpen, onClose }) {
    const cardRefs = useRef({});
    const [flashIdx, setFlashIdx] = useState(null);

    useEffect(() => {
        if (highlightCitation) {
            const key = `${highlightCitation.fileName}_${highlightCitation.chunkIndex}`;
            const el = cardRefs.current[key];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setFlashIdx(key);
                setTimeout(() => setFlashIdx(null), 1200);
            }
        }
    }, [highlightCitation]);

    const keywords = extractKeywords(query);

    const highlightText = (text) => {
        if (!keywords.length || !text) return text;
        const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
        return text.split(regex).map((part, i) =>
            keywords.some(kw => part.toLowerCase() === kw.toLowerCase())
                ? <span key={i} className="highlight">{part}</span>
                : part
        );
    };

    return (
        <div className={`evidence-panel ${isOpen ? 'open' : ''}`}>
            <div style={{ padding: '1.1rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>Evidence</h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{chunks.length} chunks retrieved</p>
                </div>
                <button onClick={onClose} className="responsive-toggle" style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '6px', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '0.75rem' }}>
                {chunks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>🔍</div>
                        <p>Ask a question to see relevant evidence chunks here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {chunks.map((chunk, i) => {
                            const key = `${chunk.fileName}_${chunk.chunkIndex}`;
                            return (
                                <div key={i} ref={(el) => cardRefs.current[key] = el}
                                    className={flashIdx === key ? 'flash-animate' : ''}
                                    style={{ padding: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', transition: 'all 0.2s' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>{chunk.fileName}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>p.{chunk.pageNumber} #{chunk.chunkIndex}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
                                        {highlightText(chunk.text?.slice(0, 300))}{chunk.text?.length > 300 ? '…' : ''}
                                    </p>
                                    {chunk.score != null && (
                                        <div style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            Relevance: {chunk.score > 0 ? `${chunk.score} matches` : 'context chunk'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
