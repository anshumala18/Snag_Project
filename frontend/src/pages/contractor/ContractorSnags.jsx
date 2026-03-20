import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { Search, CheckCircle2, Mail, Inbox, Check, Camera, MapPin, Building } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBackendRoot } from '../../api/backendUtils';

const BACKEND = getBackendRoot();

export default function ContractorSnags({ resolvedOnly = false }) {
    const [snags, setSnags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        snagAPI.getAll(resolvedOnly ? { status: 'resolved' } : {})
            .then((r) => setSnags(r.data.data))
            .catch(() => toast.error('Failed to load snags'))
            .finally(() => setLoading(false));
    }, [resolvedOnly]);

    const filtered = snags.filter((s) =>
        !search ||
        s.snag_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.location_desc?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {resolvedOnly ? <><CheckCircle2 size={24} color="var(--success)" /> Completed Repairs</> : <><Mail size={24} color="var(--orange)" /> Assigned Snags</>}
                    </h1>
                    <p className="page-subtitle">
                        {resolvedOnly ? 'Snags you have successfully resolved' : 'Snags assigned to you for repair'}
                    </p>
                </div>

                <div className="page-body">
                    {/* Search */}
                    <div className="input-wrapper mb-20" style={{ maxWidth: 400 }}>
                        <Search size={16} className="input-icon" />
                        <input className="form-input" placeholder="Search snag ID or location..."
                            value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                    </div>

                    {loading ? (
                        <div className="text-center" style={{ padding: 60 }}><div className="spinner spinner-lg" style={{ margin: 'auto' }} /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center" style={{ padding: 80, color: 'var(--text-muted)' }}>
                            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                                {resolvedOnly ? <Check size={48} color="var(--success)" opacity={0.5} /> : <Inbox size={48} color="var(--text-muted)" opacity={0.5} />}
                            </div>
                            <h3 style={{ fontSize: 18, marginBottom: 8 }}>{resolvedOnly ? 'No completed repairs yet' : 'No snags assigned'}</h3>
                            <p>{resolvedOnly ? 'Snags you resolve will appear here' : 'You will be notified when new snags are assigned to you'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {filtered.map((snag) => <SnagCard key={snag.snag_id} snag={snag} />)}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function SnagCard({ snag }) {
    const img = snag.images?.[0]?.image_url;
    return (
        <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {/* Thumbnail */}
            <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                {img
                    ? <img src={`${BACKEND}${img}`} alt="crack" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Camera size={24} />
                      </div>
                }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-12 mb-8">
                    <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>{snag.snag_code}</span>
                    {snag.severity && <span className={`badge badge-${snag.severity}`}>{snag.severity.toUpperCase()}</span>}
                    {snag.crack_type && <span className={`badge badge-${snag.crack_type}`}>{snag.crack_type}</span>}
                    <span className={`badge badge-${snag.status}`}>{snag.status?.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color="var(--text-muted)" /> {snag.location_desc}
                </div>
                {snag.project_name && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building size={13} /> {snag.project_name}
                    </div>
                )}
            </div>

            {/* Action */}
            <Link to={`/contractor/snags/${snag.snag_id}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                View & Act →
            </Link>
        </div>
    );
}
