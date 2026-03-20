const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\frontend\\src\\pages\\engineer\\SnagList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Button
const buttonTarget = `                                                    {!snag.sent_to_contractor && (
                                                        <button className="btn btn-sm btn-primary" title="Send Report"
                                                            onClick={() => { setSendModal(snag); setSendContractor(snag.assigned_to || ''); }}>
                                                            <Send size={13} />
                                                        </button>
                                                    )}`;

const buttonReplacement = `                                                    {!snag.sent_to_contractor && (
                                                        <button className="btn btn-sm btn-primary" title="Send Report"
                                                            onClick={() => handleOpenSend(snag)}>
                                                            <Send size={13} />
                                                        </button>
                                                    )}`;

// 2. Fix Modal (more flexible regex)
const modalRegex = /\{\/\* Send Report Modal \*\/\}\s+\{sendModal && \([\s\S]+?\}\s+<\/div>\s+\);?\s+\}/;

const modalReplacement = `{/* Send Report Modal (Human-in-the-loop) */}
            {sendModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: sendStep === 1 ? 500 : 900, width: '95%', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', padding: 0 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {sendStep === 1 ? 'Step 1: Assign Contractor' : 'Step 2: Review & Send Report'}
                            </h2>
                            <button className="btn-close" onClick={() => setSendModal(null)}>×</button>
                        </div>

                        <div className="modal-body" style={{ padding: 24 }}>
                            {sendStep === 1 ? (
                                <div className="animated-fade-in">
                                    <p className="mb-20" style={{ color: 'var(--text-muted)' }}>
                                        Choose a contractor to send the report for <strong>{sendModal.snag_code}</strong>.
                                    </p>
                                    <div className="form-group">
                                        <label className="form-label">Select Contractor</label>
                                        <select 
                                            className="form-input"
                                            value={sendContractor}
                                            onChange={(e) => setSendContractor(e.target.value)}
                                        >
                                            <option value="">-- Choose Contractor --</option>
                                            {contractors.map(c => (
                                                <option key={c.user_id} value={c.user_id}>{c.name} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end mt-20">
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={handleGoToPreview}
                                            disabled={!sendContractor || fetchingPreview}
                                        >
                                            {fetchingPreview ? <div className="spinner spinner-sm" /> : 'Continue to Preview →'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="animated-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    {/* Column 1: Report Data Editor */}
                                    <div>
                                        <h4 style={{ marginBottom: 12, fontSize: 13, textTransform: 'uppercase', opacity: 0.7, color: 'var(--orange)' }}>Report Data</h4>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 12 }}>Severity</label>
                                                <select 
                                                    className="form-input form-input-sm"
                                                    value={previewData.reportData.severity}
                                                    onChange={(e) => setPreviewData({
                                                        ...previewData, 
                                                        reportData: { ...previewData.reportData, severity: e.target.value }
                                                    })}
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 12 }}>Description</label>
                                                <textarea 
                                                    className="form-input"
                                                    rows={3}
                                                    value={previewData.reportData.description}
                                                    onChange={(e) => setPreviewData({
                                                        ...previewData, 
                                                        reportData: { ...previewData.reportData, description: e.target.value }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 12 }}>Recommended Action</label>
                                                <textarea 
                                                    className="form-input"
                                                    rows={3}
                                                    value={previewData.reportData.recommended_action}
                                                    onChange={(e) => setPreviewData({
                                                        ...previewData, 
                                                        reportData: { ...previewData.reportData, recommended_action: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Email Content Editor */}
                                    <div>
                                        <h4 style={{ marginBottom: 12, fontSize: 13, textTransform: 'uppercase', opacity: 0.7, color: 'var(--blue)' }}>Email Message</h4>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 12 }}>Email Subject</label>
                                                <input 
                                                    className="form-input form-input-sm"
                                                    value={previewData.emailSubject}
                                                    onChange={(e) => setPreviewData({ ...previewData, emailSubject: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: 12 }}>Email Body</label>
                                                <textarea 
                                                    className="form-input"
                                                    rows={8}
                                                    style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-body)' }}
                                                    value={previewData.emailBody}
                                                    onChange={(e) => setPreviewData({ ...previewData, emailBody: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {sendStep === 2 && (
                            <div className="modal-footer flex justify-between items-center" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px' }}>
                                <button className="btn btn-ghost" onClick={() => setSendStep(1)}>← Back</button>
                                <div className="flex gap-12">
                                    <button className="btn btn-ghost" onClick={() => setSendModal(null)}>Cancel</button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleSendReport}
                                        disabled={sending}
                                    >
                                        {sending ? <div className="spinner spinner-sm" /> : <><Send size={16} /> Finalize & Send Report</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}`;

if (content.includes(buttonTarget)) {
    content = content.replace(buttonTarget, buttonReplacement);
    console.log('✅ Button fix matched.');
} else {
     // fallback if indentation or something is different
    const buttonRegex = /onClick=\{\(\) => \{ setSendModal\(snag\); setSendContractor\(snag\.assigned_to \|\| ''\); \}\}/;
    if (buttonRegex.test(content)) {
        content = content.replace(buttonRegex, `onClick={() => handleOpenSend(snag)}`);
        console.log('✅ Button fix matched via fallback regex.');
    } else {
        console.error('❌ Could not find Button target.');
    }
}

if (modalRegex.test(content)) {
    content = content.replace(modalRegex, modalReplacement);
    console.log('✅ Modal fix matched.');
} else {
    console.error('❌ Could not find Modal target.');
}

fs.writeFileSync(filePath, content);
console.log('✅ Changes applied to SnagList.jsx');
