import { useEffect, useRef } from 'react';
import { extractKeywords } from '../utils/retrieval';

function HighlightedText({ text, query }) {
    if (!query) return <>{text}</>;
    const keywords = extractKeywords(query);
    if (keywords.length === 0) return <>{text}</>;

    const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((p, i) =>
                i % 2 === 1 ? <span key={i} className="highlight">{p}</span> : p
            )}
        </>
    );
}

export default function EvidencePanel({ chunks, query, highlightCitation, isOpen, onClose }) {
    const scrollRef = useRef(null);
    const cardRefs = useRef({});

    useEffect(() => {
        if (highlightCitation && cardRefs.current) {
            const { fileName, pageNumber, chunkIndex } = highlightCitation;
            const key = `${fileName}_${pageNumber}_${chunkIndex}`;
            const el = cardRefs.current[key];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-animate');
                setTimeout(() => el.classList.remove('flash-animate'), 1000);
            }
        }
    }, [highlightCitation]);

    return (
        <div className={`evidence-panel ${isOpen ? 'open' : ''}`}>
            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>Evidence</h2>
                {/* On tablet/mobile, we want a close button to dismiss the drawer */}
                <button
                    onClick={onClose}
                    style={{ background: 'var(--surface-color)', padding: '4px 8px', borderRadius: '4px' }}
                    className="mobile-close-btn"
                >
                    ✕
                </button>
            </div>

            <div className="scroll-y" ref={scrollRef} style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {chunks.length === 0 ? (
                    <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
                        No evidence retrieved yet. Ask a question to see the notes context here.
                    </div>
                ) : (
                    chunks.map((chunk) => {
                        const key = `${chunk.fileName}_${chunk.pageNumber}_${chunk.chunkIndex}`;
                        return (
                            <div
                                key={key}
                                ref={el => cardRefs.current[key] = el}
                                className="card"
                                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                            >
                                <div style={{ fontSize: '0.75rem', opacity: 0.7, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                                    <span style={{ color: 'var(--subject-2)' }}>File: {chunk.fileName}</span>
                                    <span style={{ color: 'var(--subject-3)' }}>Page: {chunk.pageNumber}</span>
                                    <span style={{ color: 'var(--subject-1)' }}>Chunk: {chunk.chunkIndex}</span>
                                </div>
                                <div className="evidence-text" style={{ fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    <HighlightedText text={chunk.text} query={query} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
