import { useState } from 'react';

export default function AuthPage({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password.trim()) return setError('Please fill in all fields.');
        if (isSignup && !name.trim()) return setError('Please enter your name.');

        const users = JSON.parse(localStorage.getItem('askmynotes_users') || '{}');

        if (isSignup) {
            if (users[email]) return setError('Account already exists.');
            users[email] = { name: name.trim(), password, email: email.trim() };
            localStorage.setItem('askmynotes_users', JSON.stringify(users));
            onLogin({ name: name.trim(), email: email.trim() });
        } else {
            const user = users[email];
            if (!user) return setError('No account found.');
            if (user.password !== password) return setError('Incorrect password.');
            onLogin({ name: user.name, email: user.email });
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.85rem 1rem', borderRadius: '10px',
        border: '1px solid var(--border)', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
        transition: 'border-color 0.2s', boxSizing: 'border-box',
        fontFamily: 'var(--font-sans)'
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: '1rem', position: 'relative', overflow: 'hidden'
        }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)', top: '-150px', right: '-100px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)', bottom: '-120px', left: '-80px', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
                {/* Branding */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AskMyNotes
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI-powered study assistant</p>
                </div>

                {/* Card */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', marginBottom: '1.75rem', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-primary)', padding: '3px' }}>
                        {['Login', 'Sign Up'].map((label, i) => {
                            const active = i === 0 ? !isSignup : isSignup;
                            return (
                                <button key={label} onClick={() => { setIsSignup(i === 1); setError(''); }}
                                    style={{
                                        flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 600,
                                        border: 'none', cursor: 'pointer', borderRadius: '8px',
                                        transition: 'all 0.2s',
                                        background: active ? 'var(--accent-gradient)' : 'transparent',
                                        color: active ? '#fff' : 'var(--text-muted)',
                                    }}
                                >{label}</button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {isSignup && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '0.7rem', borderRadius: '8px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" style={{
                            width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
                            background: 'var(--accent-gradient)', color: '#fff', fontSize: '0.95rem',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.35)'; }}
                        >
                            {isSignup ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>Powered by Gemini AI via OpenRouter</p>
            </div>
        </div>
    );
}
