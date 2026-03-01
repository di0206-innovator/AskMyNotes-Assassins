import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Upload, Trash2, FileText, ChevronRight, LogOut, Sparkles, X, Check, AlertCircle, Loader, Home, Settings as SettingsIcon } from 'lucide-react';
import { parsePdf } from '../utils/pdfParser';
import { parseTxt } from '../utils/txtParser';
import { saveSubjectChunks, createDatabaseSubject, deleteDatabaseSubject } from '../utils/geminiApi';

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
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    const handleUpload = async (subjectId, files) => {
        for (const file of Array.from(files)) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'pdf' && ext !== 'txt') continue;

            const key = `${subjectId}_${file.name}`;
            setParsing(p => ({ ...p, [key]: 'loading' }));

            try {
                const chunks = ext === 'pdf' ? await parsePdf(file) : await parseTxt(file);

                await saveSubjectChunks(subjectId, chunks);

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
                <motion.button
                    onClick={onNavigateHome}
                    className="btn-ghost icon-bounce"
                    whileHover={{ x: 4, background: 'var(--accent-glow)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                >
                    <Home size={18} /> Dashboard Home
                </motion.button>
                <motion.button
                    onClick={onNavigateSettings}
                    className="btn-ghost icon-bounce"
                    whileHover={{ x: 4, background: 'var(--accent-glow)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                >
                    <SettingsIcon size={18} /> System Settings
                </motion.button>
            </div>

            {/* Subjects */}
            <div className="scroll-y" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        Study Subjects
                    </div>
                    <button onClick={() => setIsAddingSubject(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>+</button>
                </div>

                <AnimatePresence>
                    {isAddingSubject && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ display: 'flex', gap: '6px', marginBottom: '0.5rem', overflow: 'hidden' }}
                        >
                            <input
                                autoFocus
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Escape') {
                                        setIsAddingSubject(false);
                                        setNewSubjectName('');
                                    }
                                    if (e.key === 'Enter') {
                                        if (!newSubjectName.trim()) return;
                                        const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
                                        const colorHex = colors[Math.floor(Math.random() * colors.length)];
                                        const id = 'sub_' + Date.now();
                                        try {
                                            const newSub = { id, name: newSubjectName.trim(), colorHex, files: [], notesChunks: [], conversationHistory: [] };
                                            await createDatabaseSubject({ id, name: newSub.name, colorHex });
                                            dispatch({ type: 'SET_SUBJECTS', subjects: [...subjects, newSub] });
                                            onSelect(id);
                                            setIsAddingSubject(false);
                                            setNewSubjectName('');
                                        } catch (err) {
                                            alert(err.message);
                                        }
                                    }
                                }}
                                placeholder="Subject name..."
                                className="input-field"
                                style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }}
                            />
                            <button
                                onClick={() => { setIsAddingSubject(false); setNewSubjectName(''); }}
                                className="btn-ghost"
                                style={{ padding: '0 6px' }}
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {subjects.map(sub => {
                    const active = sub.id === activeSubjectId;
                    return (
                        <motion.div
                            key={sub.id}
                            onClick={() => onSelect(sub.id)}
                            whileHover={{ scale: 1.02, x: 3 }}
                            whileTap={{ scale: 0.98 }}
                            className={active ? 'sidebar-active-item' : ''}
                            style={{
                                padding: '0.75rem', cursor: 'pointer', borderRadius: 'var(--radius)',
                                background: active ? 'linear-gradient(90deg, rgba(99,102,241,0.1), transparent)' : 'transparent',
                                border: active ? '1px solid var(--border-glow)' : '1px solid transparent',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: active ? '0 0 20px rgba(99,102,241,0.08)' : 'none',
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
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete subject "${sub.name}"?`)) {
                                            try {
                                                await deleteDatabaseSubject(sub.id);
                                                dispatch({ type: 'DELETE_SUBJECT', id: sub.id });
                                                if (activeSubjectId === sub.id) {
                                                    const next = subjects.find(s => s.id !== sub.id);
                                                    onSelect(next ? next.id : null);
                                                }
                                            } catch (err) {
                                                alert('Failed to delete: ' + err.message);
                                            }
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--error)', opacity: 0.5, cursor: 'pointer', padding: '4px' }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = 0.5}
                                >
                                    <Trash2 size={14} />
                                </button>
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
                <div style={{ position: 'relative' }}>
                    <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                    }}>
                        {(userName || '?')[0].toUpperCase()}
                    </div>
                    <div className="dot-pulse" style={{
                        position: 'absolute', bottom: '-1px', right: '-1px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: 'var(--success)', border: '2px solid var(--bg-primary)',
                    }} />
                </div>
                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <motion.button onClick={onLogout} className="btn-ghost"
                    whileHover={{ scale: 1.05, color: 'var(--error)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                >
                    <LogOut size={12} /> Logout
                </motion.button>
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
