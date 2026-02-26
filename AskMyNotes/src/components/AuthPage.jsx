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

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        if (isSignup && !name.trim()) {
            setError('Please enter your name.');
            return;
        }

        // Get stored users from localStorage
        const users = JSON.parse(localStorage.getItem('askmynotes_users') || '{}');

        if (isSignup) {
            if (users[email]) {
                setError('An account with this email already exists.');
                return;
            }
            users[email] = { name: name.trim(), password, email: email.trim() };
            localStorage.setItem('askmynotes_users', JSON.stringify(users));
            onLogin({ name: name.trim(), email: email.trim() });
        } else {
            const user = users[email];
            if (!user) {
                setError('No account found with this email.');
                return;
            }
            if (user.password !== password) {
                setError('Incorrect password.');
                return;
            }
            onLogin({ name: user.name, email: user.email });
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative background circles */}
            <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,169,110,0.08) 0%, transparent 70%)', top: '-100px', right: '-100px' }} />
            <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,158,200,0.08) 0%, transparent 70%)', bottom: '-80px', left: '-80px' }} />

            <div style={{
                width: '100%',
                maxWidth: '420px',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Logo / Branding */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(200,169,110,0.3))' }}>📚</div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2.2rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #C8A96E, #E8D5A8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        AskMyNotes
                    </h1>
                    <p style={{ opacity: 0.5, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
                        AI-powered study assistant
                    </p>
                </div>

                {/* Auth Card */}
                <div className="card" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                }}>
                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex',
                        marginBottom: '2rem',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)'
                    }}>
                        <button
                            onClick={() => { setIsSignup(false); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: !isSignup ? 'rgba(200,169,110,0.2)' : 'transparent',
                                color: !isSignup ? '#C8A96E' : 'rgba(255,255,255,0.4)',
                                borderBottom: !isSignup ? '2px solid #C8A96E' : '2px solid transparent'
                            }}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setIsSignup(true); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: isSignup ? 'rgba(200,169,110,0.2)' : 'transparent',
                                color: isSignup ? '#C8A96E' : 'rgba(255,255,255,0.4)',
                                borderBottom: isSignup ? '2px solid #C8A96E' : '2px solid transparent'
                            }}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Name field (signup only) */}
                        {isSignup && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(0,0,0,0.4)',
                                        color: 'inherit',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#C8A96E'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.4)',
                                    color: 'inherit',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#C8A96E'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.4)',
                                    color: 'inherit',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#C8A96E'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginBottom: '1.25rem',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #C8A96E, #A88B4A)',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 4px 15px rgba(200,169,110,0.3)',
                                letterSpacing: '0.02em'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,169,110,0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(200,169,110,0.3)';
                            }}
                        >
                            {isSignup ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.35, marginTop: '2rem', fontFamily: 'var(--font-mono)' }}>
                    Powered by Google Gemini AI
                </p>
            </div>
        </div>
    );
}
