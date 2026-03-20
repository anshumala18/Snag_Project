import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { Building2, Mail, Phone, Lock, Wrench, ArrowLeft, ClipboardList, CheckCircle, UserCircle, Edit3, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['Civil', 'Electrical', 'Plumbing', 'Structural', 'General'];

export default function UpdateProfile() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ 
        name: '', 
        personalEmail: '', 
        companyEmail: '', 
        phone: '', 
        licenseNumber: '',
        specialization: '',
        otp: '',
        consentTerms: false,
        consentSurvey: false,
        consentContact: false
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    // OTP States
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        const fetchLatestProfile = async () => {
            try {
                const res = await authAPI.getProfile();
                if (res.data.success) {
                    updateUser(res.data.data);
                }
            } catch (err) {
                console.error("Failed to refresh profile:", err);
            }
        };
        fetchLatestProfile();
    }, []);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                personalEmail: user.personal_email || user.email || '',
                companyEmail: user.company_email || '',
                phone: user.phone || '',
                licenseNumber: user.license_number || '',
                specialization: user.specialization || '',
                consentTerms: !!user.consent_terms,
                consentSurvey: !!user.consent_survey,
                consentContact: !!user.consent_contact
            });
            if (user.phone_verified) {
                setOtpVerified(true);
            }
        }
    }, [user]);

    const handleChange = (e) => {
        if (!isEditing && e.target.type !== 'checkbox') return;
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Company Name is required';
        if (!form.licenseNumber?.trim()) e.licenseNumber = 'License number is required';
        if (form.licenseNumber?.trim().length < 6) e.licenseNumber = 'Min 6 characters';
        if (!form.companyEmail?.trim()) e.companyEmail = 'Company email is required';
        if (!form.consentTerms) e.consentTerms = 'You must agree to terms';
        return e;
    };

    const handleSendOTP = async () => {
        if (!form.phone.trim()) { setErrors({ ...errors, phone: 'Enter phone number' }); return; }
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
            const res = await authAPI.updateProfile({ 
                name: form.name.trim(), 
                license_number: form.licenseNumber.trim(),
                company_email: form.companyEmail.trim().toLowerCase(),
                specialization: form.specialization,
                consent_terms: form.consentTerms,
                consent_survey: form.consentSurvey,
                consent_contact: form.consentContact,
                phone_verified: otpVerified
            });
            
            // Update local user state via context
            updateUser(res.data.data);
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <Link to="/contractor/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            <ArrowLeft size={14} /> Back to dashboard
                        </Link>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            Your Profile <UserCircle size={24} color="var(--orange)" />
                        </h1>
                        <p className="page-subtitle">View and manage your account details.</p>
                    </div>

                    {!isEditing ? (
                        <button className="btn btn-primary" onClick={() => setIsEditing(true)} style={{ gap: 8 }}>
                            <Edit3 size={16} /> Edit Details
                        </button>
                    ) : (
                        <div className="flex gap-12">
                             <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                             <button className="btn btn-warning" onClick={handleSubmit} disabled={loading} style={{ gap: 8 }}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="page-body">
                    <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label">Contractor / Company Name *</label>
                                <div className="input-wrapper">
                                    <Building2 size={15} className="input-icon" />
                                    <input id="con-name" type="text" name="name" className="form-input"
                                        placeholder="Enter contractor name" value={form.name} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} disabled={!isEditing} />
                                </div>
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">License Number *</label>
                                <div className="input-wrapper">
                                    <ClipboardList size={15} className="input-icon" />
                                    <input id="con-license" type="text" name="licenseNumber" className="form-input"
                                        placeholder="Enter contractor license number" value={form.licenseNumber} onChange={handleChange}
                                        style={{ paddingLeft: 40 }} disabled={!isEditing} />
                                </div>
                                {errors.licenseNumber && <span className="form-error">{errors.licenseNumber}</span>}
                            </div>

                            <div className="grid-2" style={{ gap: 20 }}>
                                <div className="form-group">
                                    <label className="form-label">Personal Email (Login)</label>
                                    <div className="input-wrapper">
                                        <Mail size={15} className="input-icon" />
                                        <input id="con-personal-email" type="email" name="personalEmail" className="form-input"
                                            value={form.personalEmail} readOnly
                                            style={{ paddingLeft: 40, background: 'var(--bg-muted)' }} disabled={true} />
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Primary email cannot be changed</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Company Email *</label>
                                    <div className="input-wrapper">
                                        <Building2 size={15} className="input-icon" />
                                        <input id="con-company-email" type="email" name="companyEmail" className="form-input"
                                            placeholder="Official company email" value={form.companyEmail} onChange={handleChange}
                                            style={{ paddingLeft: 40 }} disabled={!isEditing} />
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
                                            placeholder="Phone number" value={form.phone} onChange={handleChange}
                                            style={{ paddingLeft: 40 }} disabled={!isEditing || otpVerified} />
                                    </div>
                                    {isEditing && !otpVerified && (
                                        <button type="button" className="btn btn-secondary btn-sm" 
                                            onClick={handleSendOTP} disabled={sendingOtp || resendTimer > 0}
                                            style={{ whiteSpace: 'nowrap', minWidth: 100 }}>
                                            {sendingOtp ? <span className="spinner" /> : resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Send OTP'}
                                        </button>
                                    )}
                                </div>
                                {errors.phone && <span className="form-error">{errors.phone}</span>}
                            </div>

                            {isEditing && otpSent && !otpVerified && (
                                <div className="form-group" style={{ background: 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
                                    <label className="form-label">Enter OTP *</label>
                                    <div className="flex gap-8">
                                        <div className="input-wrapper" style={{ flex: 1 }}>
                                            <Lock size={15} className="input-icon" />
                                            <input id="con-otp" type="text" name="otp" className="form-input"
                                                placeholder="6-digit OTP" value={form.otp} onChange={handleChange}
                                                style={{ paddingLeft: 40 }} />
                                        </div>
                                        <button type="button" className="btn btn-primary btn-sm" 
                                            onClick={handleVerifyOTP} disabled={verifyingOtp}
                                            style={{ whiteSpace: 'nowrap', minWidth: 100 }}>
                                            {verifyingOtp ? <span className="spinner" /> : 'Verify'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {otpVerified && (
                                <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: -8 }}>
                                    <CheckCircle size={16} /> Email verified
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Specialization</label>
                                <div className="input-wrapper">
                                    <Wrench size={15} className="input-icon" />
                                    <select id="con-specialization" name="specialization" className="form-select form-input"
                                        value={form.specialization} onChange={handleChange} style={{ paddingLeft: 40 }} disabled={!isEditing}>
                                        <option value="">Select specialty...</option>
                                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--bg-body)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', gap: 12, cursor: isEditing ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentTerms" checked={form.consentTerms} onChange={handleChange} style={{ marginTop: 4 }} disabled={!isEditing} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>I agree to <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Terms and Conditions</span> *</span>
                                </label>
                                <label style={{ display: 'flex', gap: 12, cursor: isEditing ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentSurvey" checked={form.consentSurvey} onChange={handleChange} style={{ marginTop: 4 }} disabled={!isEditing} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Participate in construction improvement survey</span>
                                </label>
                                <label style={{ display: 'flex', gap: 12, cursor: isEditing ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                                    <input type="checkbox" name="consentContact" checked={form.consentContact} onChange={handleChange} style={{ marginTop: 4 }} disabled={!isEditing} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Can we contact you via phone?</span>
                                </label>
                                {errors.consentTerms && <span className="form-error" style={{ marginTop: 0 }}>{errors.consentTerms}</span>}
                            </div>

                            {isEditing && (
                                <button type="submit" className="btn btn-warning btn-full btn-lg"
                                    disabled={loading || !otpVerified || !form.consentTerms} style={{ marginTop: 10 }}>
                                    {loading ? <span className="spinner" /> : <><CheckCircle size={18} /> Save Changes</>}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
