import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI, authAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { Plus, FolderOpen, MapPin, Users, AlertOctagon, X, Building } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
    active: { color: '#15803D', bg: 'rgba(21,128,61,0.10)', label: 'Active' },
    completed: { color: '#0369A1', bg: 'rgba(3,105,161,0.10)', label: 'Completed' },
    on_hold: { color: '#B45309', bg: 'rgba(180,83,9,0.10)', label: 'On Hold' },
};

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ project_name: '', location: '', description: '', contractor_id: '' });

    useEffect(() => {
        fetchProjects();
        authAPI.getContractors().then(r => setContractors(r.data.data)).catch(() => { });
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await projectAPI.getAll();
            setProjects(res.data.data);
        } catch { toast.error('Failed to load projects'); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.project_name.trim()) return toast.error('Project name is required');
        setSubmitting(true);
        try {
            await projectAPI.create(form);
            toast.success('Project created successfully!');
            setShowModal(false);
            setForm({ project_name: '', location: '', description: '', contractor_id: '' });
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">Projects</h1>
                            <p className="page-subtitle">Manage your construction inspection projects</p>
                        </div>
                        <button id="create-project-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> New Project
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    <div className="hazard-bar mb-24" />
                    {loading ? (
                        <div className="text-center" style={{ padding: 80 }}>
                            <div className="spinner spinner-lg spinner-dark" style={{ margin: 'auto' }} />
                        </div>
                    ) : projects.length === 0 ? (
                        <EmptyState onAdd={() => setShowModal(true)} />
                    ) : (
                        <div className="grid-3">
                            {projects.map(p => <ProjectCard key={p.project_id} project={p} />)}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create New Project</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={17} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Project Name *</label>
                                <input id="proj-name" type="text" className="form-input"
                                    placeholder="Residential Tower Block A"
                                    value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location / Site Address</label>
                                <input id="proj-location" type="text" className="form-input"
                                    placeholder="Sector 21, Noida, UP"
                                    value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea id="proj-desc" className="form-textarea" rows={3}
                                    placeholder="Brief project description..."
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assign Contractor <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
                                <select id="proj-contractor" className="form-select form-input"
                                    value={form.contractor_id} onChange={e => setForm({ ...form, contractor_id: e.target.value })}>
                                    <option value="">Select a contractor...</option>
                                    {contractors.map(c => <option key={c.user_id} value={c.user_id}>{c.name} — {c.company || c.email}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-12 mt-8">
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button id="create-proj-submit" type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : <><Plus size={15} /> Create Project</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProjectCard({ project }) {
    const sc = STATUS_COLORS[project.status] || STATUS_COLORS.active;
    return (
        <Link to={`/engineer/projects/${project.project_id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                <div className="flex justify-between items-center mb-16">
                    <div style={{ background: 'rgba(234,88,12,0.10)', borderRadius: 'var(--r-md)', padding: '10px' }}>
                        <Building size={22} color="var(--orange)" />
                    </div>
                    <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                        {sc.label}
                    </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{project.project_name}</h3>
                {project.location && (
                    <div className="flex items-center gap-8 mb-8" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <MapPin size={12} /> {project.location}
                    </div>
                )}
                {project.contractor_name && (
                    <div className="flex items-center gap-8 mb-12" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <Users size={12} /> {project.contractor_name}
                    </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        <AlertOctagon size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {project.total_snags || 0} Snags
                    </span>
                    <span style={{ color: 'var(--success)' }}>
                        <CheckCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {project.resolved_snags || 0} Resolved
                    </span>
                </div>
            </div>
        </Link>
    );
}

import { CheckCircle } from 'lucide-react';

function EmptyState({ onAdd }) {
    return (
        <div className="text-center" style={{ padding: '80px 20px' }}>
            <div style={{
                width: 80, height: 80, background: 'rgba(234,88,12,0.08)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
                <FolderOpen size={36} color="var(--orange)" />
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>No Projects Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Create your first construction project to start tracking snags</p>
            <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> Create Your First Project</button>
        </div>
    );
}
