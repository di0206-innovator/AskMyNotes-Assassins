import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle2, TrendingUp, ArrowRight, Plus, Sparkles, Clock, Flame, Target, Zap } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

function ProgressRing({ value, max, size = 52, stroke = 4, color }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = max ? value / max : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
    );
}

export default function Home({ user, subjects, onNavigate }) {
    const [todos, setTodos] = useState([
        { id: 1, text: 'Review Physics Chapter 4', done: false },
        { id: 2, text: 'Take Math Mock Exam', done: false },
        { id: 3, text: 'Summarize Biology Lecture', done: false },
    ]);
    const [newTask, setNewTask] = useState('');
    const [adding, setAdding] = useState(false);

    const toggleTodo = id => setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
    const addTodo = () => {
        if (!newTask.trim()) return;
        setTodos(t => [...t, { id: Date.now(), text: newTask.trim(), done: false }]);
        setNewTask(''); setAdding(false);
    };
    const removeTodo = id => setTodos(t => t.filter(x => x.id !== id));
    const todoDone = todos.filter(t => t.done).length;
    const totalFiles = subjects.reduce((a, s) => a + s.files.length, 0);

    const kpis = [
        { icon: <BookOpen size={22} />, label: 'Active Subjects', value: subjects.length, gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', bg: 'rgba(99,102,241,0.1)' },
        { icon: <Target size={22} />, label: 'Notes Uploaded', value: totalFiles, gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)', bg: 'rgba(6,182,212,0.1)' },
        { icon: <CheckCircle2 size={22} />, label: 'Tasks Complete', value: `${todoDone}/${todos.length}`, gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)', bg: 'rgba(52,211,153,0.1)' },
        { icon: <Flame size={22} />, label: 'Study Streak', value: '3 Day', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', bg: 'rgba(245,158,11,0.1)' },
    ];

    const greetHour = new Date().getHours();
    const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="scroll-y" style={{ padding: '2.5rem', width: '100%', height: '100%' }}>
            <motion.div variants={container} initial="hidden" animate="show" style={{ maxWidth: '1100px', margin: '0 auto' }}>

                {/* — Header — */}
                <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px',
                        background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', fontWeight: 800, color: '#fff',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                    }}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, lineHeight: 1.2 }}>
                            {greeting}, <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user.name}</span>
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} color="var(--accent-light)" /> Ready to conquer today's study goals?
                        </p>
                    </div>
                </motion.div>

                {/* — KPI Stats — */}
                <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                    {kpis.map((kpi, i) => (
                        <motion.div key={i}
                            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}
                            style={{
                                padding: '1.4rem', borderRadius: '16px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'default', transition: 'all 0.25s ease',
                            }}
                        >
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: kpi.gradient.includes('#6366f1') ? '#818cf8' : kpi.gradient.includes('#06b6d4') ? '#22d3ee' : kpi.gradient.includes('#34d399') ? '#34d399' : '#fbbf24',
                            }}>
                                {kpi.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.55rem', fontWeight: 700, lineHeight: 1 }}>{kpi.value}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{kpi.label}</div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* — Content Grid — */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>

                    {/* Recent Subjects */}
                    <motion.div variants={item}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <BookOpen size={18} color="var(--accent)" /> Your Subjects
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {subjects.map((sub, i) => (
                                <motion.div
                                    key={sub.id}
                                    whileHover={{ scale: 1.015, borderColor: 'var(--border-glow)' }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => onNavigate('subject', sub.id)}
                                    style={{
                                        padding: '1.2rem 1.4rem', borderRadius: '14px',
                                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            background: `${sub.colorHex}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sub.colorHex, boxShadow: `0 0 10px ${sub.colorHex}60` }} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{sub.name}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {sub.files.length} Notes · {sub.notesChunks.length} Chunks
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        color: 'var(--accent-light)', fontSize: '0.82rem', fontWeight: 500,
                                    }}>
                                        Open <ArrowRight size={14} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* To-Do List */}
                    <motion.div variants={item}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <CheckCircle2 size={18} color="var(--success)" /> Study To-Do
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ProgressRing value={todoDone} max={todos.length} size={28} stroke={3} color="var(--success)" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{todoDone}/{todos.length}</span>
                            </div>
                        </h2>
                        <div style={{
                            padding: '1.2rem', borderRadius: '14px',
                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                            display: 'flex', flexDirection: 'column', gap: '0.6rem',
                        }}>
                            <AnimatePresence>
                                {todos.map(todo => (
                                    <motion.div
                                        key={todo.id}
                                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12, height: 0 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.6rem 0.8rem', borderRadius: '10px',
                                            background: todo.done ? 'rgba(52,211,153,0.06)' : 'transparent',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div
                                            onClick={() => toggleTodo(todo.id)}
                                            style={{
                                                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                                                border: todo.done ? 'none' : '2px solid var(--border-active)',
                                                background: todo.done ? 'var(--success)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            {todo.done && <CheckCircle2 size={14} color="#fff" />}
                                        </div>
                                        <span style={{
                                            flex: 1, fontSize: '0.9rem',
                                            textDecoration: todo.done ? 'line-through' : 'none',
                                            color: todo.done ? 'var(--text-muted)' : 'var(--text-primary)',
                                            transition: 'all 0.2s',
                                        }}>{todo.text}</span>
                                        <button onClick={() => removeTodo(todo.id)} style={{
                                            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                            fontSize: '1rem', opacity: 0.5, transition: 'opacity 0.15s',
                                        }}
                                            onMouseOver={e => e.currentTarget.style.opacity = 1}
                                            onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                                        >×</button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {adding ? (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <input
                                        value={newTask} onChange={e => setNewTask(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTodo()}
                                        placeholder="What do you need to study?"
                                        autoFocus className="input-field"
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                    />
                                    <button onClick={addTodo} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Add</button>
                                </div>
                            ) : (
                                <button onClick={() => setAdding(true)}
                                    style={{
                                        background: 'none', border: '1px dashed var(--border-active)',
                                        borderRadius: '10px', padding: '0.6rem', color: 'var(--accent-light)',
                                        cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border-active)'; }}
                                >
                                    <Plus size={14} /> Add Task
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

            </motion.div>
        </div>
    );
}
