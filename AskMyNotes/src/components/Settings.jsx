import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, Globe, Volume2, User, LogOut, ChevronRight, Palette, Languages } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

function Toggle({ checked, onChange }) {
    return (
        <div onClick={() => onChange(!checked)} style={{
            width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer',
            background: checked ? 'var(--accent)' : 'var(--bg-hover)',
            border: checked ? 'none' : '1px solid var(--border)',
            position: 'relative', transition: 'all 0.25s ease',
            boxShadow: checked ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
        }}>
            <div style={{
                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px',
                left: checked ? '25px' : '3px',
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
        </div>
    );
}

function SettingRow({ icon, title, description, children }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1.1rem 1.25rem', borderRadius: '12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            transition: 'all 0.2s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1 }}>
                <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-light)', flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{description}</p>
                </div>
            </div>
            <div style={{ flexShrink: 0, marginLeft: '1rem' }}>{children}</div>
        </div>
    );
}

export default function Settings({ user, onLogout, settings, onUpdateSettings }) {
    const handleThemeToggle = () => {
        onUpdateSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' });
    };

    const languages = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Telugu', 'Punjabi', 'Bengali'];

    return (
        <div className="scroll-y" style={{ padding: '2.5rem', width: '100%', height: '100%' }}>
            <motion.div variants={container} initial="hidden" animate="show" style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Header */}
                <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <SettingsIcon size={22} color="var(--accent)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>Settings</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personalize your experience</p>
                    </div>
                </motion.div>

                {/* Profile */}
                <motion.div variants={item} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', marginBottom: '0.75rem' }}>Profile</div>
                    <div style={{
                        padding: '1.5rem', borderRadius: '16px',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: '1.25rem',
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px',
                            background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem', fontWeight: 800, color: '#fff',
                            boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
                        }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{user.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                        <button onClick={onLogout} style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '10px', padding: '0.6rem 1rem',
                            color: '#f87171', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s',
                            fontFamily: 'var(--font-sans)',
                        }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        >
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </motion.div>

                {/* Appearance */}
                <motion.div variants={item} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', marginBottom: '0.75rem' }}>Appearance</div>
                    <SettingRow icon={<Palette size={18} />} title="App Theme" description="Switch between light and dark appearance">
                        <div onClick={handleThemeToggle} style={{
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.5rem 1rem', borderRadius: '10px',
                            background: 'var(--bg-hover)', border: '1px solid var(--border)',
                            fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s',
                        }}>
                            {settings.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                            {settings.theme === 'dark' ? 'Dark' : 'Light'}
                        </div>
                    </SettingRow>
                </motion.div>

                {/* AI & Language */}
                <motion.div variants={item}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem', marginBottom: '0.75rem' }}>AI & Language</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <SettingRow icon={<Languages size={18} />} title="AI Response Language" description="Select the language AI uses to respond">
                            <select
                                value={settings.language}
                                onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
                                style={{
                                    padding: '0.55rem 0.9rem', borderRadius: '10px',
                                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                    color: 'var(--text-primary)', fontSize: '0.85rem',
                                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                    outline: 'none', minWidth: '140px',
                                }}
                            >
                                {languages.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </SettingRow>

                        <SettingRow icon={<Volume2 size={18} />} title="Text-to-Speech" description="AI reads responses aloud in the selected language">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: settings.ttsEnabled ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {settings.ttsEnabled ? 'On' : 'Off'}
                                </span>
                                <Toggle checked={settings.ttsEnabled} onChange={(v) => onUpdateSettings({ ...settings, ttsEnabled: v })} />
                            </div>
                        </SettingRow>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
}
