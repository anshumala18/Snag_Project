import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { Wrench, CheckCircle, Clock, AlertTriangle, Inbox, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBackendRoot } from '../../api/backendUtils';

const BACKEND = getBackendRoot();

export default function ContractorDashboard() {
    const { user } = useAuth();
    const [snags, setSnags] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useSocket();

    useEffect(() => {
        Promise.all([
            snagAPI.getAll(),
            snagAPI.getStats(),
        ]).then(([sRes, stRes]) => {
            setSnags(sRes.data.data.slice(0, 5)); // latest 5
            setStats(stRes.data.data);
        }).catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    }, []);

    const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            Contractor Dashboard <Wrench size={24} color="var(--orange)" />
                        </h1>
                        <p className="page-subtitle">Welcome, {user?.name} — manage your assigned repair tasks.</p>
                    </div>
                </div>

                <div className="page-body">
                    {/* Stats */}
                    <div className="grid-3 mb-24">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                                <Clock size={22} color="#f59e0b" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: '#f59e0b' }}>{loading ? '—' : stats?.pending || 0}</div>
                                <div className="stat-label">Pending Tasks</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(56,189,248,0.12)' }}>
                                <Wrench size={22} color="#38bdf8" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: '#38bdf8' }}>{loading ? '—' : stats?.in_progress || 0}</div>
                                <div className="stat-label">In Progress</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                                <CheckCircle size={22} color="#10b981" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: '#10b981' }}>{loading ? '—' : stats?.resolved || 0}</div>
                                <div className="stat-label">Completed</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="grid-2 mb-24">
                        <Link to="/contractor/snags" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                                <AlertTriangle size={26} color="#f59e0b" />
                            </div>
                            <div className="quick-action-title">Assigned Snags</div>
                            <div className="quick-action-sub">View all repair tasks</div>
                        </Link>
                        <Link to="/contractor/resolved" className="quick-action-card">
                            <div className="quick-action-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                                <CheckCircle size={26} color="#10b981" />
                            </div>
                            <div className="quick-action-title">Completed Repairs</div>
                            <div className="quick-action-sub">View resolved snags</div>
                        </Link>
                    </div>

                    {/* Recent assigned snags */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Inbox size={17} color="var(--orange)" /> Recently Assigned
                            </h3>
                            <Link to="/contractor/snags" style={{ fontSize: 13, color: 'var(--accent)' }}>View All →</Link>
                        </div>
                        {loading ? (
                            <div className="text-center" style={{ padding: 40 }}><div className="spinner spinner-lg" style={{ margin: 'auto' }} /></div>
                        ) : snags.length === 0 ? (
                            <div className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                                <p>No snags assigned yet. Check back later.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Photo</th>
                                            <th>Snag ID</th>
                                            <th>Location</th>
                                            <th>Crack Type</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {snags.map((s) => (
                                            <tr key={s.snag_id}>
                                                <td>
                                                    {s.images?.[0]?.image_url
                                                        ? <img src={`${BACKEND}${s.images[0].image_url}`} alt="" className="snag-thumb" />
                                                        : <div className="snag-thumb-placeholder"><Camera size={16} /></div>}
                                                </td>
                                                <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{s.snag_code}</span></td>
                                                <td style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.location_desc}</td>
                                                <td>{s.crack_type ? <span className={`badge badge-${s.crack_type}`}>{s.crack_type}</span> : '—'}</td>
                                                <td>{s.severity ? <span className={`badge badge-${s.severity}`}>{s.severity.toUpperCase()}</span> : '—'}</td>
                                                <td><span className={`badge badge-${s.status}`}>{s.status?.replace('_', ' ').toUpperCase()}</span></td>
                                                <td>
                                                    <Link to={`/contractor/snags/${s.snag_id}`} className="btn btn-sm btn-secondary">
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
