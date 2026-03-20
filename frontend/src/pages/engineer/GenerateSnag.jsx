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

            const damageType = ai?.damage_type?.toLowerCase() || '';
            const aiSeverity = ai?.severity?.toLowerCase() || '';

            setForm((prev) => ({
                ...prev,
                crack_type: damageType.includes("hairline") ? "hairline" : 
                           (damageType.includes("structural") || damageType.includes("deep") ? "structural" : 
                           (damageType.includes("surface") || damageType.includes("crack") ? "surface" : prev.crack_type)),
                severity: 
                    aiSeverity.includes("minor") || aiSeverity.includes("low") ? "low" : 
                    aiSeverity.includes("moderate") || aiSeverity.includes("medium") ? "medium" :
                    aiSeverity.includes("severe") || aiSeverity.includes("high") ? "high" : 
                    prev.severity,
            }));
            
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

                        {/* STEP 1 — Image selection */}
                        {step === 1 && (
                            <div className="card mt-24">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📷 Add Crack Photo</h3>
                                <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
                                    <button className="btn btn-secondary btn-lg" onClick={() => camRef.current?.click()}>
                                        <Camera size={20} /> Capture Image
                                    </button>
                                    <button className="btn btn-secondary btn-lg" onClick={() => fileRef.current?.click()}>
                                        <Upload size={20} /> Upload Image
                                    </button>
                                </div>
                                <div className="upload-zone" onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileRef.current?.click()}>
                                    <div className="upload-zone-icon"><Image size={42} color="var(--orange)" /></div>
                                    <div className="upload-zone-title">Or drag & drop an image here</div>
                                    <div className="upload-zone-sub">JPEG, PNG, WebP up to 10MB</div>
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                                <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                            </div>
                        )}

                        {/* STEP 2 — AI Analysis */}
                        {step === 2 && (
                            <div className="card mt-24 text-center" style={{ padding: 48 }}>
                                <img src={aiResult?.output_image ? getAIImageUrl(aiResult.output_image) : imagePreview} alt="Snag" className="image-preview" style={{ marginBottom: 24 }} />
                                {analyzing && (
                                     <>
                                         <div className="spinner spinner-lg" style={{ margin: '24px auto 16px' }} />
                                         <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                             <Cpu size={20} className="spinner-fade" /> Analyzing crack...
                                         </h3>
                                     </>
                                 )}
                            </div>
                        )}

                        {/* STEP 3 — Details Form */}
                        {step === 3 && (
                            <div className="mt-24">
                                <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <img src={aiResult?.output_image ? getAIImageUrl(aiResult.output_image) : imagePreview} alt="Snag" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                                        <button onClick={reset} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 4 }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {aiResult && (
                                        <div className="ai-result-card">
                                            <div className="ai-badge"><Zap size={12} /> AI Detection Result</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <div style={{ marginBottom: 6 }}><strong>Damage Type:</strong> <span className={`badge badge-${aiResult?.damage_type?.toLowerCase()}`} style={{ marginLeft: 8 }}>{aiResult?.damage_type || "Unknown"}</span></div>
                                                <div style={{ marginBottom: 6 }}><strong>Severity:</strong> <span className={`badge badge-${aiResult.severity}`} style={{ marginLeft: 8 }}>{aiResult.severity?.toUpperCase()}</span></div>
                                                <div><strong>Confidence:</strong></div>
                                                <div className="confidence-bar" style={{ marginTop: 6 }}><div className="confidence-fill" style={{ width: `${Math.round((aiResult?.confidence || 0) * 100)}%` }} /></div>
                                                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{Math.round((aiResult?.confidence || 0) * 100)}%</div>
                                                <div style={{ marginTop: 8, padding: 6, background: 'var(--bg-card)', borderRadius: 6, textAlign: 'center' }}>{aiResult?.total_detections || 0} cracks detected</div>
                                                
                                                {/* --- Human in the Loop Feedback Section --- */}
                                                {/* --- Human in the Loop Feedback Section --- */}
                                                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px dashed var(--border)' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Zap size={15} color="var(--orange)" /> Was the AI prediction accurate?
                                                    </div>
                                                    <div className="flex gap-10">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                setFeedbackVerified(true);
                                                                toast.success("Prediction verified! AI Reward +1");
                                                            }}
                                                            className="btn btn-sm" 
                                                            style={{ 
                                                                flex: 1, 
                                                                background: feedbackVerified === true ? '#10b981' : '#ecfdf5', 
                                                                border: feedbackVerified === true ? '1px solid #059669' : '1px solid #a7f3d0', 
                                                                color: feedbackVerified === true ? '#fff' : '#047857',
                                                                fontWeight: 700,
                                                                boxShadow: feedbackVerified === true ? '0 4px 6px -1px rgba(16, 185, 129, 0.2)' : 'none'
                                                            }}
                                                        >
                                                            Yes, Correct
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                setFeedbackVerified(false);
                                                                toast.error("Correction Mode Active. Please update details.");
                                                            }}
                                                            className="btn btn-sm" 
                                                            style={{ 
                                                                flex: 1, 
                                                                background: feedbackVerified === false ? '#ef4444' : '#fef2f2', 
                                                                border: feedbackVerified === false ? '1px solid #dc2626' : '1px solid #fecaca', 
                                                                color: feedbackVerified === false ? '#fff' : '#b91c1c',
                                                                fontWeight: 700,
                                                                boxShadow: feedbackVerified === false ? '0 4px 6px -1px rgba(239, 68, 68, 0.2)' : 'none'
                                                            }}
                                                        >
                                                            No, Wrong
                                                        </button>
                                                    </div>
                                                    
                                                    {feedbackVerified === false && (
                                                        <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff1f2', borderRadius: 8, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                            <AlertTriangle size={16} color="#e11d48" />
                                                            <span style={{ fontSize: 11, color: '#9f1239', fontWeight: 700 }}>
                                                                AI was incorrect. Please update the Damage Type and Severity manually.
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="card">
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <ClipboardList size={18} color="var(--orange)" /> Snag Details
                                    </h3>
                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Project</label>
                                            <select className="form-select form-input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                                                <option value="">Select project...</option>
                                                {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Location *</label>
                                            <div className="input-wrapper"><MapPin size={16} className="input-icon" /><input type="text" className="form-input" placeholder="Floor 3 – Wall near window" value={form.location_desc} onChange={(e) => setForm({ ...form, location_desc: e.target.value })} /></div>
                                        </div>
                                        <div className="grid-2" style={{ gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Latitude</label>
                                                <input type="text" className="form-input" value={form.latitude || ''} readOnly placeholder="Detecting automatic..." style={{ background: '#f5f5f5', color: '#666' }} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Longitude</label>
                                                <input type="text" className="form-input" value={form.longitude || ''} readOnly placeholder="Detecting automatic..." style={{ background: '#f5f5f5', color: '#666' }} />
                                            </div>
                                        </div>
                                        { (!form.latitude || !form.longitude) ? (
                                             <div style={{ padding: '12px 14px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, border: '1px dashed #3b82f644' }}>
                                                 <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1e40af' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                         <MapPin size={16} /> <span>Waiting for GPS Signal...</span>
                                                     </div>
                                                     <button type="button" onClick={captureLocation} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>Retry GPS</button>
                                                 </div>
                                                 <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>
                                                     Check for the <strong>lock icon (🔒)</strong> in your browser's address bar to enable or reset location permissions.
                                                 </div>
                                             </div>
                                        ) : (
                                             <div style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 8 }}>
                                                 <CheckCircle size={14} /> <strong>Precise GPS coordinates captured.</strong>
                                             </div>
                                        )}
                                        <div className="form-group">
                                            <label className="form-label">Crack Type (AI pre-filled)</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                                {CRACK_TYPES.map((ct) => (
                                                    <label key={ct.value} style={{ cursor: 'pointer' }}>
                                                        <input type="radio" name="crack_type" value={ct.value} checked={(form.crack_type || "" )=== ct.value} onChange={(e) => setForm({ ...form, crack_type: e.target.value })} style={{ display: 'none' }} />
                                                        <div style={{ border: form.crack_type === ct.value ? '2px solid var(--orange)' : '2px solid #ccc', borderRadius: '12px', padding: '12px 10px', textAlign: 'center', background: form.crack_type === ct.value ? 'rgba(255, 107, 0, 0.05)' : '#fff', transition: 'all 0.2s' }}>
                                                            <div style={{ fontSize: 20, marginBottom: 4 }}>{ct.icon}</div>
                                                            <div style={{ fontSize: 12, fontWeight: 700 }}>{ct.label}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Severity (AI pre-filled)</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                                {SEVERITIES.map((s) => (
                                                    <label key={s.value} style={{ cursor: 'pointer' }}>
                                                        <input type="radio" name="severity" value={s.value} checked={form.severity === s.value} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={{ display: 'none' }} />
                                                        <div style={{ border: `2px solid ${form.severity === s.value ? s.color : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center', background: form.severity === s.value ? `${s.color}20` : 'transparent', transition: 'all 0.2s' }}>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.label}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-textarea" rows={3} placeholder="Describe the crack..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                        </div>
                                        <div className="grid-2" style={{ gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Send To Contractor</label>
                                                <select className="form-select form-input" value={form.contractor_id} onChange={(e) => setForm({ ...form, contractor_id: e.target.value })}>
                                                    <option value="">Select contractor...</option>
                                                    {contractors.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Target Fix Date</label>
                                                <div className="input-wrapper"><Calendar size={16} className="input-icon" /><input type="date" className="form-input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} style={{ paddingLeft: 42 }} min={new Date().toISOString().split('T')[0]} /></div>
                                            </div>
                                        </div>
                                        <div className="flex gap-12 mt-8">
                                            <button type="button" className="btn btn-secondary" onClick={reset}><X size={15} /> Reset</button>
                                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                                {submitting ? <span className="spinner" /> : form.contractor_id ? <><Send size={15} /> Submit & Proceed to Review</> : <><CheckCircle size={15} /> Save Snag</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* STEP 4 — Human Review */}
                        {step === 4 && previewReport && (
                            <div className="mt-24">
                                <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
                                    <div className="card">
                                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FileText size={18} color="var(--orange)" /> Report Content Review
                                        </h3>
                                        <div className="flex flex-column gap-12">
                                            <div className="form-group">
                                                <label className="form-label">Severity</label>
                                                <select className="form-select form-input" value={previewReport.severity} onChange={(e) => setPreviewReport({...previewReport, severity: e.target.value})}>
                                                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Description</label>
                                                <textarea className="form-textarea" rows={4} value={previewReport.description} onChange={(e) => setPreviewReport({...previewReport, description: e.target.value})} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Recommended Action</label>
                                                <textarea className="form-textarea" rows={3} value={previewReport.recommended_action} onChange={(e) => setPreviewReport({...previewReport, recommended_action: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card">
                                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Mail size={18} color="var(--accent)" /> Email to Contractor
                                        </h3>
                                        <div className="flex flex-column gap-12">
                                            <div className="form-group">
                                                <label className="form-label">Email Subject</label>
                                                <input type="text" className="form-input" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Email Body</label>
                                                <textarea className="form-textarea" rows={12} value={customBody} onChange={(e) => setCustomBody(e.target.value)} style={{ fontSize: 12, lineHeight: 1.5, fontFamily: 'monospace' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card mt-24" style={{ background: 'var(--orange-pale)', border: '1px dashed var(--orange)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        Confirming will send this report to <strong>{contractors.find(c => c.user_id == form.contractor_id)?.name}</strong> via Email and Dashboard.
                                    </div>
                                    <div className="flex gap-12">
                                        <button className="btn btn-secondary" onClick={() => setStep(3)}><ArrowLeft size={16} /> Back</button>
                                        <button className="btn btn-primary" onClick={handleFinalSend} disabled={submitting}>
                                            {submitting ? <span className="spinner" /> : <><Send size={16} /> Finalize & Send Report</>}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, maxWidth: 800, margin: '0 auto 32px' }}>
            {steps.map((s, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'var(--success)' : active ? 'var(--orange)' : 'var(--bg-card)',
                                border: `2px solid ${done ? 'var(--success)' : active ? 'var(--orange)' : 'var(--border)'}`,
                                fontSize: 13, fontWeight: 800, color: (done || active) ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}>{done ? '✓' : n}</div>
                            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? 'var(--success)' : 'var(--border)', margin: '0 16px', transition: 'all 0.3s' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
