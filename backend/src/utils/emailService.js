const nodemailer = require('nodemailer');

// ─── Create transporter (nodemailer v8 compatible) ────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs in dev
    },
  });
};

// ─── Severity helpers ──────────────────────────────────────────────────────────
const SEVERITY_COLORS = { low: '#28a745', medium: '#ffc107', high: '#dc3545' };
const SEVERITY_EMOJIS = { low: '🟢', medium: '🟡', high: '🔴' };
const CRACK_LABELS = {
  hairline: 'Hairline Crack',
  surface: 'Surface Crack',
  structural: 'Structural Crack',
};

// ─── Send Snag Report Email to Contractor ─────────────────────────────────────
const sendSnagReportEmail = async ({ contractorEmail, contractorName, snagData }) => {
  try {
    const transporter = createTransporter();

    const color = SEVERITY_COLORS[snagData.severity] || '#6c757d';
    const emoji = SEVERITY_EMOJIS[snagData.severity] || '⚪';
    const crackLabel = CRACK_LABELS[snagData.crack_type] || snagData.crack_type;
    const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin:0; padding:0; background:#f5f5f5; }
          .wrap  { max-width:600px; margin:20px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.1); }
          .hdr   { background:#1a1a2e; color:#fff; padding:24px; text-align:center; }
          .hdr h1{ margin:0; font-size:22px; }
          .hdr p { margin:6px 0 0; opacity:.8; font-size:13px; }
          .badge { display:inline-block; background:${color}; color:#fff; padding:4px 14px; border-radius:20px; font-weight:bold; font-size:12px; margin-top:10px; }
          .body  { padding:28px; }
          .card  { background:#f8f9fa; border-left:4px solid ${color}; border-radius:4px; padding:16px; margin-bottom:16px; }
          .row   { display:flex; margin-bottom:8px; font-size:13px; }
          .lbl   { font-weight:bold; min-width:170px; color:#555; }
          .desc  { background:#fff8e1; border:1px solid #ffe082; border-radius:4px; padding:14px; margin:14px 0; font-size:13px; }
          .action{ background:#e8f5e9; border:1px solid #a5d6a7; border-radius:4px; padding:14px; margin:14px 0; font-size:13px; }
          .btn   { display:block; width:fit-content; margin:22px auto; background:#1a1a2e; color:#fff; padding:12px 30px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px; }
          .ftr   { background:#f8f9fa; padding:16px; text-align:center; font-size:11px; color:#888; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="hdr">
            <h1>🏗️ Snag Detection System</h1>
            <p>New Snag Report Assigned to You</p>
            <span class="badge">${emoji} ${(snagData.severity || '').toUpperCase()} SEVERITY</span>
          </div>
          <div class="body">
            <p>Dear <strong>${contractorName}</strong>,</p>
            <p>A new snag has been detected and requires your attention. Please review the details below.</p>
            <div class="card">
              <div class="row"><span class="lbl">Snag ID:</span>       <span><strong>${snagData.snag_code}</strong></span></div>
              <div class="row"><span class="lbl">Project:</span>       <span>${snagData.project_name || 'N/A'}</span></div>
              <div class="row"><span class="lbl">Location:</span>      <span>${snagData.location_desc}</span></div>
              <div class="row"><span class="lbl">Crack Type:</span>    <span>${crackLabel}</span></div>
              <div class="row"><span class="lbl">Severity:</span>      <span>${emoji} ${(snagData.severity || '').toUpperCase()}</span></div>
              <div class="row"><span class="lbl">Detection Method:</span><span>AI Vision Model (YOLOv8)</span></div>
              <div class="row"><span class="lbl">Reported On:</span>   <span>${dateStr}</span></div>
            </div>
            <div class="desc">
              <strong>📝 Description:</strong><br>${snagData.description || 'No description provided.'}
            </div>
            <div class="action">
              <strong>🔧 Recommended Action:</strong><br>${snagData.recommended_action || 'Please inspect and take appropriate action.'}
            </div>
            <p style="font-size:13px;color:#666;">Log in to the dashboard to view the full report, image evidence, and update the status.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/contractor/dashboard" class="btn">View Report on Dashboard →</a>
          </div>
          <div class="ftr">
            <p>This is an automated message from the Snag Detection System.</p>
            <p>© ${new Date().getFullYear()} Snag Detection Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Snag Detection System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: contractorEmail,
      subject: `🚨 [${(snagData.severity || '').toUpperCase()}] New Snag Report – ${snagData.snag_code} | ${snagData.project_name || 'Project'}`,
      html: htmlContent,
    });

    console.log(`✅ Report email sent to ${contractorEmail} | messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Report email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ─── Send Status Update Email to Site Engineer ────────────────────────────────
const sendStatusUpdateEmail = async ({ engineerEmail, engineerName, snagData, newStatus }) => {
  try {
    const transporter = createTransporter();

    const statusMap = {
      in_progress: { label: 'In Progress 🔧', color: '#ffc107', msg: 'The contractor has started working on this snag.' },
      resolved: { label: 'Resolved ✅', color: '#28a745', msg: 'The contractor has marked this snag as resolved. Please verify the fix on site.' },
    };
    const s = statusMap[newStatus] || { label: newStatus, color: '#6c757d', msg: 'Status has been updated.' };

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
          <div style="background:#1a1a2e;color:#fff;padding:24px;text-align:center;">
            <h2 style="margin:0;">🏗️ Snag Status Update</h2>
          </div>
          <div style="padding:28px;">
            <p>Dear <strong>${engineerName}</strong>,</p>
            <p>The status of snag <strong>${snagData.snag_code}</strong> has been updated.</p>
            <div style="background:#f8f9fa;border-left:4px solid ${s.color};padding:16px;border-radius:4px;font-size:13px;">
              <p><strong>Snag ID:</strong> ${snagData.snag_code}</p>
              <p><strong>Location:</strong> ${snagData.location_desc}</p>
              <p><strong>New Status:</strong> <span style="color:${s.color};font-weight:bold;">${s.label}</span></p>
            </div>
            <p style="margin-top:16px;">${s.msg}</p>
          </div>
          <div style="background:#f8f9fa;padding:14px;text-align:center;font-size:11px;color:#888;">
            <p>© ${new Date().getFullYear()} Snag Detection Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Snag Detection System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: engineerEmail,
      subject: `📋 Snag ${snagData.snag_code} Status Updated → ${s.label}`,
      html,
    });

    console.log(`✅ Status email sent to ${engineerEmail} | messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Status email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendSnagReportEmail, sendStatusUpdateEmail };
