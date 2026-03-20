import { useState, useEffect } from 'react';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { Mail, Search, Clock, User, Hash, ChevronRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MailLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await snagAPI.getMailLogs();
            setLogs(res.data.data);
        } catch {
            toast.error('Failed to load mail history');
        } finally {
            setLoading(false);
        }
    };

    const filtered = logs.filter(l => 
        l.recipient.toLowerCase().includes(search.toLowerCase()) ||
        l.subject.toLowerCase().includes(search.toLowerCase()) ||
        l.snag_code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-wrapper" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">Mail Tracking</h1>
                            <p className="page-subtitle">Track report communication with contractors</p>
                        </div>
                        <div className="badge badge-primary">{logs.length} Total Emails</div>
                    </div>
                </div>

                <div className="page-body">
                    {/* Search bar */}
                    <div className="input-wrapper mb-20">
                        <Search size={16} className="input-icon" />
                        <input 
                            className="form-input" 
                            placeholder="Search by recipient, subject, or Snag ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 40 }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 400px' : '1fr', gap: 24, transition: 'all 0.3s ease' }}>
                        {/* Logs List */}
                        <div className="table-wrapper">
                            {loading ? (
                                <div className="text-center" style={{ padding: 60 }}><div className="spinner spinner-lg" style={{ margin: 'auto' }} /></div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center" style={{ padding: 60, color: 'var(--text-muted)' }}>
                                    <Mail size={48} opacity={0.5} style={{ marginBottom: 16 }} />
                                    <p>No mail history found</p>
                                </div>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sent At</th>
                                            <th>Recipient</th>
                                            <th>Snag</th>
                                            <th>Subject</th>
                                            <th>Status</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((log) => (
                                            <tr 
                                                key={log.log_id} 
                                                onClick={() => setSelectedLog(log)}
                                                style={{ cursor: 'pointer', background: selectedLog?.log_id === log.log_id ? 'var(--bg-card-hover)' : '' }}
                                            >
                                                <td style={{ fontSize: 13 }}>
                                                    <div style={{ fontWeight: 600 }}>{new Date(log.sent_at).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: 11, opacity: 0.7 }}>{new Date(log.sent_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{log.recipient}</div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: 'var(--bg-accent)', color: 'var(--accent)' }}>
                                                        {log.snag_code || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.subject}
                                                </td>
                                                <td>
                                                    <span className="pill pill-success" style={{ fontSize: 10, padding: '2px 8px' }}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td><ChevronRight size={16} opacity={0.5} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Detail Panel */}
                        {selectedLog && (
                            <div className="card animated-fade-in" style={{ position: 'sticky', top: 24, height: 'fit-content' }}>
                                <div className="flex items-center justify-between mb-20">
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Mail size={18} color="var(--orange)" /> Email Details
                                    </h3>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedLog(null)}>
                                        <AlertCircle size={16} />
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: 16, fontSize: 13 }}>
                                    <div className="detail-row">
                                        <div style={{ opacity: 0.6, marginBottom: 4, label: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={14} /> Recipient
                                        </div>
                                        <div style={{ fontWeight: 600 }}>{selectedLog.recipient}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div style={{ opacity: 0.6, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Hash size={14} /> Subject
                                        </div>
                                        <div style={{ fontWeight: 600, color: 'var(--orange-dark)' }}>{selectedLog.subject}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div style={{ opacity: 0.6, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={14} /> Sent By
                                        </div>
                                        <div>{selectedLog.sender_name}</div>
                                    </div>

                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ opacity: 0.6, marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                                            Email Content
                                        </div>
                                        <div style={{ 
                                            background: 'var(--bg-body)', 
                                            padding: 16, 
                                            borderRadius: 8, 
                                            fontSize: 12, 
                                            lineHeight: 1.6,
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: 400,
                                            overflowY: 'auto',
                                            border: '1px solid var(--border-color)',
                                            fontFamily: 'monospace'
                                        }}>
                                            {selectedLog.content}
                                        </div>
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
