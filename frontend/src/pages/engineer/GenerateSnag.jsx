import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { snagAPI, projectAPI, authAPI } from '../../api';
import { useOnlineStatus } from '../../hooks/useSocket';
import { saveOfflineSnag } from '../../utils/offlineStorage';
import Sidebar from '../../components/Sidebar';
import { 
    Camera, Upload, X, AlertTriangle, Loader, MapPin, 
    Calendar, WifiOff, Cpu, Image, ClipboardList, CheckCircle, 
    AlertOctagon, Send, Smartphone, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
//import emailjs from '@emailjs/browser';

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
    const online = useOnlineStatus();
    const fileRef = useRef(null);
    const camRef = useRef(null);

    const [step, setStep] = useState(1); // 1: Image, 2: AI Result, 3: Details
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [projects, setProjects] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        project_id: '', location_desc: '', description: '',
        crack_type: '', severity: '', contractor_id: '', target_date: '',
    });

    useEffect(() => {
        projectAPI.getAll().then((r) => setProjects(r.data.data || [])).catch(() => setProjects([]));
        authAPI.getContractors().then((r) => setContractors(r.data.data || [])).catch(() => setContractors([]));
    }, []);

    // --- Image selection helpers ---
    // const handleFile = (file) => {
    //     if (!file) return;
    //     if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    //     setImageFile(file);
    //     setImagePreview(URL.createObjectURL(file));
    //     setStep(2);
    //    // simulateAI();
    // };
   
  const handleFile = async (file) => {
    console.log("HANDLE FILE TRIGGERED");

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (!online) {
        setAnalyzing(false);
        // Automatically save with minimal details when offline to speed up the process
        const offlineData = {
            ...form,
            location_desc: form.location_desc || `Offline Capture ${new Date().toLocaleTimeString()}`,
            imagePreview,
            imageFile,
            savedAt: new Date().toISOString()
        };
        await saveOfflineSnag(offlineData);
        toast.success("Saved! AI detection will resume once you are online.", { 
            icon: <Smartphone size={18} color="var(--accent)" />,
            duration: 6000 
        });
        navigate('/engineer/snags');
        return;
    }

    setAnalyzing(true);
    setStep(2); // Show the analysis step

    try {
        const fd = new FormData();
        fd.append('image', file);

        console.log("Sending request...");

        const res = await snagAPI.create(fd);
        console.log("RESPONSE:", res.data);

        const ai = res.data?.ai;

        if (ai) {
                setAiResult({
                damage_type: ai.damage_type,
                severity: ai.severity,
                // Fix confidence bug: only use 90% if ai.confidence is completely missing
                confidence: ai.confidence !== undefined && ai.confidence !== null 
                    ? Math.round(ai.confidence * 100) 
                    : 90,
                total_detections: ai.total_detections,
                output_image: ai.output_image
            });
        }
        
        // Improved mapping for better pre-filling
        const damageType = ai?.damage_type?.toLowerCase() || '';
        const aiSeverity = ai?.severity?.toLowerCase() || '';

        setForm((prev) => ({
                ...prev,
                crack_type: damageType.includes("crack") || damageType.includes("hairline") || damageType.includes("structural") 
                    ? (damageType.includes("hairline") ? "hairline" : (damageType.includes("surface") ? "surface" : "structural"))
                    : prev.crack_type,
                severity:
                    aiSeverity.includes("minor") || aiSeverity.includes("low") ? "low" :
                    aiSeverity.includes("moderate") || aiSeverity.includes("medium") ? "medium" :
                    aiSeverity.includes("severe") || aiSeverity.includes("high") ? "high" : 
                    prev.severity,
            }));
        
        // Artificial delay for better UX (so user sees the "YOLOv8" message)
        setTimeout(() => {
            setStep(3);
        }, 1500);

    } catch (err) {
        console.error(" ERROR:", err);
        toast.error("AI detection failed");
    } finally {
        setAnalyzing(false);
    }
};
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, []);

    const handleDragOver = (e) => e.preventDefault();

    // --- Simulate AI detection (real AI will be integrated later) ---
    

    // --- Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.location_desc.trim()) return toast.error('Please enter the snag location');

        if (!online) {
            // Offline: save to IndexedDB
            await saveOfflineSnag({ ...form, imagePreview, imageFile, savedAt: new Date().toISOString() });
            toast.success('Saved offline! Will sync when internet returns.', { 
                icon: <Smartphone size={18} color="var(--accent)" />,
                duration: 5000 
            });
            navigate('/engineer/snags');
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            if (imageFile) fd.append('image', imageFile);
            Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });

            const res = await snagAPI.create(fd);
            const snagId = res.data.data.snag_id;

            // If contractor selected → auto send report
            if (form.contractor_id && snagId) {
                await snagAPI.sendReport(snagId, { contractor_id: form.contractor_id });
                toast.success(`Snag created & report sent to contractor!`, {
                    icon: <CheckCircle size={18} color="var(--success)" />
                });
            } else {
                toast.success('Snag created successfully!', {
                    icon: <CheckCircle size={18} color="var(--success)" />
                });
            }
            navigate('/engineer/snags');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create snag');
        } finally { setSubmitting(false); }
    };

    const reset = () => {
        setStep(1); setImageFile(null); setImagePreview(null); setAiResult(null);
        setForm({ project_id: '', location_desc: '', description: '', crack_type: '', severity: '', contractor_id: '', target_date: '' });
    };

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Detect Snag</h1>
                    <p className="page-subtitle">Capture or upload a crack image for AI detection</p>
                </div>

                <div className="page-body">
                    {/* Offline banner */}
                    {!online && (
                        <div className="offline-banner mb-16">
                            <WifiOff size={16} /> No internet. Snag will be saved locally and synced when connection returns.
                        </div>
                    )}

                    {/* Step indicator */}
                    <StepIndicator current={step} />

                    <div style={{ maxWidth: 680, margin: '0 auto' }}>

                        {/* STEP 1 — Image selection */}
                        {step === 1 && (
                            <div className="card mt-24">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📷 Add Crack Photo</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                    <button className="btn btn-secondary btn-lg"
                                        onClick={() => camRef.current?.click()} style={{ gap: 10 }}>
                                        <Camera size={20} /> Capture Image
                                    </button>
                                    <button className="btn btn-secondary btn-lg"
                                        onClick={() => fileRef.current?.click()} style={{ gap: 10 }}>
                                        <Upload size={20} /> Upload Image
                                    </button>
                                </div>

                                {/* Drop zone */}
                                <div className="upload-zone" onDrop={handleDrop} onDragOver={handleDragOver}
                                    onClick={() => fileRef.current?.click()}>
                                    <div className="upload-zone-icon"><Image size={42} color="var(--orange)" /></div>
                                    <div className="upload-zone-title">Or drag & drop an image here</div>
                                    <div className="upload-zone-sub">JPEG, PNG, WebP up to 10MB</div>
                                </div>

                                {/* Hidden inputs */}
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={(e) => handleFile(e.target.files[0])} />
                                <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                    onChange={(e) => handleFile(e.target.files[0])} />
                            </div>
                        )}

                        {/* STEP 2 — AI Analysis */}
                        {step === 2 && (
                            <div className="card mt-24 text-center" style={{ padding: 48 }}>
                                <img src={
                                            aiResult?.output_image
                                            ? `http://localhost:5000/outputs/${aiResult.output_image}`
                                            : imagePreview
                                        }
                                        onError={(e) => {
                                            console.log("Image failed, fallback");
                                            e.target.src = imagePreview;
                                        }}
                                        alt="Snag"
                                        className="image-preview"
                                        style={{ marginBottom: 24 }}
                                        />
                               {analyzing ? (
                                    <>
                                        <div className="spinner spinner-lg" style={{ margin: '24px auto 16px' }} />
                                        <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                            <Cpu size={20} className="spinner-fade" /> Analyzing crack...
                                        </h3>
                                        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>YOLOv8 is detecting crack type and severity</p>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* STEP 3 — AI result + Details form */}
                        {step === 3 && (
                            <div className="mt-24">
                                {/* Image + AI result side by side */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <img
                                            src={
                                                aiResult?.output_image
                                                ? `http://localhost:5000/outputs/${aiResult.output_image}`
                                                : imagePreview
                                            }
                                            alt="Snag"
                                            style={{ width: '100%', height: 200, objectFit: 'cover' }}
                                            />
                                        <button onClick={reset} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 4 }}>
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {aiResult && (
                                        <div className="ai-result-card">
                                            <div className="ai-badge"><Zap size={12} /> AI Detection Result</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <div style={{ marginBottom: 6 }}>
                                                    <strong>Damage Type:</strong>
                                                    <span 
                                                            className={`badge badge-${aiResult?.damage_type?.toLowerCase()}`} 
                                                            style={{ marginLeft: 8 }}
                                                            >
                                                            {aiResult?.damage_type || "Unknown"}
                                                            </span>
                                                </div>
                                                <div style={{ marginBottom: 6 }}><strong>Severity:</strong>
                                                    <span className={`badge badge-${aiResult.severity}`} style={{ marginLeft: 8 }}>
                                                        {aiResult.severity?.toUpperCase()}
                                                    </span>
                                                </div>

                                              <div><strong>Confidence:</strong></div>

                                                <div className="confidence-bar" style={{ marginTop: 6 }}>
                                                    <div
                                                        className="confidence-fill"
                                                        style={{ width: `${aiResult?.confidence || 0}%` }}
                                                    />
                                                </div>

                                                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
                                                    {aiResult?.confidence || 0}%
                                                </div>

                                                {/* (DETECTION COUNT) */}
                                                <div style={{ marginTop: 8 }}>
                                                   <div style={{
                                                        marginTop: 10,
                                                        padding: 6,
                                                        background: 'var(--bg-card)',
                                                        borderRadius: 6,
                                                        textAlign: 'center'
                                                    }}>
                                                        {aiResult?.total_detections || 0} cracks detected
                                                    </div>  
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Snag Details Form */}
                                <div className="card">
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <ClipboardList size={18} color="var(--orange)" /> Snag Details <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>(review & edit AI output)</span>
                                    </h3>

                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Project */}
                                        <div className="form-group">
                                            <label className="form-label">Project</label>
                                            <select className="form-select form-input" value={form.project_id}
                                                onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                                                <option value="">Select project...</option>
                                                {projects.length > 0 ? (
                                                    projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)
                                                ) : (
                                                    <option value="" disabled>No projects available</option>
                                                )}
                                            </select>
                                        </div>

                                        {/* Location */}
                                        <div className="form-group">
                                            <label className="form-label">Location *</label>
                                            <div className="input-wrapper">
                                                <MapPin size={16} className="input-icon" />
                                                <input id="snag-location" type="text" className="form-input"
                                                    placeholder="Floor 3 – Wall near window"
                                                    value={form.location_desc}
                                                    onChange={(e) => setForm({ ...form, location_desc: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Crack Type (AI pre-filled, editable) */}
                                        <div className="form-group">
                                            <label className="form-label">Crack Type <span style={{ color: 'var(--accent)', fontSize: 11 }}>(AI pre-filled)</span></label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                                {CRACK_TYPES.map((ct) => (
                                                    <label key={ct.value} style={{ cursor: 'pointer' }}>
                                                        <input type="radio" name="crack_type" value={ct.value}
                                                            checked={form.crack_type === ct.value}
                                                            onChange={(e) => setForm({ ...form, crack_type: e.target.value })}
                                                            style={{ display: 'none' }} />
                                                        <div style={{
                                                            border: `2px solid ${form.crack_type === ct.value ? 'var(--accent)' : 'var(--border)'}`,
                                                            borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center',
                                                            background: form.crack_type === ct.value ? 'var(--accent-glow)' : 'transparent',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                            <div style={{ fontSize: 20, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{ct.icon}</div>
                                                            <div style={{ fontSize: 12, fontWeight: 700 }}>{ct.label}</div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ct.desc}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Severity */}
                                        <div className="form-group">
                                            <label className="form-label">Severity <span style={{ color: 'var(--accent)', fontSize: 11 }}>(AI pre-filled)</span></label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                                {SEVERITIES.map((s) => (
                                                    <label key={s.value} style={{ cursor: 'pointer' }}>
                                                        <input type="radio" name="severity" value={s.value}
                                                            checked={form.severity === s.value}
                                                            onChange={(e) => setForm({ ...form, severity: e.target.value })}
                                                            style={{ display: 'none' }} />
                                                        <div style={{
                                                            border: `2px solid ${form.severity === s.value ? s.color : 'var(--border)'}`,
                                                            borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center',
                                                            background: form.severity === s.value ? `${s.color}20` : 'transparent',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.label}</div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-textarea" rows={3}
                                                placeholder="Describe the crack in detail..."
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                        </div>

                                        <div className="grid-2" style={{ gap: 16 }}>
                                            {/* Send to contractor */}
                                            <div className="form-group">
                                                <label className="form-label">Send To Contractor</label>
                                                <select className="form-select form-input" value={form.contractor_id}
                                                    onChange={(e) => setForm({ ...form, contractor_id: e.target.value })}>
                                                    <option value="">Select contractor...</option>
                                                    {contractors.length > 0 ? (
                                                        contractors.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)
                                                    ) : (
                                                        <option value="" disabled>No contractors available</option>
                                                    )}
                                                </select>
                                            </div>
                                            {/* Target date */}
                                            <div className="form-group">
                                                <label className="form-label">Target Fix Date</label>
                                                <div className="input-wrapper">
                                                    <Calendar size={16} className="input-icon" />
                                                    <input type="date" className="form-input"
                                                        value={form.target_date}
                                                        onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                                                        style={{ paddingLeft: 42 }} min={new Date().toISOString().split('T')[0]} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-12 mt-8">
                                            <button type="button" className="btn btn-secondary" onClick={reset}>
                                                <X size={15} /> Reset
                                            </button>
                                            <button id="submit-snag-btn" type="submit"
                                                className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                                {submitting ? <span className="spinner" /> :
                                                    form.contractor_id ? <><Send size={15} /> Submit & Send to Contractor</> : <><CheckCircle size={15} /> Save Snag</>}
                                            </button>
                                        </div>
                                    </form>
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
    const steps = ['Add Image', 'AI Analysis', 'Snag Details'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4, maxWidth: 500 }}>
            {steps.map((s, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--bg-card)',
                                border: `2px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)'}`,
                                fontSize: 12, fontWeight: 700, color: (done || active) ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.3s',
                            }}>{done ? '✓' : n}</div>
                            <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {s}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? 'var(--success)' : 'var(--border)', margin: '0 12px', transition: 'all 0.3s' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
