import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Upload, Trash2, FileText, ChevronRight, LogOut, Sparkles, X, Check, AlertCircle, Loader, Home, Settings as SettingsIcon } from 'lucide-react';
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
                className="input-field"
                style={{ padding: '3px 8px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)' }}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }
    return (
        <div onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            style={{ cursor: 'text', flex: 1, padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }}
            title="Click to rename"
        >{name}</div>
    );
}

function FileItem({ file, status, onRemove }) {
    const statusIcon = {
        loading: <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />,
        done: <Check size={12} color="var(--success)" />,
        error: <AlertCircle size={12} color="var(--error)" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '0.75rem', padding: '6px 10px',
                background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                <FileText size={12} color="var(--accent-light)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.72rem' }} title={file.name}>
                    {file.name}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {statusIcon[status] || statusIcon.done}
                <button onClick={onRemove}
                    style={{ opacity: 0.4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', transition: 'opacity 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.4}
                >
                    <X size={12} />
                </button>
            </div>
        </motion.div>
    );
}

export default function Sidebar({ subjects, activeSubjectId, onSelect, dispatch, isOpen, onClose, userName, onLogout, onNavigateHome, onNavigateSettings }) {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                        <BookOpen size={16} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AskMyNotes</h2>
                </div>
                <button onClick={onClose} className="responsive-toggle btn-ghost" style={{ padding: '4px 8px' }}>
                    <X size={16} />
                </button>
            </div>

            {/* Navigation Options */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                    onClick={onNavigateHome}
                    className="btn-ghost"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                >
                    <Home size={18} /> Dashboard Home
                </button>
                <button
                    onClick={onNavigateSettings}
                    className="btn-ghost"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                >
                    <SettingsIcon size={18} /> System Settings
                </button>
            </div>

            {/* Subjects */}
            <div className="scroll-y" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                    Study Subjects
                </div>

                {subjects.map(sub => {
                    const active = sub.id === activeSubjectId;
                    return (
                        <motion.div
                            key={sub.id}
                            onClick={() => onSelect(sub.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            style={{
                                padding: '0.75rem', cursor: 'pointer', borderRadius: 'var(--radius)',
                                background: active ? 'var(--bg-elevated)' : 'transparent',
                                border: active ? '1px solid var(--border-glow)' : '1px solid transparent',
                                transition: 'all 0.2s',
                                boxShadow: active ? 'var(--shadow-glow)' : 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: sub.colorHex,
                                    boxShadow: `0 0 8px ${sub.colorHex}80`,
                                    flexShrink: 0,
                                    transition: 'all 0.3s',
                                }} />
                                <EditableName name={sub.name} onSave={(n) => dispatch({ type: 'RENAME_SUBJECT', id: sub.id, name: n })} />
                                {sub.notesChunks.length > 0 && (
                                    <span className="badge badge-accent" style={{ fontSize: '0.6rem', padding: '2px 7px' }}>
                                        {sub.files.length}
                                    </span>
                                )}
                            </div>

                            {active && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    transition={{ duration: 0.25 }}
                                    style={{ marginTop: '0.65rem', overflow: 'hidden' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <DropZone subjectId={sub.id} onUpload={handleUpload} />

                                    <AnimatePresence>
                                        {sub.files.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.5rem' }}
                                            >
                                                {sub.files.map(f => (
                                                    <FileItem
                                                        key={f.name}
                                                        file={f}
                                                        status={parsing[`${sub.id}_${f.name}`] || 'done'}
                                                        onRemove={() => dispatch({ type: 'REMOVE_FILE', subjectId: sub.id, fileName: f.name })}
                                                    />
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* User Profile */}
            <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                    {(userName || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <button onClick={onLogout} className="btn-ghost" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                    <LogOut size={12} /> Logout
                </button>
            </div>
        </div>
    );
}

function DropZone({ subjectId, onUpload }) {
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length) onUpload(subjectId, acceptedFiles);
    }, [subjectId, onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
        },
        multiple: true,
    });

    return (
        <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
            style={{ padding: '0.75rem' }}
        >
            <input {...getInputProps()} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--accent-light)' }}>
                <Upload size={14} />
                <span>{isDragActive ? 'Drop files here' : 'Upload PDF / TXT'}</span>
            </div>
        </div>
    );
}
