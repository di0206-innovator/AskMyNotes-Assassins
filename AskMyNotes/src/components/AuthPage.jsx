import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, User, Sparkles, ArrowRight } from 'lucide-react';

function FloatingParticle({ delay, duration, x, y, size }) {
    return (
        <motion.div
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--accent)',
                left: `${x}%`,
                top: `${y}%`,
            }}
            animate={{
                y: [0, -30, 0],
                opacity: [0, 0.4, 0],
                scale: [0.5, 1, 0.5],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
}

export default function AuthPage({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password.trim()) return setError('Please fill in all fields.');
        if (isSignup && !name.trim()) return setError('Please enter your name.');

        setLoading(true);
        // Simulate a brief loading for polish
        await new Promise(r => setTimeout(r, 400));

        const users = JSON.parse(localStorage.getItem('askmynotes_users') || '{}');

        if (isSignup) {
            if (users[email]) { setError('Account already exists.'); setLoading(false); return; }
            users[email] = { name: name.trim(), password, email: email.trim() };
            localStorage.setItem('askmynotes_users', JSON.stringify(users));
            onLogin({ name: name.trim(), email: email.trim() });
        } else {
            const user = users[email];
            if (!user) { setError('No account found.'); setLoading(false); return; }
            if (user.password !== password) { setError('Incorrect password.'); setLoading(false); return; }
            onLogin({ name: user.name, email: user.email });
        }
        setLoading(false);
    };

    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 4,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 3,
    }));

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: '1.5rem', position: 'relative', overflow: 'hidden'
        }}>
            {/* Ambient Orbs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.12, 0.08] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)', top: '-200px', right: '-150px', pointerEvents: 'none' }}
            />
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)', bottom: '-180px', left: '-120px', pointerEvents: 'none' }}
            />

            {/* Floating Particles */}
            {particles.map(p => <FloatingParticle key={p.id} {...p} />)}

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}
            >
                {/* Branding */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{ textAlign: 'center', marginBottom: '2.5rem' }}
                >
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'var(--accent-gradient)', marginBottom: '1.25rem', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.35)' }}
                    >
                        <BookOpen size={32} color="#fff" />
                    </motion.div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #818cf8, #c084fc, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite' }}>
                        AskMyNotes
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> AI-powered study companion
                    </p>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-xl), var(--shadow-glow)' }}
                >
                    {/* Tabs */}
                    <div style={{ display: 'flex', marginBottom: '1.75rem', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', padding: '3px', border: '1px solid var(--border)' }}>
                        {['Login', 'Sign Up'].map((label, i) => {
                            const active = i === 0 ? !isSignup : isSignup;
                            return (
                                <button key={label} onClick={() => { setIsSignup(i === 1); setError(''); }}
                                    style={{
                                        flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 600,
                                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                                        transition: 'all 0.25s',
                                        background: active ? 'var(--accent-gradient)' : 'transparent',
                                        color: active ? '#fff' : 'var(--text-muted)',
                                        fontFamily: 'var(--font-sans)',
                                    }}
                                >{label}</button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="popLayout">
                            {isSignup && (
                                <motion.div
                                    key="name"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ overflow: 'hidden', marginBottom: '1rem' }}
                                >
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field" style={{ paddingLeft: '38px' }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" style={{ paddingLeft: '38px' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" style={{ paddingLeft: '38px' }} />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    style={{ padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-primary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? (
                                <div className="typing-dots"><span /><span /><span /></div>
                            ) : (
                                <>
                                    {isSignup ? 'Create Account' : 'Sign In'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>

                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Sparkles size={10} /> Powered by Gemini AI
                </p>
            </motion.div>
        </div>
    );
}
