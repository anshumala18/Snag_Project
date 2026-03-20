import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { Wrench, CheckCircle, MapPin, AlertTriangle, ArrowLeft, Clock, CheckCircle2, Building, FileText, ClipboardList, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBackendRoot } from '../../api/backendUtils';

const BACKEND = getBackendRoot();

const CRACK_LABELS = { hairline: 'Hairline Crack', surface: 'Surface Crack', structural: 'Structural Crack' };

export default function SnagDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [snag, setSnag] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        snagAPI.getById(id)
            .then((r) => setSnag(r.data.data))
            .catch(() => { toast.error('Snag not found'); navigate('/contractor/snags'); })
            .finally(() => setLoading(false));
    }, [id]);

    const updateStatus = async (newStatus) => {
        setUpdating(newStatus);
        try {
            const res = await snagAPI.updateStatus(id, { status: newStatus, notes });
            setSnag({ ...snag, status: newStatus });
            toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`, {
                icon: <CheckCircle2 size={18} color="var(--success)" />
            });
            setNotes('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally { setUpdating(''); }
    };

    if (loading) return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner spinner-lg" />
            </main>
        </div>
    );

    if (!snag) return null;

    const img = snag.images?.[0]?.image_url;

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate(-1)}>
                        <ArrowLeft size={15} /> Back
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">{snag.snag_code}</h1>
                            <p className="page-subtitle">Snag Detail — Repair Management</p>
                        </div>
                        <span className={`badge badge-${snag.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>
                            {snag.status?.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="page-body">
                    <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
                        {/* Left: Image + Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Image */}
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {img
                                    ? <img src={`${BACKEND}${img}`} alt="Crack" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                                    : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                                        <Camera size={48} opacity={0.5} />
                                      </div>
                                }
                            </div>

                            {/* Snag details card */}
                            <div className="card">
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Snag Information
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <InfoRow icon={<MapPin size={14} />} label="Location" value={snag.location_desc} />
                                    <InfoRow icon={<AlertTriangle size={14} />} label="Crack Type"
                                        value={<span className={`badge badge-${snag.crack_type}`}>{CRACK_LABELS[snag.crack_type] || snag.crack_type || '—'}</span>} />
                                    <InfoRow icon={<AlertTriangle size={14} />} label="Severity"
                                        value={snag.severity ? <span className={`badge badge-${snag.severity}`}>{snag.severity.toUpperCase()}</span> : '—'} />
                                    <InfoRow icon={<Clock size={14} />} label="Reported"
                                        value={new Date(snag.created_at).toLocaleString('en-IN')} />
                                    {snag.project_name && (
                                        <InfoRow icon={<Building size={14} />} label="Project" value={snag.project_name} />
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                                {snag.description && (
                                    <div className="card" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FileText size={14} /> Description
                                        </h4>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{snag.description}</p>
                                    </div>
                                )}

                            {/* Recommended action */}
                                {snag.recommended_action && (
                                    <div className="card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Wrench size={14} /> Recommended Action
                                        </h4>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{snag.recommended_action}</p>
                                    </div>
                                )}
                        </div>

                        {/* Right: Action panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Status update card */}
                            <div className="card">
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Wrench size={17} color="var(--orange)" /> Update Repair Status
                                </h3>

                                {snag.status === 'resolved' ? (
                                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                                            <CheckCircle2 size={48} color="var(--success)" />
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>Repair Completed!</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>This snag has been marked as resolved.</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ marginBottom: 16 }}>
                                            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Notes (optional)</label>
                                            <textarea className="form-textarea" rows={3} placeholder="Add any notes about the repair..."
                                                value={notes} onChange={(e) => setNotes(e.target.value)} />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {snag.status === 'pending' && (
                                                <button id="start-repair-btn" className="btn btn-warning btn-full btn-lg"
                                                    onClick={() => updateStatus('in_progress')} disabled={!!updating}>
                                                    {updating === 'in_progress' ? <span className="spinner" /> : <><Wrench size={18} /> Start Repair</>}
                                                </button>
                                            )}
                                            {(snag.status === 'pending' || snag.status === 'in_progress') && (
                                                <button id="mark-resolved-btn" className="btn btn-success btn-full btn-lg"
                                                    onClick={() => updateStatus('resolved')} disabled={!!updating}>
                                                    {updating === 'resolved' ? <span className="spinner" /> : <><CheckCircle size={18} /> Mark as Resolved</>}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Status Timeline */}
                            <div className="card">
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ClipboardList size={16} color="var(--orange)" /> Status Timeline
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                    <TimelineItem label="Snag Created" done color="#38bdf8"
                                        date={new Date(snag.created_at).toLocaleDateString('en-IN')} />
                                    <TimelineItem label="Sent to Contractor" done={snag.sent_to_contractor} color="#818cf8"
                                        date={snag.sent_at ? new Date(snag.sent_at).toLocaleDateString('en-IN') : null} />
                                    <TimelineItem label="Repair Started" done={snag.status === 'in_progress' || snag.status === 'resolved'} color="#f59e0b" />
                                    <TimelineItem label="Resolved" done={snag.status === 'resolved'} color="#10b981" last />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value || '—'}</div>
            </div>
        </div>
    );
}

function TimelineItem({ label, done, color, date, last }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: last ? 0 : 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: done ? color : 'var(--bg-card)', border: `2px solid ${done ? color : 'var(--border)'}`, flexShrink: 0 }} />
                {!last && <div style={{ width: 2, flex: 1, minHeight: 20, background: done ? color : 'var(--border)', marginTop: 3 }} />}
            </div>
            <div style={{ paddingTop: 1 }}>
                <div style={{ fontSize: 13, fontWeight: done ? 600 : 400, color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</div>
                {date && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{date}</div>}
            </div>
        </div>
    );
}
