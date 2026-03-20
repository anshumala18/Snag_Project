import { useState, useEffect } from 'react';
import { snagAPI } from '../../api';
import Sidebar from '../../components/Sidebar';
import { FileText, FileSpreadsheet, ClipboardList, Clock, Wrench, CheckCircle, Info, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
    const [snags, setSnags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState('');

    const fetchReports = () => {
        setLoading(true);
        snagAPI.getAll().then(r => setSnags(r.data.data))
            .catch(() => toast.error('Failed to load snags'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReports();

        // Listen for sync events
        window.addEventListener('snag_synced', fetchReports);
        return () => window.removeEventListener('snag_synced', fetchReports);
    }, []);

    const handleDelete = async (snag) => {
        if (!window.confirm(`Permanently delete snag ${snag.snag_code} and all its reports?`)) return;
        try {
            await snagAPI.delete(snag.snag_id);
            toast.success('Record deleted successfully');
            fetchReports();
        } catch { toast.error('Failed to delete record'); }
    };

    const exportPDF = async () => {
        setExporting('pdf');
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // Warm white background
            doc.setFillColor(255, 248, 240);
            doc.rect(0, 0, 297, 210, 'F');

            // Orange header bar
            doc.setFillColor(234, 88, 12);
            doc.rect(0, 0, 297, 18, 'F');

            doc.setFontSize(12); doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('SNAGDETECT — Crack Inspection Report', 14, 12);

            doc.setFontSize(9); doc.setFont(undefined, 'normal');
            doc.setTextColor(92, 60, 20);
            doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   |   Total Records: ${snags.length}`, 14, 26);

            autoTable(doc, {
                startY: 32,
                head: [['Snag ID', 'Project', 'Location', 'Crack Type', 'Severity', 'Status', 'Reported By', 'Date']],
                body: snags.map(s => [
                    s.snag_code,
                    s.project_name || '—',
                    s.location_desc || '—',
                    s.crack_type ? s.crack_type.charAt(0).toUpperCase() + s.crack_type.slice(1) : '—',
                    s.severity?.toUpperCase() || '—',
                    s.status?.replace('_', ' ').toUpperCase() || '—',
                    s.reported_by_name || '—',
                    new Date(s.created_at).toLocaleDateString('en-IN'),
                ]),
                styles: { fontSize: 8.5, cellPadding: 4, textColor: [28, 18, 8], fillColor: [255, 255, 255] },
                headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                alternateRowStyles: { fillColor: [255, 248, 240] },
                columnStyles: { 4: { cellWidth: 20 }, 5: { cellWidth: 24 } },
                margin: { left: 14, right: 14 },
            });

            doc.save(`SnagReport_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF report exported!');
        } catch { toast.error('Failed to export PDF'); }
        finally { setExporting(''); }
    };

    const exportExcel = () => {
        setExporting('excel');
        try {
            const rows = snags.map(s => ({
                'Snag ID': s.snag_code,
                'Project': s.project_name || '—',
                'Location': s.location_desc,
                'Crack Type': s.crack_type || '—',
                'Severity': s.severity?.toUpperCase() || '—',
                'Status': s.status?.replace('_', ' ').toUpperCase() || '—',
                'Reported By': s.reported_by_name || '—',
                'AI Detected': s.ai_detected ? 'Yes' : 'No',
                'Sent to Contractor': s.sent_to_contractor ? 'Yes' : 'No',
                'Description': s.description || '—',
                'Date': new Date(s.created_at).toLocaleDateString('en-IN'),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Snag Report');
            XLSX.writeFile(wb, `SnagReport_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('Excel report exported!');
        } catch { toast.error('Failed to export Excel'); }
        finally { setExporting(''); }
    };

    const stats = {
        pending: snags.filter(s => s.status === 'pending').length,
        inProgress: snags.filter(s => s.status === 'in_progress').length,
        resolved: snags.filter(s => s.status === 'resolved').length,
    };

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="page-title">Inspection Reports</h1>
                            <p className="page-subtitle">Export and download crack inspection data</p>
                        </div>
                        <div className="flex gap-12">
                            <button id="export-pdf-btn" className="btn btn-danger" onClick={exportPDF} disabled={!!exporting || loading}>
                                {exporting === 'pdf' ? <span className="spinner" /> : <><FileText size={16} /> Export PDF</>}
                            </button>
                            <button id="export-excel-btn" className="btn btn-success" onClick={exportExcel} disabled={!!exporting || loading}>
                                {exporting === 'excel' ? <span className="spinner" /> : <><FileSpreadsheet size={16} /> Export Excel</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="page-body">
                    <div className="hazard-bar mb-24" />

                    {/* Summary */}
                    <div className="grid-4 mb-24">
                        <SummaryCard icon={<ClipboardList size={22} />} label="Total Snags" value={snags.length} color="var(--orange)" bg="rgba(234,88,12,0.08)" />
                        <SummaryCard icon={<Clock size={22} />} label="Pending" value={stats.pending} color="var(--amber)" bg="rgba(217,119,6,0.08)" />
                        <SummaryCard icon={<Wrench size={22} />} label="In Progress" value={stats.inProgress} color="#0369A1" bg="rgba(3,105,161,0.08)" />
                        <SummaryCard icon={<CheckCircle size={22} />} label="Resolved" value={stats.resolved} color="var(--success)" bg="rgba(21,128,61,0.08)" />
                    </div>

                    {/* Table */}
                    <div className="table-wrapper mb-20" style={{ padding: 0 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={17} color="var(--orange)" />
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>All Recorded Snags</h3>
                        </div>
                        {loading ? (
                            <div className="text-center" style={{ padding: 60 }}><div className="spinner spinner-lg spinner-dark" style={{ margin: 'auto' }} /></div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Snag ID</th><th>Project</th><th>Location</th>
                                        <th>Crack Type</th><th>Severity</th><th>Status</th>
                                        <th>Reported By</th><th>Date</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snags.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No snags recorded yet</td></tr>
                                    ) : snags.map(s => (
                                        <tr key={s.snag_id}>
                                            <td><span style={{ fontWeight: 700, color: 'var(--orange)' }}>{s.snag_code}</span></td>
                                            <td>{s.project_name || '—'}</td>
                                            <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.location_desc}</td>
                                            <td>{s.crack_type ? <span className={`badge badge-${s.crack_type}`}>{s.crack_type}</span> : '—'}</td>
                                            <td>{s.severity ? <span className={`badge badge-${s.severity}`}>{s.severity.toUpperCase()}</span> : '—'}</td>
                                            <td><span className={`badge badge-${s.status}`}>{s.status?.replace('_', ' ').toUpperCase()}</span></td>
                                            <td>{s.reported_by_name || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <button className="btn btn-sm btn-ghost" title="Delete Record"
                                                    onClick={() => handleDelete(s)} style={{ color: 'var(--danger)' }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Info card */}
                    <div className="card" style={{ background: 'var(--orange-pale)', border: '1px solid rgba(234,88,12,0.15)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Info size={18} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div><strong style={{ color: 'var(--text-primary)' }}>PDF Report</strong> — Professionally formatted with orange branding. Suitable for client presentations and site documentation.</div>
                                <div><strong style={{ color: 'var(--text-primary)' }}>Excel Report</strong> — Full data export with all fields, ready for project management tools and analysis.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function SummaryCard({ icon, label, value, color, bg }) {
    return (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color }}>
                {icon}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, fontFamily: 'Manrope,sans-serif' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
        </div>
    );
}
