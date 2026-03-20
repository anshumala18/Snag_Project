import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { Building2, Mail, Phone, Lock, Eye, EyeOff, Wrench, ArrowLeft, UserPlus, ClipboardList, Bell, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['Civil', 'Electrical', 'Plumbing', 'Structural', 'General'];

export default function ContractorSignup() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ 
        name: '', 
        personalEmail: '', 
        companyEmail: '', 
        phone: '', 
        licenseNumber: '',
        password: '', 
        confirmPassword: '', 
        specialization: '',
        otp: '',
        consentTerms: false,
        consentSurvey: false,
        consentContact: false
    });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    // OTP States
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
        if (errors[name]) setErrors({ ...errors, [name]: '' });
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Company Name is required';
        if (!form.licenseNumber.trim()) e.licenseNumber = 'License number is required';
        if (form.licenseNumber.trim().length < 6) e.licenseNumber = 'Min 6 characters';
        
        if (!form.personalEmail.trim()) e.personalEmail = 'Personal email is required';
        if (!/\S+@\S+\.\S+/.test(form.personalEmail)) e.personalEmail = 'Invalid format';
        
        if (!form.companyEmail.trim()) e.companyEmail = 'Company email is required';
        const publicEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
        const domain = form.companyEmail.split('@')[1];
        if (publicEmailDomains.includes(domain)) e.companyEmail = 'Use official company email';
        if (!/\S+@\S+\.\S+/.test(form.companyEmail)) e.companyEmail = 'Invalid format';

        if (!form.phone.trim()) e.phone = 'Phone is required';
        if (!otpVerified) e.phone = 'Please verify your phone number';

        if (!form.password) e.password = 'Password is required';
        if (form.password.length < 6) e.password = 'Minimum 6 characters';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        
        if (!form.consentTerms) e.consentTerms = 'You must agree to terms';
        return e;
    };

    const handleSendOTP = async () => {
        if (!form.phone.trim()) { setErrors({ ...errors, phone: 'Enter phone number' }); return; }
        if (!form.personalEmail.trim()) { setErrors({ ...errors, personalEmail: 'Enter personal email first' }); return; }
        setSendingOtp(true);
        try {
            await authAPI.sendOTP(form.phone, form.personalEmail);
            setOtpSent(true);
            setResendTimer(30);
            toast.success('OTP sent to your personal email!');
            const timer = setInterval(() => {
                setResendTimer(t => { if (t <= 1) { clearInterval(timer); return 0; } return t - 1; });
            }, 1000);
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Failed to send OTP'); 
        } finally { setSendingOtp(false); }
    };

    const handleVerifyOTP = async () => {
        if (!form.otp.trim()) { setErrors({ ...errors, otp: 'Enter OTP' }); return; }
        setVerifyingOtp(true);
        try {
            await authAPI.verifyOTP(form.phone, form.otp);
            setOtpVerified(true);
            toast.success('Email verified successfully!');
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Invalid OTP'); 
        } finally { setVerifyingOtp(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await register({ 
                name: form.name.trim(), 
                companyName: form.name.trim(), 
                personalEmail: form.personalEmail.trim().toLowerCase(), 
                companyEmail: form.companyEmail.trim().toLowerCase(),
                phone: form.phone.trim(), 
                licenseNumber: form.licenseNumber.trim(),
                specialization: form.specialization,
                password: form.password, 
                consentTerms: form.consentTerms,
                consentSurvey: form.consentSurvey,
                consentContact: form.consentContact,
                phoneVerified: true,
                role: 'contractor' 
            });
            toast.success('Account created successfully!');
            navigate('/contractor/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            {/* LEFT panel */}
            <div className="auth-left" style={{ background: 'linear-gradient(160deg,#1C1208 0%,#2A1A08 50%,#3A2410 100%)' }}>
                <div className="auth-brand">
                    <div className="auth-brand-icon" style={{ background: 'linear-gradient(135deg,var(--amber),var(--amber-light))' }}>
                        <Wrench size={22} color="#fff" />
                    </div>
                    <div>
                        <div className="auth-brand-name">SnagDetect</div>
                        <div className="auth-brand-tagline">Contractor Portal</div>
                    </div>
                </div>

                <h1 className="auth-left-headline" style={{ position: 'relative', zIndex: 1 }}>
                    Manage<br />
                    <span style={{ color: 'var(--amber-light)' }}>Repairs</span><br />
                    Efficiently
                </h1>
                <p className="auth-left-desc" style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
                    Receive snag reports, view crack images, and update repair status — keep projects on track.
                </p>

                <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
                    {[
                        { icon: <Bell size={16} />, title: 'Instant Notifications', desc: 'Get alerted for new snags' },
                        { icon: <ClipboardList size={16} />, title: 'Repair Task Management', desc: 'Track pending & resolved jobs' },
                        { icon: <Wrench size={16} />, title: 'Status Updates', desc: 'Notify engineers when done' },
                    ].map((f, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            background: 'rgba(255,248,240,0.05)', border: '1px solid rgba(255,248,240,0.08)',
                            borderRadius: 'var(--r-md)', padding: '12px 14px'
                        }}>
                            <div style={{ color: 'var(--amber-light)', marginTop: 1 }}>{f.icon}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,248,240,0.9)' }}>{f.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,248,240,0.45)', marginTop: 2 }}>{f.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT panel */}
            <div className="auth-right">
                <div className="auth-card" style={{ maxWidth: 460 }}>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
                        <ArrowLeft size={14} /> Back to login
                    </Link>

                    <h2 className="auth-right-title">Create Contractor Account</h2>
                    <p className="auth-right-sub">Register to receive and manage repair tasks</p>

                    {/* Role indicator */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)',
                        borderRadius: 'var(--r-md)', marginBottom: 20
                    }}>
                        <Wrench size={16} color="var(--amber)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                            Account type: <strong>Contractor</strong>
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Contractor / Company Name *</label>
                                <div className="input-wrapper">
                                    <Building2 size={15} className="input-icon" />
                                    <input id="con-name" type="text" name="name" className="form-input"
                                        placeholder="Amit Repairs & Co." value={form.name} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} />
                                </div>
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">License Number *</label>
                                <div className="input-wrapper">
                                    <ClipboardList size={15} className="input-icon" />
                                    <input id="con-license" type="text" name="licenseNumber" className="form-input"
                                        placeholder="Enter contractor license number (GST / Registration ID)" value={form.licenseNumber} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} />
                                </div>
                                {errors.licenseNumber && <span className="form-error">{errors.licenseNumber}</span>}
                            </div>

                            <div className="grid-2" style={{ gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Personal Email *</label>
                                    <div className="input-wrapper">
                                        <Mail size={15} className="input-icon" />
                                        <input id="con-personal-email" type="email" name="personalEmail" className="form-input"
                                            placeholder="Enter your personal email" value={form.personalEmail} onChange={handleChange}
                                            style={{ paddingLeft: 40 }} />
                                    </div>
                                    {errors.personalEmail && <span className="form-error">{errors.personalEmail}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Company Email *</label>
                                    <div className="input-wrapper">
                                        <Building2 size={15} className="input-icon" />
                                        <input id="con-company-email" type="email" name="companyEmail" className="form-input"
                                            placeholder="Enter official company email" value={form.companyEmail} onChange={handleChange}
                                            style={{ paddingLeft: 40 }} />
                                    </div>
                                    {errors.companyEmail && <span className="form-error">{errors.companyEmail}</span>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <div className="flex gap-8">
                                    <div className="input-wrapper" style={{ flex: 1 }}>
                                        <Phone size={15} className="input-icon" />
                                        <input id="con-phone" type="tel" name="phone" className="form-input"
                                            placeholder="+91 98765 43210" value={form.phone} onChange={handleChange}
                                            style={{ paddingLeft: 40 }} disabled={otpVerified} />
                                    </div>
                                    {!otpVerified && (
                                        <button type="button" className="btn btn-secondary btn-sm" 
                                            onClick={handleSendOTP} disabled={sendingOtp || resendTimer > 0}
                                            style={{ whiteSpace: 'nowrap', minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {sendingOtp ? <span className="spinner" /> : resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Send OTP'}
                                        </button>
                                    )}
                                </div>
                                {errors.phone && <span className="form-error">{errors.phone}</span>}
                            </div>

                            {otpSent && !otpVerified && (
                                <div className="form-group" style={{ background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
                                    <label className="form-label">Enter OTP *</label>
                                    <div className="flex gap-8">
                                        <div className="input-wrapper" style={{ flex: 1 }}>
                                            <Lock size={15} className="input-icon" />
                                            <input id="con-otp" type="text" name="otp" className="form-input"
                                                placeholder="Enter 6-digit OTP" value={form.otp} onChange={handleChange}
                                                style={{ paddingLeft: 40 }} />
                                        </div>
                                        <button type="button" className="btn btn-primary btn-sm" 
                                            onClick={handleVerifyOTP} disabled={verifyingOtp}
                                            style={{ whiteSpace: 'nowrap', minWidth: 100 }}>
                                            {verifyingOtp ? <span className="spinner" /> : 'Verify OTP'}
                                        </button>
                                    </div>
                                    {errors.otp && <span className="form-error">{errors.otp}</span>}
                                </div>
                            )}

                            {otpVerified && (
                                <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <CheckCircle size={14} /> Email verified
                                </div>
                            )}

                        <div className="form-group">
                            <label className="form-label">Specialization <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                            <div className="input-wrapper">
                                <Wrench size={15} className="input-icon" />
                                <select id="con-specialization" name="specialization" className="form-select form-input"
                                    value={form.specialization} onChange={handleChange} style={{ paddingLeft: 40 }}>
                                    <option value="">Select your specialty...</option>
                                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <div className="input-wrapper" style={{ position: 'relative' }}>
                                <Lock size={15} className="input-icon" />
                                <input id="con-password" type={showPwd ? 'text' : 'password'} name="password"
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
                                    <input id="con-confirm-password" type="password" name="confirmPassword"
                                        className="form-input" placeholder="Repeat your password"
                                        value={form.confirmPassword} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} />
                                </div>
                                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6, padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentTerms" checked={form.consentTerms} onChange={handleChange} style={{ marginTop: 3 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>I agree to <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Terms and Conditions</span> *</span>
                                </label>
                                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentSurvey" checked={form.consentSurvey} onChange={handleChange} style={{ marginTop: 3 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>I want to participate in survey for improving the application</span>
                                </label>
                                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentContact" checked={form.consentContact} onChange={handleChange} style={{ marginTop: 3 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Can we contact you via phone?</span>
                                </label>
                                {errors.consentTerms && <span className="form-error" style={{ marginTop: 0 }}>{errors.consentTerms}</span>}
                            </div>

                            <button id="con-signup-btn" type="submit" className="btn btn-warning btn-full btn-lg"
                                disabled={loading || !otpVerified || !form.consentTerms} style={{ marginTop: 4 }}>
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
