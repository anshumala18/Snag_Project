import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { snagAPI, projectAPI, authAPI } from '../../api';
import { useOnlineStatus } from '../../hooks/useSocket';
import { saveOfflineSnag, removeOfflineSnag } from '../../utils/offlineStorage';
import Sidebar from '../../components/Sidebar';
import { 
    Camera, Upload, X, AlertTriangle, MapPin, 
    Calendar, WifiOff, Cpu, Image, ClipboardList, CheckCircle, 
    AlertOctagon, Send, Smartphone, Zap, ArrowLeft, Mail, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAIImageUrl, getImageUrl, getBackendRoot } from '../../api/backendUtils';

const CRACK_TYPES = [
    { value: 'hairline', label: 'Hairline Crack', desc: 'Very thin, cosmetic', icon: <CheckCircle size={18} color="var(--success)" /> },
    { value: 'surface', label: 'Surface Crack', desc: 'Visible plaster crack', icon: <AlertTriangle size={18} color="var(--warning)" /> },
    { value: 'structural', label: 'Structural Crack', desc: 'Deep structural issue', icon: <AlertOctagon size={18} color="var(--danger)" /> },
];
const SEVERITIES = [
    { value: 'low', label: 'Low', color: 'var(--success)', desc: 'Minor, monitor only' },
    { value: 'medium', label: 'Medium', color: 'var(--warning)', desc: 'Needs repair' },
    { value: 'high', label: 'High', color: 'var(--danger)', desc: 'Urgent attention' },
];

export default function GenerateSnag() {
    const navigate = useNavigate();
    const location = useLocation();
    const online = useOnlineStatus();
    const [offlineId, setOfflineId] = useState(null);
    const fileRef = useRef(null);
    const camRef = useRef(null);

    const [step, setStep] = useState(1); // 1: Image, 2: AI Result, 3: Details, 4: Review
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [projects, setProjects] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // --- Review data ---
    const [previewReport, setPreviewReport] = useState(null);
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [lastCreatedSnagId, setLastCreatedSnagId] = useState(null);
    const [feedbackVerified, setFeedbackVerified] = useState(null); // null, true (Correct), false (Wrong)

    const [form, setForm] = useState({
        project_id: '', location_desc: '', description: '',
        crack_type: '', severity: '', contractor_id: '', target_date: '',
        latitude: null, longitude: null
    });

    async function captureLocation() {
        if (!navigator.geolocation) return toast.error("Geolocation is not supported");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                toast.success("📍 GPS Captured!");
            },
            (err) => {
                if (err.code === 1) toast.error("Reset permission in 🔒 lock icon.");
                else toast.error("GPS Error.");
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    async function handleFile(file) {
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        captureLocation();
        
        if (!online) {
            setAnalyzing(false);
            const offlineData = {
                ...form,
                location_desc: form.location_desc || `Offline Capture ${new Date().toLocaleTimeString()}`,
                imagePreview: URL.createObjectURL(file),
                imageFile: file,
                savedAt: new Date().toISOString()
            };
            await saveOfflineSnag(offlineData);
            toast.success("Saved Offline!");
            navigate('/engineer/snags');
            return;
        }

        setAnalyzing(true);
        setStep(2);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await snagAPI.create(fd);
            const ai = res.data.ai;
            setAiResult(ai);

            // --- PRE-FILL FORM FROM AI ---
            const aiCrackType = ai?.crack_type?.toLowerCase();
            const aiSeverity = ai?.severity?.toLowerCase();

            setForm((prev) => ({
                ...prev,
                crack_type: aiCrackType || prev.crack_type,
                severity: aiSeverity || prev.severity,
            }));

            // --- AI CONTRACTOR AUTO-SELECTION ---
            const recommendedSpec = ai?.recommended_specialization;
            if (recommendedSpec && contractors.length > 0) {
                const specTerms = recommendedSpec.toLowerCase().split(' / ');
                const match = contractors.find(c => 
                    c.specialization && specTerms.some(term => 
                        c.specialization.toLowerCase().includes(term.trim())
                    )
                );
                if (match) {
                    setForm(prev => ({ ...prev, contractor_id: match.user_id }));
                    // Using a small delay to ensure toast doesn't overlap with detection toast
                    setTimeout(() => toast.success(`AI Recommended: ${match.name}`, { icon: '✨' }), 1000);
                }
            }
            
            setTimeout(() => setStep(3), 1500);
        } catch (err) {
            toast.error("AI detection failed");
        } finally {
            setAnalyzing(false);
        }
    };

    useEffect(() => {
        projectAPI.getAll().then((r) => setProjects(r.data.data || [])).catch(() => setProjects([]));
        authAPI.getContractors().then((r) => setContractors(r.data.data || [])).catch(() => setContractors([]));
        
        if (location.state?.offlineSnag) {
            const snag = location.state.offlineSnag;
            setOfflineId(snag.id);
            if (snag.imagePreview) setImagePreview(snag.imagePreview);
            if (snag.imageFile) handleFile(snag.imageFile);
            
            setForm({
                project_id: snag.project_id || '', location_desc: snag.location_desc || '',
                description: snag.description || '', crack_type: snag.crack_type || '',
                severity: snag.severity || '', contractor_id: snag.contractor_id || '',
                target_date: snag.target_date || '', latitude: snag.latitude || null, longitude: snag.longitude || null
            });
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
                null, { enableHighAccuracy: true }
            );
        }
    }, [location.state]);
   

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, []);

    const handleDragOver = (e) => e.preventDefault();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.location_desc.trim()) return toast.error('Please enter the snag location');

        setSubmitting(true);
        try {
            const fd = new FormData();
            if (imageFile) fd.append('image', imageFile);
            Object.entries(form).forEach(([k, v]) => { 
                if (v !== null && v !== undefined && v !== '') fd.append(k, v); 
            });

            const res = await snagAPI.create(fd);
            const snagData = res.data.data;
            setLastCreatedSnagId(snagData.snag_id);

            if (form.contractor_id) {
                const previewRes = await snagAPI.getPreviewReport(snagData.snag_id);
                const { reportData, email } = previewRes.data.data;
                setPreviewReport(reportData);
                setCustomSubject(email.subject);
                setCustomBody(email.body);
                setStep(4);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                toast.success('Snag saved! Review the report before sending.');
            } else {
                toast.success('Snag successfully reported to database');
                if (offlineId) await removeOfflineSnag(offlineId);
                navigate('/engineer/snags');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create snag');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalSend = async () => {
        if (!lastCreatedSnagId) return;
        setSubmitting(true);
        try {
            await snagAPI.sendReport(lastCreatedSnagId, {
                contractor_id: form.contractor_id,
                customSubject,
                customBody,
                reportData: previewReport
            });
            toast.success('Report dispatched successfully!', { icon: '📧' });
            navigate('/engineer/snags');
        } catch (err) {
            toast.error('Failed to send report');
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setStep(1); setImageFile(null); setImagePreview(null); setAiResult(null);
        setForm({ 
            project_id: '', location_desc: '', description: '', 
            crack_type: '', severity: '', contractor_id: '', target_date: '',
            latitude: null, longitude: null
        });
    };

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">{step === 4 ? 'Review Snag Report' : 'Detect Snag'}</h1>
                    <p className="page-subtitle">
                        {step === 4 ? `Final check before sending to contractor` : `Capture or upload a crack image for AI detection`}
                    </p>
                </div>

                <div className="page-body">
                    <StepIndicator current={step} />

                    <div style={{ maxWidth: step === 4 ? 980 : 680, margin: '0 auto' }}>

                        {/* STEP 1 — Image selection (Premium Redesign) */}
                        {step === 1 && (
                            <div className="animate-fadeIn">
                                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Initialize AI Inspection</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Capture or upload a high-resolution photo for structural analysis</p>
                                </div>
                                
                                <div className="grid-2" style={{ gap: 24, marginBottom: 32 }}>
                                    <div 
                                        className="card hover-scale" 
                                        onClick={() => camRef.current?.click()}
                                        style={{ cursor: 'pointer', padding: 32, textAlign: 'center', border: '2px dashed #e2e8f0', background: '#fff', borderRadius: 20, transition: 'all 0.3s' }}
                                    >
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(234,88,12,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <Camera size={28} color="var(--orange)" />
                                        </div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Capture Photo</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Use device camera for field inspection</p>
                                    </div>

                                    <div 
                                        className="card hover-scale" 
                                        onClick={() => fileRef.current?.click()}
                                        style={{ cursor: 'pointer', padding: 32, textAlign: 'center', border: '2px dashed #e2e8f0', background: '#fff', borderRadius: 20, transition: 'all 0.3s' }}
                                    >
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <Upload size={28} color="#3b82f6" />
                                        </div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Ref. Library</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Upload from device storage or gallery</p>
                                    </div>
                                </div>

                                <div 
                                    className="upload-zone" 
                                    onDrop={handleDrop} 
                                    onDragOver={handleDragOver} 
                                    onClick={() => fileRef.current?.click()}
                                    style={{ 
                                        border: '2px dashed var(--orange)', background: 'rgba(234,88,12,0.02)', 
                                        borderRadius: 20, padding: 48, textAlign: 'center', cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{ transform: 'scale(1.2)', marginBottom: 16 }}><Image size={48} color="var(--orange)" /></div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Drop your inspection image here</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Supports JPEG, PNG, HEIC (Max 15MB)</div>
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                                <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                            </div>
                        )}

                        {/* STEP 2 — AI Analysis (Dynamic Scanning Effect) */}
                        {step === 2 && (
                            <div className="card mt-24 text-center animate-fadeIn" style={{ padding: 48, borderRadius: 24, background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', display: 'inline-block', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                    <img src={aiResult?.output_image ? getAIImageUrl(aiResult.output_image) : imagePreview} alt="Snag" className="image-preview" style={{ marginBottom: 0, display: 'block' }} />
                                    
                                    {analyzing && (
                                        <div style={{ 
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            background: 'linear-gradient(rgba(234,88,12,0) 0%, rgba(234,88,12,0.2) 50%, rgba(234,88,12,0) 100%)',
                                            animation: 'scan 2s infinite linear',
                                            borderTop: '2px solid var(--orange)',
                                            zIndex: 5
                                        }} />
                                    )}
                                </div>
                                
                                {analyzing && (
                                     <div style={{ marginTop: 32 }}>
                                         <div className="flex flex-center gap-12" style={{ marginBottom: 12 }}>
                                             <Cpu size={24} color="var(--orange)" className="animate-spin-slow" />
                                             <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Neural Intelligence Engine</h3>
                                         </div>
                                         <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Mapping structure and identifying anomalies...</p>
                                         <div style={{ width: 240, height: 6, background: '#f1f5f9', borderRadius: 3, margin: '20px auto', overflow: 'hidden' }}>
                                             <div className="progress-shimmer" style={{ height: '100%', width: '100%' }} />
                                         </div>
                                     </div>
                                 )}
                            </div>
                        )}

                        {/* STEP 3 — Details Form (Premium Redesign) */}
                        {step === 3 && (
                            <div className="mt-24 animate-fadeIn">
                                <div className="grid-2" style={{ gap: 24, marginBottom: 24, alignItems: 'stretch' }}>
                                    {/* Left: Enhanced Image Preview */}
                                    <div className="card" style={{ padding: 12, overflow: 'hidden', position: 'relative', background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 280 }}>
                                            <img src={aiResult?.output_image ? getAIImageUrl(aiResult.output_image) : imagePreview} alt="Snag" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Image size={14} /> Analysis Point
                                            </div>
                                            <button onClick={reset} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right: Modern AI Result Card */}
                                    {aiResult && (
                                        <div className="card" style={{ border: '1px solid var(--border)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(234,88,12,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Cpu size={16} color="var(--orange)" />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--orange)' }}>AI Intelligence Report</span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Primary Insight</span>
                                                    <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(234,88,12,0.1)', color: 'var(--orange)', fontWeight: 800, fontSize: 12 }}>
                                                        {aiResult?.crack_type || aiResult?.damage_type || "Analyzed"}
                                                    </span>
                                                </div>

                                                <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Confidence Score</span>
                                                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--orange)' }}>{Math.round((aiResult?.confidence || 0) * 100)}%</span>
                                                    </div>
                                                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', background: 'var(--orange)', width: `${Math.round((aiResult?.confidence || 0) * 100)}%`, transition: 'width 1s ease-out' }} />
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(59,130,246,0.03)', border: '1px dashed #3b82f644', borderRadius: 12 }}>
                                                    <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{aiResult?.total_detections || 0} distinct points detected</span>
                                                </div>
                                            </div>

                                            {/* Human Feedback Loop */}
                                            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                                <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verify Accuracy</p>
                                                <div className="flex gap-10">
                                                    <button type="button" onClick={() => { setFeedbackVerified(true); toast.success("AI Training data updated (+) "); }} className={`btn btn-sm ${feedbackVerified === true ? 'active' : ''}`} style={{ flex: 1, height: 40, borderRadius: 10, fontWeight: 700, background: feedbackVerified === true ? 'var(--success)' : '#fff', color: feedbackVerified === true ? '#fff' : 'var(--success)', border: `1px solid ${feedbackVerified === true ? 'var(--success)' : '#e2e8f0'}` }}>
                                                        <CheckCircle size={14} style={{ marginRight: 6 }} /> Looks Correct
                                                    </button>
                                                    <button type="button" onClick={() => { setFeedbackVerified(false); toast.error("Notification: AI refinement needed"); }} className={`btn btn-sm ${feedbackVerified === false ? 'active' : ''}`} style={{ flex: 1, height: 40, borderRadius: 10, fontWeight: 700, background: feedbackVerified === false ? '#ef4444' : '#fff', color: feedbackVerified === false ? '#fff' : '#ef4444', border: `1px solid ${feedbackVerified === false ? '#ef4444' : '#e2e8f0'}` }}>
                                                        <X size={14} style={{ marginRight: 6 }} /> Incorrect
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Form Section */}
                                <div className="card" style={{ borderRadius: 20, padding: 32, border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        <div className="grid-2" style={{ gap: 24 }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Project Allocation</label>
                                                <div style={{ position: 'relative' }}>
                                                    <ClipboardList size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                                    <select className="form-select form-input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 12 }}>
                                                        <option value="">Select project context...</option>
                                                        {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Specific Location *</label>
                                                <div style={{ position: 'relative' }}>
                                                    <MapPin size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                                    <input type="text" className="form-input" placeholder="e.g. Tower B, Floor 4, North Wall" value={form.location_desc} onChange={(e) => setForm({ ...form, location_desc: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 12 }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
                                            {/* LEFT: Type & Severity */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>Crack Classification</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        {CRACK_TYPES.map((ct) => (
                                                            <label key={ct.value} style={{ cursor: 'pointer' }}>
                                                                <input type="radio" name="crack_type" value={ct.value} checked={form.crack_type === ct.value} onChange={(e) => setForm({ ...form, crack_type: e.target.value })} style={{ display: 'none' }} />
                                                                <div style={{ 
                                                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                                                                    border: `2px solid ${form.crack_type === ct.value ? 'var(--orange)' : '#f1f5f9'}`,
                                                                    background: form.crack_type === ct.value ? 'rgba(234,88,12,0.05)' : '#f8fafc',
                                                                    transition: 'all 0.2s'
                                                                }}>
                                                                    <div style={{ fontSize: 16 }}>{ct.icon}</div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{ct.label}</div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ct.desc}</div>
                                                                    </div>
                                                                    {form.crack_type === ct.value && <CheckCircle size={16} color="var(--orange)" />}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>Severity Assessment</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                                        {SEVERITIES.map((s) => (
                                                            <label key={s.value} style={{ cursor: 'pointer' }}>
                                                                <input type="radio" name="severity" value={s.value} checked={form.severity === s.value} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={{ display: 'none' }} />
                                                                <div style={{ 
                                                                    padding: '12px 8px', borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: 800,
                                                                    border: `2px solid ${form.severity === s.value ? s.color : '#f1f5f9'}`,
                                                                    background: form.severity === s.value ? `${s.color}15` : '#f8fafc',
                                                                    color: form.severity === s.value ? s.color : '#94a3b8',
                                                                    transition: 'all 0.2s'
                                                                }}>
                                                                    {s.label}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT: Rest of the fields */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Work Assignment</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Smartphone size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                                        <select className="form-select form-input" value={form.contractor_id} onChange={(e) => setForm({ ...form, contractor_id: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 12 }}>
                                                            <option value="">Choose expert for this task...</option>
                                                            {contractors.map((c) => {
                                                                const isRecommended = aiResult?.recommended_specialization && 
                                                                    aiResult.recommended_specialization.toLowerCase().split(' / ').some(term => 
                                                                        c.specialization?.toLowerCase().includes(term.trim())
                                                                    );
                                                                return (
                                                                    <option key={c.user_id} value={c.user_id}>
                                                                        {c.name} ({c.specialization}) {isRecommended ? ' — ✨ RECOMMEND' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid-2" style={{ gap: 20 }}>
                                                    <div className="form-group">
                                                        <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Target Resolution</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <Calendar size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                                                            <input type="date" className="form-input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 12 }} min={new Date().toISOString().split('T')[0]} />
                                                        </div>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Geodata</label>
                                                        <div style={{ display: 'flex', height: 48, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', alignItems: 'center', px: 12, gap: 10 }}>
                                                            {(!form.latitude || !form.longitude) ? (
                                                                <button type="button" onClick={captureLocation} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <MapPin size={14} /> Fetch Coordinates
                                                                </button>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>
                                                                    <CheckCircle size={14} /> Ready
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Project Notes</label>
                                                    <textarea className="form-textarea" rows={4} placeholder="Describe the findings and immediate requirements..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ borderRadius: 12, padding: 16, fontSize: 13 }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 16, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                                            <button type="button" className="btn btn-secondary" onClick={reset} style={{ height: 52, borderRadius: 14, px: 32, fontWeight: 700 }}><X size={18} /> Discard</button>
                                            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 800, background: 'var(--orange)', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} disabled={submitting}>
                                                {submitting ? <span className="spinner" /> : form.contractor_id ? <><Send size={20} /> Preview & Send Report</> : <><CheckCircle size={20} /> Create Snag Entry</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* STEP 4 — Human Review / Premium Redesign */}
                        {step === 4 && previewReport && (
                            <div className="mt-24 animate-fadeIn">
                                <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
                                    
                                    {/* Left Card: Report Content */}
                                    <div className="card" style={{ 
                                        padding: 0, overflow: 'hidden', border: '1px solid var(--border)', 
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', borderRadius: 16 
                                    }}>
                                        <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(234,88,12,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={20} color="var(--orange)" />
                                            </div>
                                            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Snag Content Review</h3>
                                        </div>
                                        
                                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                                    <Zap size={14} /> Severity Level
                                                </label>
                                                <div className="input-wrapper">
                                                    <select 
                                                        className="form-select form-input" 
                                                        value={previewReport.severity} 
                                                        onChange={(e) => setPreviewReport({...previewReport, severity: e.target.value})}
                                                        style={{ height: 48, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 10 }}
                                                    >
                                                        <option value="low">🟢 Low — Cosmetic</option>
                                                        <option value="medium">🟠 Medium — Needs Attention</option>
                                                        <option value="high">🔴 High — Structural Risk</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Description</label>
                                                <textarea 
                                                    className="form-textarea" 
                                                    rows={4} 
                                                    value={previewReport.description} 
                                                    onChange={(e) => setPreviewReport({...previewReport, description: e.target.value})}
                                                    style={{ borderRadius: 10, padding: 12, fontSize: 13, border: '1px solid var(--border)', lineWeight: 1.6 }}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Recommended Action</label>
                                                <textarea 
                                                    className="form-textarea" 
                                                    rows={3} 
                                                    value={previewReport.recommended_action} 
                                                    onChange={(e) => setPreviewReport({...previewReport, recommended_action: e.target.value})}
                                                    style={{ borderRadius: 10, padding: 12, fontSize: 13, border: '1px solid var(--border)', lineWeight: 1.6 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Card: Email Preview */}
                                    <div className="card" style={{ 
                                        padding: 0, overflow: 'hidden', border: '1px solid var(--border)', 
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderRadius: 16,
                                        background: '#fff' 
                                    }}>
                                        <div style={{ padding: '20px 24px', background: 'var(--bg-body)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Mail size={20} color="#3b82f6" />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Contractor Notification</h3>
                                                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Email will be sent automatically</p>
                                            </div>
                                        </div>

                                        <div style={{ padding: 24 }}>
                                            <div style={{ marginBottom: 20 }}>
                                                <label className="form-label" style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Email Subject</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        value={customSubject} 
                                                        onChange={(e) => setCustomSubject(e.target.value)}
                                                        style={{ borderRadius: 8, padding: '12px 16px', fontWeight: 600, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.01)' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ position: 'relative', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', gap: 6 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                                </div>
                                                <textarea 
                                                    className="form-textarea" 
                                                    rows={14} 
                                                    value={customBody} 
                                                    onChange={(e) => setCustomBody(e.target.value)} 
                                                    style={{ 
                                                        fontSize: 12, lineHeight: 1.6, padding: 20, border: 'none', background: 'transparent',
                                                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                                        resize: 'none'
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modern Bottom action bar */}
                                <div className="mt-32" style={{ 
                                    background: 'linear-gradient(90deg, #1C1208 0%, #2A1A08 100%)', 
                                    borderRadius: 20, padding: '24px 32px', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'space-between',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircle size={24} color="var(--success)" />
                                        </div>
                                        <div>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 13 }}>Final step before submission</p>
                                            <p style={{ color: '#fff', margin: '2px 0 0', fontSize: 15 }}>
                                                Assign to <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{contractors.find(c => c.user_id == form.contractor_id)?.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-16">
                                        <button 
                                            className="btn" 
                                            onClick={() => setStep(3)}
                                            style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', padding: '12px 24px', borderRadius: 12, fontWeight: 700 }}
                                        >
                                            <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back
                                        </button>
                                        <button 
                                            className="btn" 
                                            onClick={handleFinalSend} 
                                            disabled={submitting}
                                            style={{ 
                                                background: 'var(--orange)', color: '#fff', border: 'none', 
                                                padding: '12px 32px', borderRadius: 12, fontWeight: 800,
                                                boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.4)',
                                                display: 'flex', alignItems: 'center', gap: 10
                                            }}
                                        >
                                            {submitting ? <span className="spinner" /> : <><Send size={18} /> Finalize & Send Report</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function StepIndicator({ current }) {
    const steps = ['Add Image', 'AI Analysis', 'Snag Details', 'Review & Send'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40, maxWidth: 840, margin: '0 auto 40px', padding: '0 20px' }}>
            {steps.map((s, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, position: 'relative', zIndex: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'var(--success)' : active ? 'var(--orange)' : '#fff',
                                border: `2px solid ${done ? 'var(--success)' : active ? 'var(--orange)' : '#e2e8f0'}`,
                                overflow: 'hidden',
                                boxShadow: active ? '0 0 0 4px rgba(234, 88, 12, 0.15)' : 'none',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                {done ? <CheckCircle size={18} color="#fff" /> : 
                                 <span style={{ fontSize: 13, fontWeight: 800, color: active ? '#fff' : '#94a3b8' }}>{n}</span>}
                            </div>
                            <span style={{ 
                                fontSize: 11, fontWeight: active || done ? 700 : 500, 
                                color: active ? 'var(--text-primary)' : done ? 'var(--success)' : '#94a3b8',
                                position: 'absolute', top: 40, whiteSpace: 'nowrap'
                            }}>
                                {s}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ 
                                height: 2, flex: 1, 
                                background: done ? 'var(--success)' : '#e2e8f0',
                                margin: '0 -10px',
                                transition: 'all 0.4s ease'
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
