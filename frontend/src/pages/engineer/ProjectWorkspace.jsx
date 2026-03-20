import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    MapPin, Users, AlertOctagon, CheckCircle, Clock,
    ChevronLeft, PlusCircle, LayoutGrid, FileText, Settings, Eye, Trash2
} from 'lucide-react';
import { authAPI, projectAPI, snagAPI } from '../../api';
import { getBackendRoot } from '../../api/backendUtils';
import Sidebar from '../../components/Sidebar';
import SnagEditModal from '../../components/SnagEditModal';
import toast from 'react-hot-toast';

export default function ProjectWorkspace() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [snags, setSnags] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [editModal, setEditModal] = useState(null);

    useEffect(() => {
        fetchProjectData();

        // Listen for sync events to refresh data
        window.addEventListener('snag_synced', fetchProjectData);
        return () => window.removeEventListener('snag_synced', fetchProjectData);
    }, [id]);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const [pRes, sRes, cRes] = await Promise.all([
                projectAPI.getById(id),
                snagAPI.getAll({ project_id: id }),
                authAPI.getContractors()
            ]);
            setProject(pRes.data.data);
            setSnags(sRes.data.data);
            setContractors(cRes.data.data);
        } catch (err) {
            toast.error('Failed to load project workspace');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (snag) => {
        if (!window.confirm(`Delete snag ${snag.snag_code}?`)) return;
        try {
            await snagAPI.delete(snag.snag_id);
            toast.success('Snag deleted');
            fetchProjectData();
        } catch { toast.error('Failed to delete snag'); }
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Sidebar />
                <main className="main-content">
                    <div className="text-center" style={{ padding: 100 }}>
                        <div className="spinner spinner-lg spinner-dark" style={{ margin: 'auto' }} />
                    </div>
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="page-wrapper">
                <Sidebar />
                <main className="main-content">
                    <div className="text-center" style={{ padding: 100 }}>
                        <h2>Project Not Found</h2>
                        <Link to="/engineer/projects" className="btn btn-primary mt-16">Back to Projects</Link>
                    </div>
                </main>
            </div>
        );
    }

    const BACKEND = getBackendRoot();

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center gap-12 mb-8">
                        <Link to="/engineer/projects" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                            <ChevronLeft size={16} /> Back
                        </Link>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Project Workspace</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">{project.project_name}</h1>
                            <div className="flex items-center gap-16 mt-8" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                <div className="flex items-center gap-6">
                                    <MapPin size={14} color="var(--orange)" />
                                    {project.location || 'Location not specified'}
                                </div>
                                <div className="flex items-center gap-6">
                                    <Users size={14} color="var(--orange)" />
                                    Contractor: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.contractor_name || 'Not assigned'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-12">
                            <Link to={`/engineer/generate?project=${project.project_id}`} className="btn btn-primary">
                                <PlusCircle size={16} /> Detect Snag
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="page-body">
                    <div className="hazard-bar mb-24" />

                    {/* Stats Overview */}
                    <div className="grid-3 mb-24">
                        <div className="stat-card orange">
                            <div className="stat-icon" style={{ background: 'rgba(234,88,12,0.10)' }}>
                                <FileText size={22} color="var(--orange)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--orange)' }}>{project.total_snags || 0}</div>
                                <div className="stat-label">Total Snags</div>
                            </div>
                        </div>
                        <div className="stat-card amber">
                            <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.10)' }}>
                                <Clock size={22} color="var(--amber)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--amber)' }}>{project.pending_snags || 0}</div>
                                <div className="stat-label">Pending / Open</div>
                            </div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon" style={{ background: 'rgba(21,128,61,0.10)' }}>
                                <CheckCircle size={22} color="var(--success)" />
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: 'var(--success)' }}>{project.resolved_snags || 0}</div>
                                <div className="stat-label">Resolved</div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Content */}
                    <div className="card" style={{ padding: 0 }}>
                    <div className="tabs-scroll" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
                            {['overview', 'snags', 'reports'].map(t => (
                                <div key={t} 
                                    onClick={() => setActiveTab(t)}
                                    style={{
                                        padding: '16px 0', 
                                        borderBottom: activeTab === t ? '3px solid var(--orange)' : '3px solid transparent', 
                                        color: activeTab === t ? 'var(--orange)' : 'var(--text-muted)',
                                        fontWeight: activeTab === t ? 700 : 600, 
                                        fontSize: 14, 
                                        cursor: 'pointer', 
                                        textTransform: 'capitalize'
                                    }}>
                                    {t === 'snags' ? 'Snag List' : t}
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: 24 }}>
                            {activeTab === 'overview' && (
                                snags.length === 0 ? (
                                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                        <div style={{ background: 'rgba(234,88,12,0.05)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <AlertOctagon size={28} color="var(--orange)" />
                                        </div>
                                        <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>No snags detected yet.</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Click "Detect Snag" to capture or upload an image and let AI analyze the defect.</p>
                                    </div>
                                ) : (
                                    <div className="table-wrapper">
                                        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Recent Project Snags</div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>ID</th><th>Location</th><th>Type</th><th>Severity</th><th>Status</th><th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {snags.slice(0, 5).map(s => (
                                                    <tr key={s.snag_id}>
                                                        <td><span style={{fontWeight:700,color:'var(--orange)'}}>{s.snag_code}</span></td>
                                                        <td>{s.location_desc}</td>
                                                        <td><span className={`badge badge-${s.crack_type}`}>{s.crack_type}</span></td>
                                                        <td><span className={`badge badge-${s.severity}`}>{s.severity?.toUpperCase()}</span></td>
                                                        <td><span className={`badge badge-${s.status}`}>{s.status?.replace('_',' ').toUpperCase()}</span></td>
                                                     <td>
                                                         <div className="flex gap-8">
                                                             <button onClick={() => setEditModal(s)} className="btn btn-sm btn-ghost" title="Verify AI"><Eye size={13} /></button>
                                                             <button onClick={() => handleDelete(s)} className="btn btn-sm btn-ghost" style={{color:'var(--danger)'}}><Trash2 size={13} /></button>
                                                         </div>
                                                     </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {snags.length > 5 && (
                                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                                                <button className="btn btn-ghost" onClick={() => setActiveTab('snags')}>View All {snags.length} Snags</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {activeTab === 'snags' && (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                             <tr>
                                                 <th>Photo</th><th>Snag ID</th><th>Location</th><th>Type</th><th>Severity</th><th>Status</th><th>Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                            {snags.map(s => (
                                                <tr key={s.snag_id}>
                                                    <td>
                                                        {s.images?.[0]
                                                            ? <img src={`${BACKEND}${s.images[0].image_url}`} style={{width:40,height:40,borderRadius:4,objectFit:'cover'}} />
                                                            : <div style={{width:40,height:40,borderRadius:4,background:'var(--bg-muted)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)'}}><Camera size={18} /></div>
                                                        }
                                                    </td>
                                                    <td><span style={{fontWeight:700,color:'var(--orange)'}}>{s.snag_code}</span></td>
                                                    <td>{s.location_desc}</td>
                                                    <td><span className={`badge badge-${s.crack_type}`}>{s.crack_type}</span></td>
                                                    <td><span className={`badge badge-${s.severity}`}>{s.severity?.toUpperCase()}</span></td>
                                                    <td><span className={`badge badge-${s.status}`}>{s.status?.replace('_',' ').toUpperCase()}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'reports' && (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ background: 'rgba(3,105,161,0.05)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <FileText size={28} color="#0369A1" />
                                    </div>
                                    <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>Project Reports</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Download detailed PDF or Excel reports for this project.</p>
                                    <div className="flex justify-center gap-12 mt-20">
                                        <Link to="/engineer/reports" className="btn btn-primary">Go to Reports Section</Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <SnagEditModal 
                snag={editModal} 
                contractors={contractors} 
                onClose={() => setEditModal(null)} 
                onSuccess={fetchProjectData} 
            />
        </div>
    );
}
