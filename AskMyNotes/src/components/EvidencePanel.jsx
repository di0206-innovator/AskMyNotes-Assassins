import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Hash } from 'lucide-react';
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
            <div style={{
                padding: '1.1rem 1rem', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div>
                    <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Search size={16} color="var(--accent-light)" />
                        Evidence
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>{chunks.length} chunks retrieved</p>
                </div>
                <button onClick={onClose} className="responsive-toggle btn-ghost" style={{ padding: '4px 8px' }}>
                    <X size={16} />
                </button>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '0.75rem' }}>
                {chunks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}
                    >
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}
                        >
                            🔍
                        </motion.div>
                        <p>Ask a question to see relevant evidence chunks here.</p>
                    </motion.div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {chunks.map((chunk, i) => {
                            const key = `${chunk.fileName}_${chunk.chunkIndex}`;
                            return (
                                <motion.div
                                    key={i}
                                    ref={(el) => cardRefs.current[key] = el}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={flashIdx === key ? 'flash-animate' : ''}
                                    style={{
                                        padding: '0.85rem', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                                        border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)',
                                        transition: 'all 0.25s',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FileText size={11} /> {chunk.fileName}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            p.{chunk.pageNumber} <Hash size={10} />{chunk.chunkIndex}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                                        {highlightText(chunk.text?.slice(0, 300))}{chunk.text?.length > 300 ? '…' : ''}
                                    </p>
                                    {chunk.score != null && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (chunk.score / 10) * 100)}%` }}
                                                    transition={{ duration: 0.6, delay: i * 0.05 }}
                                                    style={{ height: '100%', background: 'var(--accent-gradient)', borderRadius: '2px' }}
                                                />
                                            </div>
                                            <div style={{ marginTop: '3px', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                relevance: {chunk.score > 0 ? `${chunk.score} matches` : 'context'}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
