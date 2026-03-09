import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectAPI, snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import {
    MapPin, Users, AlertOctagon, CheckCircle, Clock,
    ChevronLeft, PlusCircle, LayoutGrid, FileText, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectWorkspace() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjectData();
    }, [id]);

    const fetchProjectData = async () => {
        try {
            const res = await projectAPI.getById(id);
            setProject(res.data.data);
        } catch (err) {
            toast.error('Failed to load project workspace');
            console.error(err);
        } finally {
            setLoading(false);
        }
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

                    {/* Tabs / Content Placeholder */}
                    <div className="card">
                        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                            <div style={{
                                padding: '12px 0', borderBottom: '3px solid var(--orange)', color: 'var(--orange)',
                                fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <LayoutGrid size={16} /> Overview
                            </div>
                            <div style={{ padding: '12px 0', borderBottom: '3px solid transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                Snag List
                            </div>
                            <div style={{ padding: '12px 0', borderBottom: '3px solid transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                Reports
                            </div>
                        </div>

                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                            <div style={{ background: 'rgba(234,88,12,0.05)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <AlertOctagon size={28} color="var(--orange)" />
                            </div>
                            <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>No snags detected yet.</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Click "Detect Snag" to capture or upload an image and let AI analyze the defect.</p>
                            <Link to="/engineer/snags" className="btn btn-secondary mt-24">View All Snags</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
