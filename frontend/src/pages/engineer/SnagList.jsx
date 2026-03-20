import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { snagAPI, authAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import SnagEditModal from '../../components/SnagEditModal';
import { Search, Filter, Send, Eye, Trash2, X, Camera, CheckCircle2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBackendRoot } from '../../api/backendUtils';

const BACKEND = getBackendRoot();

export default function SnagList() {
    const [snags, setSnags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contractors, setContractors] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [sendModal, setSendModal] = useState(null); // snag to send
    const [editModal, setEditModal] = useState(null); // snag to edit/verify
    const [sendContractor, setSendContractor] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchSnags();
        authAPI.getContractors().then((r) => setContractors(r.data.data)).catch(() => { });

        // Listen for sync events
        window.addEventListener('snag_synced', fetchSnags);
        return () => window.removeEventListener('snag_synced', fetchSnags);
    }, [filterStatus, filterSeverity]);

    const fetchSnags = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterSeverity) params.severity = filterSeverity;
            const res = await snagAPI.getAll(params);
            setSnags(res.data.data);
        } catch { toast.error('Failed to load snags'); }
        finally { setLoading(false); }
    };

    const handleSendReport = async () => {
        if (!sendContractor) return toast.error('Please select a contractor');
        setSending(true);
        try {
            await snagAPI.sendReport(sendModal.snag_id, { contractor_id: sendContractor });
            toast.success(`Report sent to contractor!`, {
                icon: <Send size={18} color="var(--success)" />
            });
            setSendModal(null); setSendContractor('');
            fetchSnags();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send report');
        } finally { setSending(false); }
    };

    const handleOpenEdit = (snag) => {
        setEditModal(snag);
    };

    const handleDelete = async (snag) => {
        if (!window.confirm(`Delete snag ${snag.snag_code}? This cannot be undone.`)) return;
        try {
            await snagAPI.delete(snag.snag_id);
            toast.success('Snag deleted');
            fetchSnags();
        } catch { toast.error('Failed to delete snag'); }
    };

    const filtered = snags.filter((s) =>
        !search || s.snag_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.location_desc?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">Snag List</h1>
                            <p className="page-subtitle">{snags.length} snags recorded</p>
                        </div>
                        <Link to="/engineer/generate" className="btn btn-primary">+ Detect Snag</Link>
                    </div>
                </div>

                <div className="page-body">
                    {/* Filters */}
                    <div className="flex gap-12 mb-20" style={{ flexWrap: 'wrap' }}>
                        <div className="input-wrapper" style={{ flex: 1, minWidth: 200 }}>
                            <Search size={16} className="input-icon" />
                            <input className="form-input" placeholder="Search by ID or location..."
                                value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                        </div>
                        <select className="form-select form-input" style={{ width: 160 }}
                            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <select className="form-select form-input" style={{ width: 160 }}
                            value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                            <option value="">All Severity</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="table-wrapper">
                        {loading ? (
                            <div className="text-center" style={{ padding: 60 }}><div className="spinner spinner-lg" style={{ margin: 'auto' }} /></div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center" style={{ padding: 60, color: 'var(--text-muted)' }}>
                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                                    <Search size={48} color="var(--text-muted)" opacity={0.5} />
                                </div>
                                <p>No snags found</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Photo</th>
                                        <th>Snag ID</th>
                                        <th>Location</th>
                                        <th>Crack Type</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                        <th>Sent</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((snag) => (
                                        <tr key={snag.snag_id}>
                                            <td>
                                                {snag.images?.[0]?.image_url
                                                    ? <img src={`${BACKEND}${snag.images[0].image_url}`} alt="" className="snag-thumb" />
                                                    : <div className="snag-thumb-placeholder"><Camera size={18} /></div>
                                                }
                                            </td>
                                            <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{snag.snag_code}</span></td>
                                            <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {snag.location_desc}
                                            </td>
                                            <td>
                                                {snag.crack_type
                                                    ? <span className={`badge badge-${snag.crack_type}`}>
                                                        {snag.crack_type.charAt(0).toUpperCase() + snag.crack_type.slice(1)}
                                                    </span>
                                                    : <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Verify AI</span>
                                                }
                                            </td>
                                            <td>
                                                {snag.severity
                                                    ? <span className={`badge badge-${snag.severity}`}>{snag.severity.toUpperCase()}</span>
                                                    : <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Verify AI</span>
                                                }
                                            </td>
                                            <td>
                                                <span className={`badge badge-${snag.status}`}>
                                                    {snag.status?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                             <td>
                                                {snag.sent_to_contractor
                                                    ? <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <CheckCircle2 size={13} /> Sent
                                                      </span>
                                                    : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not sent</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="flex gap-8">
                                                    <button className="btn btn-sm btn-ghost" title="Edit / Verify AI"
                                                        onClick={() => handleOpenEdit(snag)}>
                                                        <Eye size={13} style={{ color: 'var(--accent)' }} />
                                                    </button>
                                                    {!snag.sent_to_contractor && (
                                                        <button className="btn btn-sm btn-primary" title="Send Report"
                                                            onClick={() => { setSendModal(snag); setSendContractor(snag.assigned_to || ''); }}>
                                                            <Send size={13} />
                                                        </button>
                                                    )}
                                                    <button className="btn btn-sm btn-danger" title="Delete"
                                                        onClick={() => handleDelete(snag)}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Resume / Edit Modal */}
            <SnagEditModal 
                snag={editModal} 
                contractors={contractors}
                onClose={() => setEditModal(null)} 
                onSuccess={fetchSnags} 
            />

            {/* Send Report Modal */}
            {sendModal && (
                <div className="modal-overlay" onClick={() => setSendModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Send size={20} color="var(--orange)" /> Send Report to Contractor
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setSendModal(null)}><X size={18} /></button>
                        </div>
                        <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                            <div><strong>Snag:</strong> {sendModal.snag_code}</div>
                            <div><strong>Location:</strong> {sendModal.location_desc}</div>
                            <div><strong>Current Detection:</strong> {sendModal.crack_type} / {sendModal.severity?.toUpperCase()}</div>
                        </div>
                        <div className="form-group mb-20">
                            <label className="form-label">Select Contractor *</label>
                            <select className="form-select form-input" value={sendContractor}
                                onChange={(e) => setSendContractor(e.target.value)}>
                                <option value="">Choose contractor...</option>
                                {contractors.map((c) => <option key={c.user_id} value={c.user_id}>{c.name} — {c.email}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-12">
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSendModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSendReport} disabled={sending}>
                                {sending ? <span className="spinner" /> : <><Send size={15} /> Send Report + Email</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
