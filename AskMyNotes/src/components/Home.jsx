import React from 'react';
import { motion } from 'framer-motion';
import { Home as HomeIcon, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';

export default function Home({ user, subjects, onNavigate }) {
    return (
        <div style={{ padding: '2rem', width: '100%', height: '100%', overflowY: 'auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Header Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Welcome back, {user.name}</h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Ready to conquer today's study goals?</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen /></div>
                        <div><h3 style={{ margin: 0, fontSize: '1.5rem' }}>{subjects.length}</h3><p style={{ margin: 0, color: 'var(--text-muted)' }}>Active Subjects</p></div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle /></div>
                        <div><h3 style={{ margin: 0, fontSize: '1.5rem' }}>14</h3><p style={{ margin: 0, color: 'var(--text-muted)' }}>Tasks Completed</p></div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp /></div>
                        <div><h3 style={{ margin: 0, fontSize: '1.5rem' }}>3 Day</h3><p style={{ margin: 0, color: 'var(--text-muted)' }}>Study Streak</p></div>
                    </div>
                </div>

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

                    {/* Recent Subjects */}
                    <div>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} color="var(--accent)" /> Recent Subjects</h2>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {subjects.map(sub => (
                                <motion.div
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    key={sub.id} className="glass-panel"
                                    style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onClick={() => onNavigate('subject', sub.id)}
                                >
                                    <div>
                                        <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: sub.color }}></span>
                                            {sub.name}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sub.files.length} Notes Uploaded</p>
                                    </div>
                                    <button className="btn-ghost small">Go to Dashboard</button>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Todo List */}
                    <div>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} color="var(--success)" /> Study To-Do</h2>
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {['Review Physics Chapter 4', 'Take Math Mock Exam', 'Summarize Biology Lecture'].map((task, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                                    <span style={{ color: 'var(--text-primary)' }}>{task}</span>
                                </div>
                            ))}
                            <button className="btn-ghost small" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>+ Add Task</button>
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
