import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getPendingSnags, removeOfflineSnag } from '../../utils/offlineStorage';
import { useOnlineStatus } from '../../hooks/useSocket';
import { Wifi, WifiOff, RefreshCw, Trash2, MapPin, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { snagAPI } from '../../api';

export default function OfflineSync() {
    const navigate = useNavigate();
    const online = useOnlineStatus();
    const [pending, setPending] = useState([]);
    const [syncingId, setSyncingId] = useState(null);

    const loadPending = async () => {
        const items = await getPendingSnags();
        setPending(items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
    };

    useEffect(() => { loadPending(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this offline snag? The image will be lost.")) return;
        await removeOfflineSnag(id);
        toast.success("Removed from offline storage");
        loadPending();
    };

    const handleSync = async (snag) => {
        if (!online) return toast.error("Please connect to the internet first");
        
        setSyncingId(snag.id);
        try {
            // We navigate to GenerateSnag with the offline data to let the AI process it
            // and the user review it before saving.
            // But we need to pass the actual File object.
            
            // To pass data across pages, we can use state or a temporary storage.
            // For now, let's navigate to /engineer/generate and pass the offline ID in state.
            navigate('/engineer/generate', { state: { offlineSnag: snag } });
            
        } catch (err) {
            toast.error("Failed to start sync process");
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Offline Sync Queue</h1>
                            <p className="page-subtitle">Process snags captured while the internet was disconnected</p>
                        </div>
                        <div className={`badge ${online ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {online ? 'Online - Ready to Sync' : 'Offline - Reconnect to Process'}
                        </div>
                    </div>
                </div>

                <div className="page-body">
                    {pending.length === 0 ? (
                        <div className="card text-center" style={{ padding: 80 }}>
                            <div style={{ width: 64, height: 64, background: 'var(--bg-card)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                                <RefreshCw size={32} />
                            </div>
                            <h3>No pending snags</h3>
                            <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '10px auto' }}>All your offline captures have been synchronized with the server.</p>
                            <button className="btn btn-primary mt-20" onClick={() => navigate('/engineer/generate')}>+ Detect New Snag</button>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {pending.map(snag => (
                                <div key={snag.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ position: 'relative', height: 180 }}>
                                        <img src={snag.imagePreview} alt="Snag" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(snag.id)} title="Discard">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ padding: 20, flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{snag.location_desc || 'Unspecified Location'}</h3>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {new Date(snag.savedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                                <MapPin size={14} color="var(--orange)" /> {snag.location_desc}
                                            </div>
                                            {(snag.latitude && snag.longitude) && (
                                                <div style={{ fontSize: 12, background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
                                                    📍 {snag.latitude.toFixed(4)}, {snag.longitude.toFixed(4)}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', height: 44 }}
                                            onClick={() => handleSync(snag)}
                                            disabled={!online || syncingId === snag.id}
                                        >
                                            {syncingId === snag.id ? <span className="spinner" /> : <><RefreshCw size={15} /> Process & Sync to DB</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
