import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, Globe, Volume2, User, UserX } from 'lucide-react';

export default function Settings({ user, onLogout, settings, onUpdateSettings }) {

    const handleThemeToggle = () => {
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        onUpdateSettings({ ...settings, theme: newTheme });
    };

    return (
        <div style={{ padding: '2rem', width: '100%', height: '100%', overflowY: 'auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '800px', margin: '0 auto' }}>

                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem', marginBottom: '2rem' }}>
                    <SettingsIcon size={28} color="var(--accent)" /> System Settings
                </h1>

                {/* Profile Section */}
                <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={20} /> Profile Details
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                            <input type="text" value={user.name} disabled className="input-field" style={{ width: '100%', marginBottom: '1rem' }} />

                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Email Address</label>
                            <input type="email" value={user.email} disabled className="input-field" style={{ width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                                {user.name.charAt(0)}
                            </div>
                            <button onClick={onLogout} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--error)' }}>
                                <UserX size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sun size={20} /> Display & Theme
                    </h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>App Theme</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Switch between Light and Dark mode.</p>
                        </div>
                        <button onClick={handleThemeToggle} className="btn-ghost" style={{ padding: '10px 20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {settings.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </button>
                    </div>
                </section>

                {/* AI Voice & Language Section */}
                <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={20} /> AI Assistant & Language
                    </h2>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>AI Spoken Language</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select the language the AI uses to respond.</p>
                            </div>
                            <select
                                value={settings.language}
                                onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
                                className="input-field"
                                style={{ width: '200px' }}
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Gujarati">Gujarati</option>
                                <option value="Telugu">Telugu</option>
                                <option value="Punjabi">Punjabi</option>
                                <option value="Bengali">Bengali</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    Speech Synthesis <Volume2 size={16} color="var(--accent)" />
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI reads outgoing messages aloud automatically.</p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.ttsEnabled}
                                    onChange={(e) => onUpdateSettings({ ...settings, ttsEnabled: e.target.checked })}
                                    style={{ width: '24px', height: '24px', accentColor: 'var(--accent)' }}
                                />
                                <span style={{ color: settings.ttsEnabled ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {settings.ttsEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </label>
                        </div>
                    </div>
                </section>

            </motion.div>
        </div>
    );
}
