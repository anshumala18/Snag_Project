import { useState, useEffect } from 'react';
import { Search, Filter, Send, Eye, Trash2, X, Wrench, Save } from 'lucide-react';
import { snagAPI } from '../api';
import toast from 'react-hot-toast';

export default function SnagEditModal({ snag, onClose, onSuccess, contractors = [] }) {
    const [updating, setUpdating] = useState(false);
    const [form, setForm] = useState({
        crack_type: snag?.crack_type || 'structural',
        severity: snag?.severity || 'medium',
        description: snag?.description || '',
        recommended_action: snag?.recommended_action || '',
        contractor_id: snag?.assigned_to || ''
    });

    useEffect(() => {
        if (snag) {
            setForm({
                crack_type: snag.crack_type || 'structural',
                severity: snag.severity || 'medium',
                description: snag.description || '',
                recommended_action: snag.recommended_action || '',
                contractor_id: snag.assigned_to || ''
            });
        }
    }, [snag]);

    const handleSubmit = async () => {
        setUpdating(true);
        try {
            await snagAPI.update(snag.snag_id, form);
            toast.success('Snag details verified & updated');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update snag');
        } finally { setUpdating(false); }
    };

    if (!snag) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Wrench size={20} color="var(--orange)" /> Resume / Verify Snag Detection
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                
                <div className="form-group mb-12">
                    <label className="form-label">Verified Crack Type</label>
                    <div className="flex gap-8">
                        {['hairline', 'surface', 'structural'].map(t => (
                            <button key={t} className={`btn btn-sm ${form.crack_type === t ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setForm(f => ({ ...f, crack_type: t }))} style={{ flex: 1 }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group mb-12">
                    <label className="form-label">Verified Severity</label>
                    <div className="flex gap-8">
                        {['low', 'medium', 'high'].map(s => (
                            <button key={s} className={`btn btn-sm ${form.severity === s ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setForm(f => ({ ...f, severity: s }))} style={{ flex: 1 }}>
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group mb-12">
                    <label className="form-label">Description / Notes</label>
                    <textarea className="form-input" rows="2" placeholder="Add any site observations..."
                        value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="form-group mb-20">
                    <label className="form-label">Assign Contractor (Optional)</label>
                    <select className="form-select form-input" value={form.contractor_id}
                        onChange={(e) => setForm(f => ({ ...f, contractor_id: e.target.value }))}>
                        <option value="">Draft (Assign later)</option>
                        {contractors.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex gap-12 mt-12">
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={updating}>
                        {updating ? <span className="spinner" /> : <><Save size={15} /> Save & Verify Snag</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
