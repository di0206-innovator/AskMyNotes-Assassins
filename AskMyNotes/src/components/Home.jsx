import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { BookOpen, CheckCircle2, ArrowRight, Plus, Sparkles, Clock, Flame, Target, GraduationCap, BarChart3, Star, Rocket, Zap } from 'lucide-react';

/* ─── Animated Starfield ─── */
function Starfield() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w = canvas.width = canvas.parentElement.offsetWidth;
        let h = canvas.height = canvas.parentElement.offsetHeight;
        const stars = Array.from({ length: 80 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            opacity: Math.random() * 0.5 + 0.2,
            pulse: Math.random() * Math.PI * 2,
        }));
        let raf;
        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (const s of stars) {
                s.pulse += 0.02;
                s.y -= s.speed;
                if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }
                const a = s.opacity * (0.6 + 0.4 * Math.sin(s.pulse));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(165, 180, 252, ${a})`;
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        };
        draw();
        const onResize = () => { w = canvas.width = canvas.parentElement.offsetWidth; h = canvas.height = canvas.parentElement.offsetHeight; };
        window.addEventListener('resize', onResize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, style, onClick, className = '' }) {
    const ref = useRef(null);
    const handleMove = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        ref.current.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
        ref.current.style.boxShadow = `${-x * 15}px ${y * 15}px 30px rgba(0,0,0,0.2), 0 0 30px rgba(99,102,241,0.08)`;
    };
    const handleLeave = () => {
        if (ref.current) {
            ref.current.style.transform = 'perspective(600px) rotateY(0) rotateX(0) scale(1)';
            ref.current.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        }
    };
    return (
        <div ref={ref} onClick={onClick} onMouseMove={handleMove} onMouseLeave={handleLeave}
            className={className}
            style={{ ...style, transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out', cursor: onClick ? 'pointer' : 'default', willChange: 'transform' }}>
            {children}
        </div>
    );
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ value, suffix = '' }) {
    const [display, setDisplay] = useState(0);
    const num = typeof value === 'number' ? value : parseInt(value) || 0;
    useEffect(() => {
        let start = 0;
        const duration = 900;
        const stepTime = 16;
        const steps = duration / stepTime;
        const increment = num / steps;
        const timer = setInterval(() => {
            start += increment;
            if (start >= num) { setDisplay(num); clearInterval(timer); }
            else setDisplay(Math.floor(start));
        }, stepTime);
        return () => clearInterval(timer);
    }, [num]);
    return <span>{display}{suffix}</span>;
}

/* ─── Progress Ring ─── */
function ProgressRing({ value, max, size = 56, stroke = 4, color }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = max ? value / max : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - pct) }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                strokeLinecap="round"
            />
        </svg>
    );
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 28, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

export default function Home({ user, subjects, onNavigate }) {
    const [todos, setTodos] = useState([
        { id: 1, text: 'Review Physics Chapter 4', done: false },
        { id: 2, text: 'Take Math Mock Exam', done: false },
        { id: 3, text: 'Summarize Biology Lecture', done: false },
    ]);
    const [newTask, setNewTask] = useState('');
    const [adding, setAdding] = useState(false);
    const [time, setTime] = useState(new Date());

    useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

    const toggleTodo = id => setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
    const addTodo = () => { if (!newTask.trim()) return; setTodos(t => [...t, { id: Date.now(), text: newTask.trim(), done: false }]); setNewTask(''); setAdding(false); };
    const removeTodo = id => setTodos(t => t.filter(x => x.id !== id));
    const todoDone = todos.filter(t => t.done).length;
    const totalFiles = subjects.reduce((a, s) => a + s.files.length, 0);

    const kpis = [
        { icon: <BookOpen size={26} />, label: 'Subjects', value: subjects.length, color: '#818cf8', glow: 'rgba(99,102,241,0.4)' },
        { icon: <Target size={26} />, label: 'Notes', value: totalFiles, color: '#22d3ee', glow: 'rgba(6,182,212,0.4)' },
        { icon: <CheckCircle2 size={26} />, label: 'Done', value: todoDone, suffix: `/${todos.length}`, color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
        { icon: <Flame size={26} />, label: 'Streak', value: 3, suffix: ' Days', color: '#fbbf24', glow: 'rgba(245,158,11,0.4)' },
    ];

    const greetHour = new Date().getHours();
    const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="scroll-y" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden auto' }}>

            {/* Live Starfield Background */}
            <Starfield />

            {/* Animated Gradient Blobs */}
            <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 65%)', top: '-100px', right: '-100px', pointerEvents: 'none', filter: 'blur(60px)' }} />
            <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                style={{ position: 'absolute', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 65%)', bottom: '-80px', left: '-60px', pointerEvents: 'none', filter: 'blur(60px)' }} />
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.12, 0.06] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                style={{ position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1), transparent 65%)', top: '40%', left: '40%', pointerEvents: 'none', filter: 'blur(50px)' }} />

            <motion.div variants={container} initial="hidden" animate="show"
                style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1, padding: '2.5rem' }}>

                {/* ═══ Welcome Banner ═══ */}
                <motion.div variants={item} style={{
                    padding: '2rem 2.5rem', borderRadius: '24px', marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 40%, rgba(6,182,212,0.06) 100%)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Animated shine sweep */}
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
                        style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', pointerEvents: 'none' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                width: '72px', height: '72px', borderRadius: '22px',
                                background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.8rem', fontWeight: 800, color: '#fff',
                                boxShadow: '0 8px 32px rgba(99,102,241,0.45), 0 0 60px rgba(99,102,241,0.15)',
                            }}
                        >
                            {user.name.charAt(0).toUpperCase()}
                        </motion.div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
                                {greeting}, <span className="text-shimmer">{user.name}</span>
                            </h1>
                            <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Rocket size={16} color="var(--accent-light)" /> Ready to conquer today's study goals
                            </p>
                        </div>
                        <div style={{
                            padding: '0.7rem 1.4rem', borderRadius: '16px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600,
                            backdropFilter: 'blur(10px)',
                        }}>
                            <Clock size={16} color="var(--accent-light)" />
                            {timeStr}
                        </div>
                    </div>
                </motion.div>

                {/* ═══ KPI Cards with 3D Tilt ═══ */}
                <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    {kpis.map((kpi, i) => (
                        <TiltCard key={i} style={{
                            padding: '1.5rem', borderRadius: '20px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(12px)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Neon glow accent at top */}
                            <div style={{
                                position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
                                background: `linear-gradient(90deg, transparent, ${kpi.color}, transparent)`,
                                borderRadius: '0 0 4px 4px',
                                boxShadow: `0 0 15px ${kpi.glow}, 0 0 30px ${kpi.glow}`,
                            }} />

                            <motion.div
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
                                style={{
                                    width: '48px', height: '48px', borderRadius: '14px',
                                    background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: kpi.color, marginBottom: '1rem',
                                }}
                            >
                                {kpi.icon}
                            </motion.div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: kpi.color, textShadow: `0 0 20px ${kpi.glow}` }}>
                                <AnimatedCounter value={kpi.value} suffix={kpi.suffix || ''} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{kpi.label}</div>
                        </TiltCard>
                    ))}
                </motion.div>

                {/* ═══ Content Grid ═══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>

                    {/* Subject Cards */}
                    <motion.div variants={item}>
                        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                            <GraduationCap size={20} color="var(--accent)" /> Your Subjects
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{subjects.length} total</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {subjects.map((sub, i) => (
                                <TiltCard
                                    key={sub.id}
                                    onClick={() => onNavigate('subject', sub.id)}
                                    className="shine-card"
                                    style={{
                                        padding: '1.25rem 1.5rem', borderRadius: '18px',
                                        background: 'rgba(15, 23, 42, 0.5)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        backdropFilter: 'blur(8px)',
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                >
                                    {/* Color accent line */}
                                    <div style={{
                                        position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '3px',
                                        background: sub.colorHex, borderRadius: '0 4px 4px 0',
                                        boxShadow: `0 0 12px ${sub.colorHex}80`,
                                    }} />

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem' }}>
                                        <motion.div
                                            animate={{ boxShadow: [`0 0 0px ${sub.colorHex}00`, `0 0 20px ${sub.colorHex}60`, `0 0 0px ${sub.colorHex}00`] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                                            style={{
                                                width: '44px', height: '44px', borderRadius: '14px',
                                                background: `${sub.colorHex}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1px solid ${sub.colorHex}30`,
                                            }}
                                        >
                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: sub.colorHex, boxShadow: `0 0 14px ${sub.colorHex}80` }} />
                                        </motion.div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 600 }}>{sub.name}</h3>
                                            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {sub.files.length} Notes · {sub.notesChunks.length} Chunks
                                                {sub.notesChunks.length > 0 && <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        color: 'var(--accent-light)', fontSize: '0.82rem', fontWeight: 600,
                                        padding: '0.4rem 1rem', borderRadius: '12px',
                                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                                    }}>
                                        Open <ArrowRight size={14} />
                                    </div>
                                </TiltCard>
                            ))}
                        </div>
                    </motion.div>

                    {/* To-Do List */}
                    <motion.div variants={item}>
                        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                            <CheckCircle2 size={20} color="var(--success)" /> Study To-Do
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ProgressRing value={todoDone} max={todos.length} size={32} stroke={3} color="var(--success)" />
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{todoDone}/{todos.length}</span>
                            </div>
                        </h2>
                        <div style={{
                            padding: '1.25rem', borderRadius: '20px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        }}>
                            <AnimatePresence>
                                {todos.map(todo => (
                                    <motion.div key={todo.id}
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20, height: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.7rem 0.85rem', borderRadius: '12px',
                                            background: todo.done ? 'rgba(52,211,153,0.06)' : 'transparent',
                                            transition: 'background 0.25s',
                                        }}
                                    >
                                        <motion.div onClick={() => toggleTodo(todo.id)}
                                            whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                                            style={{
                                                width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                                                border: todo.done ? 'none' : '2px solid var(--border-active)',
                                                background: todo.done ? 'var(--success)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', boxShadow: todo.done ? '0 0 12px rgba(52,211,153,0.35)' : 'none',
                                            }}
                                        >
                                            {todo.done && <CheckCircle2 size={14} color="#fff" />}
                                        </motion.div>
                                        <span style={{
                                            flex: 1, fontSize: '0.9rem',
                                            textDecoration: todo.done ? 'line-through' : 'none',
                                            color: todo.done ? 'var(--text-muted)' : 'var(--text-primary)',
                                        }}>{todo.text}</span>
                                        <motion.button onClick={() => removeTodo(todo.id)}
                                            whileHover={{ scale: 1.3, color: '#f87171' }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.4, padding: '2px' }}
                                        >×</motion.button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {adding ? (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                                    <input value={newTask} onChange={e => setNewTask(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTodo()}
                                        placeholder="What do you need to study?" autoFocus className="input-field"
                                        style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem' }} />
                                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                        onClick={addTodo} className="btn-primary"
                                        style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem' }}>Add</motion.button>
                                </motion.div>
                            ) : (
                                <motion.button onClick={() => setAdding(true)}
                                    whileHover={{ scale: 1.02, borderColor: 'var(--accent)' }} whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'none', border: '1px dashed rgba(99,102,241,0.3)',
                                        borderRadius: '12px', padding: '0.7rem', color: 'var(--accent-light)',
                                        cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '6px',
                                    }}
                                >
                                    <Plus size={14} /> Add Task
                                </motion.button>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                            marginTop: '1rem', padding: '1rem 1.2rem', borderRadius: '16px',
                            background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            <BarChart3 size={18} color="var(--accent-light)" />
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Progress: <strong style={{ color: todoDone === todos.length && todos.length > 0 ? '#34d399' : 'var(--accent-light)' }}>{todos.length ? Math.round((todoDone / todos.length) * 100) : 0}%</strong>
                            </span>
                            <div style={{ flex: 1, height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${todos.length ? (todoDone / todos.length) * 100 : 0}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.8 }}
                                    style={{
                                        height: '100%', borderRadius: '6px',
                                        background: 'linear-gradient(90deg, #6366f1, #818cf8, #34d399)',
                                        boxShadow: '0 0 10px rgba(99,102,241,0.3)',
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

            </motion.div>
        </div>
    );
}
