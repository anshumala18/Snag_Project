import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { snagAPI, authAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { useSocket } from '../../hooks/useSocket';
import {
    AlertOctagon, FolderOpen, PlusCircle, FileText,
    CheckCircle, Clock, Activity, TrendingUp, ShieldCheck, Zap, AlertTriangle, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EngineerDashboard() {
    const { user, updateUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // OTP / Verification States
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);

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
        window.addEventListener('snag_synced', fetchStats);
        return () => window.removeEventListener('snag_synced', fetchStats);
    }, []);

    const handleSendOTP = async () => {
        setVerifying(true);
        try {
            await authAPI.sendOTP(user.phone, user.email || user.personal_email);
            toast.success('Verification OTP sent to your email.');
            setShowVerifyModal(true);
        } catch (err) {
            toast.error('Failed to send OTP. Please update your profile with a valid phone/email.');
        } finally {
            setVerifying(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length < 6) return toast.error('Enter 6-digit OTP');
        setVerifying(true);
        try {
            await authAPI.verifyOTP(user.phone, otp);
            // Update user in context/localStorage
            const updatedUser = { ...user, phone_verified: true };
            updateUser(updatedUser);
            toast.success('Account successfully verified!', { icon: '🛡️' });
            setShowVerifyModal(false);
        } catch (err) {
            toast.error('Invalid OTP. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
                                {user?.phone_verified ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', padding: '4px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                                        <ShieldCheck size={14} color="#10b981" />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>Verified Engineer</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff7ed', padding: '4px 10px', borderRadius: 20, border: '1px solid #ffedd5' }}>
                                        <AlertTriangle size={14} color="#f97316" />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9a3412' }}>Unverified</span>
                                    </div>
                                )}
                            </div>
                            <p className="page-subtitle">Here is your inspection overview for today</p>
                        </div>
                        <div className="flex gap-12">
                            <Link to="/engineer/generate" className="btn btn-primary">
                                <PlusCircle size={16} /> Detect Snag
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="page-body">
                    {/* --- OTP Verification Banner --- */}
                    {!user?.phone_verified && (
                        <div style={{ 
                            background: 'linear-gradient(90deg, #1e293b, #334155)', 
                            borderRadius: 12, 
                            padding: '16px 20px', 
                            marginBottom: 24, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(234,88,12,0.15)', display: 'flex', alignItems: 'center', justifyCenter: 'center', border: '1px solid rgba(234,88,12,0.2)' }}>
                                    <ShieldCheck size={24} color="var(--orange)" style={{ margin: 'auto' }} />
                                </div>
                                <div>
                                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Secure your account with OTP</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>Verify your email to enable instant contractor reporting.</div>
                                </div>
                            </div>
                            <button 
                                onClick={handleSendOTP} 
                                disabled={verifying}
                                className="btn" 
                                style={{ background: 'var(--orange)', color: '#fff', border: 'none', px: 20, fontWeight: 700 }}
                            >
                                {verifying ? 'Sending...' : 'Verify Now'}
                            </button>
                        </div>
                    )}

                    {/* --- OTP Verification Modal --- */}
                    {showVerifyModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                            <div style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 16, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                                <button onClick={() => setShowVerifyModal(false)} style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                                
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ width: 64, height: 64, background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <ShieldCheck size={32} color="#10b981" />
                                    </div>
                                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Enter Verification Code</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>We've sent a 6-digit OTP to your registered email.</p>
                                </div>

                                <div className="form-group" style={{ marginBottom: 24 }}>
                                    <input 
                                        type="text" 
                                        maxLength="6"
                                        className="form-input" 
                                        placeholder="0 0 0 0 0 0" 
                                        value={otp} 
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        style={{ letterSpacing: '8px', fontSize: '24px', fontWeight: 800, textAlign: 'center', padding: '16px 0', border: '2px solid var(--orange)' }} 
                                    />
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                                        Didn't receive the code? <button onClick={handleSendOTP} style={{ color: 'var(--orange)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Resend Now</button>
                                    </p>
                                </div>

                                <button 
                                    onClick={handleVerifyOTP} 
                                    disabled={verifying}
                                    className="btn btn-primary btn-full btn-lg"
                                >
                                    {verifying ? 'Verifying...' : 'Verify & Secure Account'}
                                </button>
                            </div>
                        </div>
                    )}
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
