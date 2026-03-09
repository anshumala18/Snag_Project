import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Building2, Mail, Phone, Lock, Eye, EyeOff, HardHat, ArrowLeft, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EngineerSignup() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Full name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
        if (!form.password) e.password = 'Password is required';
        if (form.password.length < 6) e.password = 'Minimum 6 characters';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await register({ name: form.name.trim(), company: form.company.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), password: form.password, role: 'site_engineer' });
            toast.success('Account created successfully!');
            navigate('/engineer/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            {/* LEFT panel */}
            <div className="auth-left">
                <div className="auth-brand">
                    <div className="auth-brand-icon"><HardHat size={22} color="#fff" /></div>
                    <div>
                        <div className="auth-brand-name">SnagDetect</div>
                        <div className="auth-brand-tagline">AI-Powered Inspection Platform</div>
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 1, marginTop: 16 }}>
                    <h1 className="auth-left-headline">
                        Built for<br />
                        <span>Site Engineers</span>
                    </h1>
                    <p className="auth-left-desc" style={{ marginTop: 12 }}>
                        Capture cracks, get instant AI analysis, and send reports to contractors — all from your mobile on site.
                    </p>

                    {/* Feature cards */}
                    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { icon: <HardHat size={16} />, title: 'On-Site Capture', desc: 'Camera & gallery upload' },
                            { icon: <Mail size={16} />, title: 'Instant Reports', desc: 'Auto-email to contractors' },
                            { icon: <Building2 size={16} />, title: 'Project Management', desc: 'Organize by project & floor' },
                        ].map((f, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 12, alignItems: 'flex-start',
                                background: 'rgba(255,248,240,0.05)', border: '1px solid rgba(255,248,240,0.08)',
                                borderRadius: 'var(--r-md)', padding: '12px 14px'
                            }}>
                                <div style={{ color: 'var(--orange-light)', marginTop: 1 }}>{f.icon}</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,248,240,0.9)' }}>{f.title}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,248,240,0.45)', marginTop: 2 }}>{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT panel */}
            <div className="auth-right">
                <div className="auth-card" style={{ maxWidth: 460 }}>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
                        <ArrowLeft size={14} /> Back to login
                    </Link>

                    <h2 className="auth-right-title">Create Engineer Account</h2>
                    <p className="auth-right-sub">Register as a site engineer to start detecting snags</p>

                    {/* Role indicator bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.15)',
                        borderRadius: 'var(--r-md)', marginBottom: 20
                    }}>
                        <HardHat size={16} color="var(--orange)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)' }}>
                            Account type: <strong>Site Engineer</strong>
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <div className="input-wrapper">
                                <User size={15} className="input-icon" />
                                <input id="eng-name" type="text" name="name" className="form-input"
                                    placeholder="Rahul Sharma" value={form.name} onChange={handleChange}
                                    style={{ paddingLeft: 40 }} />
                            </div>
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Company / Organization</label>
                            <div className="input-wrapper">
                                <Building2 size={15} className="input-icon" />
                                <input id="eng-company" type="text" name="company" className="form-input"
                                    placeholder="ABC Construction Ltd." value={form.company} onChange={handleChange}
                                    style={{ paddingLeft: 40 }} />
                            </div>
                        </div>

                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <div className="input-wrapper">
                                    <Mail size={15} className="input-icon" />
                                    <input id="eng-email" type="email" name="email" className="form-input"
                                        placeholder="rahul@site.com" value={form.email} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} />
                                </div>
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <div className="input-wrapper">
                                    <Phone size={15} className="input-icon" />
                                    <input id="eng-phone" type="tel" name="phone" className="form-input"
                                        placeholder="+91 98765 43210" value={form.phone} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <div className="input-wrapper" style={{ position: 'relative' }}>
                                <Lock size={15} className="input-icon" />
                                <input id="eng-password" type={showPwd ? 'text' : 'password'} name="password"
                                    className="form-input" placeholder="Min. 6 characters"
                                    value={form.password} onChange={handleChange}
                                    style={{ paddingLeft: 40, paddingRight: 42 }} />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
                                }}>
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password *</label>
                            <div className="input-wrapper">
                                <Lock size={15} className="input-icon" />
                                <input id="eng-confirm-password" type="password" name="confirmPassword"
                                    className="form-input" placeholder="Repeat your password"
                                    value={form.confirmPassword} onChange={handleChange}
                                    style={{ paddingLeft: 40 }} />
                            </div>
                            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                        </div>

                        <button id="eng-signup-btn" type="submit" className="btn btn-primary btn-full btn-lg"
                            disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <span className="spinner" /> : <><UserPlus size={17} /> Create Account</>}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
                        Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
