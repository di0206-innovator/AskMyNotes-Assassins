import { useState, useRef } from 'react';
import { parsePdf } from '../utils/pdfParser';
import { parseTxt } from '../utils/txtParser';

function EditableName({ name, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(name);
    const inputRef = useRef(null);

    const finishEdit = () => {
        setIsEditing(false);
        if (tempName.trim()) {
            onSave(tempName.trim());
        } else {
            setTempName(name);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEdit();
                    if (e.key === 'Escape') {
                        setIsEditing(false);
                        setTempName(name);
                    }
                }}
                autoFocus
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border-subtle)',
                    color: 'inherit',
                    width: '100%',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    outline: 'none'
                }}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            style={{ cursor: 'text', flex: 1, padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title="Click to edit"
        >
            {name}
        </div>
    );
}

export default function Sidebar({ subjects, activeSubjectId, onSelect, dispatch, isOpen, onClose }) {
    const [parsingFiles, setParsingFiles] = useState({});

    const handleFileUpload = async (subjectId, files) => {
        for (const file of files) {
            const fileKey = `${subjectId}_${file.name}`;
            if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
                continue;
            }

            setParsingFiles(prev => ({ ...prev, [fileKey]: 'loading' }));
            try {
                let chunks = [];
                if (file.name.endsWith('.pdf')) {
                    chunks = await parsePdf(file);
                } else {
                    chunks = await parseTxt(file);
                }

                dispatch({ type: 'ADD_FILE', subjectId, file: { name: file.name, size: file.size } });
                dispatch({ type: 'ADD_CHUNKS', subjectId, chunks });
                setParsingFiles(prev => ({ ...prev, [fileKey]: 'done' }));
            } catch (err) {
                console.error("Failed to parse file", file.name, err);
                setParsingFiles(prev => ({ ...prev, [fileKey]: 'error' }));
            }
        }
    };

    return (
        <div className={`sidebar-panel ${isOpen ? 'open' : ''}`}>
            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>AskMyNotes</h2>
                <button onClick={onClose} style={{ display: 'none', background: 'var(--surface-color)', padding: '4px 8px', borderRadius: '4px' }} className="mobile-close-btn">
                    ✕
                </button>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' }}>
                    Subjects
                </div>

                {subjects.map(subject => {
                    const isActive = subject.id === activeSubjectId;

                    return (
                        <div
                            key={subject.id}
                            className="card"
                            onClick={() => onSelect(subject.id)}
                            style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderLeft: isActive ? `4px solid ${subject.colorHex}` : '1px solid var(--border-subtle)',
                                backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                                transition: 'all var(--transition)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isActive ? '12px' : '0' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: subject.colorHex, flexShrink: 0, boxShadow: `0 0 8px ${subject.colorHex}80` }} />
                                <EditableName
                                    name={subject.name}
                                    onSave={(newName) => dispatch({ type: 'RENAME_SUBJECT', id: subject.id, name: newName })}
                                />
                            </div>

                            {isActive && (
                                <div style={{ marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                    <label
                                        style={{
                                            display: 'block',
                                            padding: '0.6rem',
                                            textAlign: 'center',
                                            border: '1px dashed rgba(255,255,255,0.2)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            opacity: 0.8,
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span>+ Add .pdf or .txt</span>
                                        <input
                                            type="file"
                                            accept=".pdf,.txt"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                handleFileUpload(subject.id, Array.from(e.target.files));
                                                e.target.value = null; // reset
                                            }}
                                        />
                                    </label>

                                    {subject.files.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.75rem' }}>
                                            {subject.files.map(f => {
                                                const fk = `${subject.id}_${f.name}`;
                                                const status = parsingFiles[fk] || 'done';

                                                return (
                                                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '6px 8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px', fontFamily: 'var(--font-mono)' }} title={f.name}>
                                                            {f.name}
                                                        </span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {status === 'loading' && <span className="typing-dots" style={{ transform: 'scale(0.6)' }}><span /><span /><span /></span>}
                                                            {status === 'done' && <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓</span>}
                                                            {status === 'error' && <span style={{ color: '#ef4444', fontWeight: 'bold' }} title="Parse failed">⚠</span>}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    dispatch({ type: 'REMOVE_FILE', subjectId: subject.id, fileName: f.name });
                                                                }}
                                                                style={{ opacity: 0.6, fontSize: '1rem', lineHeight: '1', padding: '0 2px' }}
                                                                title="Remove file"
                                                            >
                                                                ×
                                                            </button>
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
        </div>
    );
}
