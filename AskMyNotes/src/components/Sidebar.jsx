import { useState, useRef } from 'react';
import { parsePdf } from '../utils/pdfParser';
import { parseTxt } from '../utils/txtParser';

function EditableName({ name, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(name);

    const finish = () => { setEditing(false); if (val.trim()) onSave(val.trim()); else setVal(name); };

    if (editing) {
        return (
            <input value={val} onChange={(e) => setVal(e.target.value)} autoFocus
                onBlur={finish} onKeyDown={(e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { setEditing(false); setVal(name); } }}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-active)', color: 'inherit', width: '100%', padding: '2px 6px', borderRadius: '6px', outline: 'none', fontSize: '0.85rem' }}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }
    return <div onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ cursor: 'text', flex: 1, padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }} title="Click to rename">{name}</div>;
}

export default function Sidebar({ subjects, activeSubjectId, onSelect, dispatch, isOpen, onClose, userName, onLogout }) {
    const [parsing, setParsing] = useState({});

    const handleUpload = async (subjectId, files) => {
        for (const file of Array.from(files)) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'pdf' && ext !== 'txt') continue;

            const key = `${subjectId}_${file.name}`;
            setParsing(p => ({ ...p, [key]: 'loading' }));

            try {
                const chunks = ext === 'pdf' ? await parsePdf(file) : await parseTxt(file);
                dispatch({ type: 'ADD_FILE', subjectId, file: { name: file.name, size: file.size } });
                dispatch({ type: 'ADD_CHUNKS', subjectId, chunks });
                setParsing(p => ({ ...p, [key]: 'done' }));
                console.log(`[Sidebar] Parsed ${file.name}: ${chunks.length} chunks`);
            } catch (err) {
                console.error('[Sidebar] Parse error:', file.name, err);
                setParsing(p => ({ ...p, [key]: 'error' }));
            }
        }
    };

    return (
        <div className={`sidebar-panel ${isOpen ? 'open' : ''}`}>
            {/* Header */}
            <div style={{ padding: '1.1rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AskMyNotes</h2>
                <button onClick={onClose} className="responsive-toggle" style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '6px', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Subjects */}
            <div className="scroll-y" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.5rem' }}>Subjects</div>

                {subjects.map(sub => {
                    const active = sub.id === activeSubjectId;
                    return (
                        <div key={sub.id} onClick={() => onSelect(sub.id)}
                            style={{
                                padding: '0.75rem', cursor: 'pointer', borderRadius: '10px',
                                background: active ? 'var(--bg-elevated)' : 'transparent',
                                border: active ? '1px solid var(--border)' : '1px solid transparent',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                            onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sub.colorHex, boxShadow: `0 0 6px ${sub.colorHex}80`, flexShrink: 0 }} />
                                <EditableName name={sub.name} onSave={(n) => dispatch({ type: 'RENAME_SUBJECT', id: sub.id, name: n })} />
                                {sub.notesChunks.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{sub.files.length} files</span>}
                            </div>

                            {active && (
                                <div style={{ marginTop: '0.6rem' }} onClick={(e) => e.stopPropagation()}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.5rem', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent-light)', transition: 'all 0.2s' }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span>+ Upload files</span>
                                        <input type="file" accept=".pdf,.txt" multiple style={{ display: 'none' }}
                                            onChange={(e) => { if (e.target.files?.length) handleUpload(sub.id, e.target.files); e.target.value = ''; }}
                                        />
                                    </label>

                                    {sub.files.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.5rem' }}>
                                            {sub.files.map(f => {
                                                const status = parsing[`${sub.id}_${f.name}`] || 'done';
                                                return (
                                                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', padding: '5px 8px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }} title={f.name}>{f.name}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {status === 'loading' && <span className="typing-dots" style={{ transform: 'scale(0.5)' }}><span /><span /><span /></span>}
                                                            {status === 'done' && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓</span>}
                                                            {status === 'error' && <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>✕</span>}
                                                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_FILE', subjectId: sub.id, fileName: f.name }); }}
                                                                style={{ opacity: 0.4, fontSize: '0.85rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                                                            >×</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* User Profile */}
            <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(userName || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <button onClick={onLogout}
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >Logout</button>
            </div>
        </div>
    );
}
