import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Mail, Lock, Eye, EyeOff, HardHat, Wrench,
    CheckCircle, ShieldCheck, Zap, BarChart3, LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.error('Please fill in all fields');
        setLoading(true);
        try {
            const userData = await login(form.email, form.password);
            toast.success(`Welcome back, ${userData.name}!`);
            
            if (userData.role === 'site_engineer') {
                navigate('/engineer/dashboard');
            } else if (!userData.profile_completed) {
                navigate('/complete-profile');
            } else {
                navigate('/contractor/dashboard');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            {/* ── LEFT PANEL ── */}
            <div className="auth-left">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">
                        <HardHat size={22} color="#fff" />
                    </div>
                    <div>
                        <div className="auth-brand-name">SnagDetect</div>
                        <div className="auth-brand-tagline">AI-Powered Inspection Platform</div>
                    </div>
                </div>

                {/* Headline */}
                <h1 className="auth-left-headline">
                    Smarter<br />
                    <span>Construction</span><br />
                    Inspections
                </h1>
                <p className="auth-left-desc">
                    Detect structural cracks with AI precision. Generate instant reports and
                    coordinate repairs — all from one platform.
                </p>

                {/* Feature list */}
                <div className="auth-feature-list">
                    {[
                        { icon: <Zap size={15} />, text: 'AI crack detection in seconds' },
                        { icon: <ShieldCheck size={15} />, text: 'Human-in-the-loop review' },
                        { icon: <BarChart3 size={15} />, text: 'Auto-generated PDF reports' },
                        { icon: <CheckCircle size={15} />, text: 'Real-time contractor alerts' },
                    ].map((f, i) => (
                        <div className="auth-feature-item" key={i}>
                            <div style={{ color: 'var(--orange-light)', flexShrink: 0 }}>{f.icon}</div>
                            {f.text}
                        </div>
                    ))}
                </div>

                {/* Construction graphic (CSS art) */}
                <div style={{ marginTop: 'auto', paddingTop: 32 }}>
                    <ConstructionGraphic />
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="auth-right">
                <div className="auth-card">
                    <h2 className="auth-right-title">Sign in to your account</h2>
                    <p className="auth-right-sub">Enter your credentials to access the dashboard</p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <Mail size={15} className="input-icon" />
                                <input
                                    id="login-email"
                                    type="email" name="email"
                                    className="form-input"
                                    placeholder="you@company.com"
                                    value={form.email} onChange={handleChange}
                                    autoComplete="email"
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-wrapper" style={{ position: 'relative' }}>
                                <Lock size={15} className="input-icon" />
                                <input
                                    id="login-password"
                                    type={showPwd ? 'text' : 'password'} name="password"
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={form.password} onChange={handleChange}
                                    style={{ paddingLeft: 40, paddingRight: 42 }}
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    display: 'flex', padding: 4,
                                }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button id="login-btn" type="submit" className="btn btn-primary btn-full btn-lg"
                            disabled={loading} style={{ marginTop: 4, gap: 10 }}>
                            {loading ? <span className="spinner" /> : <><LogIn size={17} /> Sign In</>}
                        </button>
                    </form>

                    <div className="auth-divider">or create a new account</div>

                    <div className="role-btn-grid">
                        <Link to="/signup/engineer" id="signup-engineer-btn" className="role-btn">
                            <div className="role-btn-icon" style={{ background: 'rgba(234,88,12,0.1)' }}>
                                <HardHat size={20} color="var(--orange)" />
                            </div>
                            <div className="role-btn-label">Site Engineer</div>
                            <div className="role-btn-sub">Inspect & report</div>
                        </Link>
                        <Link to="/signup/contractor" id="signup-contractor-btn" className="role-btn">
                            <div className="role-btn-icon" style={{ background: 'rgba(217,119,6,0.1)' }}>
                                <Wrench size={20} color="var(--amber)" />
                            </div>
                            <div className="role-btn-label">Contractor</div>
                            <div className="role-btn-sub">Fix & resolve</div>
                        </Link>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
                        By signing in, you agree to the platform's terms of use.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* Simple CSS-based construction graphic */
function ConstructionGraphic() {
    return (
        <div style={{ position: 'relative', width: '100%', height: 80, opacity: 0.25 }}>
            {/* Ground line */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,248,240,0.5)' }} />
            {/* Building silhouette blocks */}
            {[
                { left: '5%', width: 30, height: 60 },
                { left: '15%', width: 50, height: 80 },
                { left: '30%', width: 20, height: 45 },
                { left: '38%', width: 40, height: 70 },
                { left: '55%', width: 60, height: 68 },
                { left: '72%', width: 25, height: 50 },
                { left: '80%', width: 45, height: 75 },
            ].map((b, i) => (
                <div key={i} style={{
                    position: 'absolute', bottom: 2, left: b.left,
                    width: b.width, height: b.height,
                    background: 'rgba(255,248,240,0.6)', borderRadius: '3px 3px 0 0',
                }} />
            ))}
            {/* Crane */}
            <div style={{ position: 'absolute', bottom: 2, right: '5%', width: 3, height: 72, background: 'rgba(255,248,240,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 72, right: '5%', width: 50, height: 3, background: 'rgba(255,248,240,0.5)', transformOrigin: 'right bottom' }} />
        </div>
    );
}
