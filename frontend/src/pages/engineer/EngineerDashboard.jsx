import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { useSocket } from '../../hooks/useSocket';
import {
    AlertOctagon, FolderOpen, PlusCircle, FileText,
    CheckCircle, Clock, Activity, TrendingUp,
} from 'lucide-react';

export default function EngineerDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useSocket();

    const fetchStats = () => {
        setLoading(true);
        snagAPI.getStats()
            .then(r => setStats(r.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchStats();

        // Listen for sync events
        window.addEventListener('snag_synced', fetchStats);
        return () => window.removeEventListener('snag_synced', fetchStats);
    }, []);

    const greeting = (() => {
        const h = new Date().getHours();
        return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    })();

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center justify-between gap-16">
                        <div>
                            <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
                            <p className="page-subtitle">Here is your inspection overview for today</p>
                        </div>
                        <Link to="/engineer/generate" className="btn btn-primary">
                            <PlusCircle size={16} /> Detect Snag
                        </Link>
                    </div>
                </div>

                <div className="page-body">
                    {/* Hazard bar accent */}
                    <div className="hazard-bar mb-24" style={{ height: 4, borderRadius: 2 }} />

                    {/* Quick Actions */}
                    <div className="section-heading mb-16">
                        <span className="section-title">Quick Actions</span>
                        <div className="section-line" />
                    </div>
                    <div className="quick-action-grid mb-24">
                        <Link to="/engineer/generate" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(234,88,12,0.10)' }}>
                                <PlusCircle size={26} color="var(--orange)" />
                            </div>
                            <div className="quick-action-title">Detect Snag</div>
                            <div className="quick-action-sub">Capture and detect a crack</div>
                        </Link>
                        <Link to="/engineer/projects" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(21,128,61,0.10)' }}>
                                <FolderOpen size={26} color="var(--success)" />
                            </div>
                            <div className="quick-action-title">View Projects</div>
                            <div className="quick-action-sub">Manage construction projects</div>
                        </Link>
                        <Link to="/engineer/snags" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(217,119,6,0.10)' }}>
                                <AlertOctagon size={26} color="var(--amber)" />
                            </div>
                            <div className="quick-action-title">All Snags</div>
                            <div className="quick-action-sub">View and track all reports</div>
                        </Link>
                        <Link to="/engineer/reports" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(3,105,161,0.10)' }}>
                                <FileText size={26} color="#0369A1" />
                            </div>
                            <div className="quick-action-title">Export Reports</div>
                            <div className="quick-action-sub">Download PDF or Excel</div>
                        </Link>
                    </div>

                    {/* Stat Cards */}
                    <div className="section-heading mb-16">
                        <span className="section-title">Overview Stats</span>
                        <div className="section-line" />
                    </div>
                    <div className="grid-4 mb-24">
                        <div className="stat-card orange">
                            <div className="stat-icon" style={{ background: 'rgba(234,88,12,0.10)' }}>
                                <Activity size={22} color="var(--orange)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--orange)' }}>{loading ? '—' : stats?.total || 0}</div>
                                <div className="stat-label">Total Snags</div>
                            </div>
                        </div>
                        <div className="stat-card amber">
                            <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.10)' }}>
                                <Clock size={22} color="var(--amber)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--amber)' }}>{loading ? '—' : stats?.pending || 0}</div>
                                <div className="stat-label">Pending</div>
                            </div>
                        </div>
                        <div className="stat-card blue">
                            <div className="stat-icon" style={{ background: 'rgba(3,105,161,0.10)' }}>
                                <TrendingUp size={22} color="#0369A1" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: '#0369A1' }}>{loading ? '—' : stats?.in_progress || 0}</div>
                                <div className="stat-label">In Progress</div>
                            </div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon" style={{ background: 'rgba(21,128,61,0.10)' }}>
                                <CheckCircle size={22} color="var(--success)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--success)' }}>{loading ? '—' : stats?.resolved || 0}</div>
                                <div className="stat-label">Resolved</div>
                            </div>
                        </div>
                    </div>

                    {/* Two columns: severity + project status */}
                    <div className="grid-2 mb-24" style={{ gap: 24 }}>
                        {/* Severity breakdown */}
                        {stats && (
                            <div className="card">
                                <div className="section-heading mb-16">
                                    <span className="section-title">Severity Breakdown</span>
                                    <div className="section-line" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <SeverityBar label="High — Structural" value={stats.high_severity} total={stats.total} color="var(--danger)" bg="var(--danger-light)" />
                                    <SeverityBar label="Medium — Surface" value={stats.medium_severity} total={stats.total} color="var(--warning)" bg="var(--warning-light)" />
                                    <SeverityBar label="Low — Hairline" value={stats.low_severity} total={stats.total} color="var(--success)" bg="var(--success-light)" />
                                </div>
                            </div>
                        )}

                        {/* Today's status summary */}
                        <div className="card" style={{ background: 'linear-gradient(135deg,#FFF8F0,#FFF3E8)' }}>
                            <div className="section-heading mb-16">
                                <span className="section-title">Project Status</span>
                                <div className="section-line" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { label: 'Unresolved High Severity', value: stats?.high_severity || 0, color: 'var(--danger)' },
                                    { label: 'Awaiting Contractor Action', value: stats?.pending || 0, color: 'var(--warning)' },
                                    { label: 'Successfully Resolved', value: stats?.resolved || 0, color: 'var(--success)' },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 14px', background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)'
                                    }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: 'Manrope,sans-serif' }}>
                                            {loading ? '—' : item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function SeverityBar({ label, value, total, color}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between mb-8" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{value || 0} <span style={{ fontWeight: 400 }}>({pct}%)</span></span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 1s ease' }} />
            </div>
        </div>
    );
}
