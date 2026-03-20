const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { notifyUser } = require('../config/socket');
const { sendSnagReportEmail, sendStatusUpdateEmail } = require('../utils/emailService');
const { exec } = require("child_process");



//const aiResult = JSON.parse(jsonString);

function runPythonModel(imagePath) {
    return new Promise((resolve, reject) => {

        const absolutePath = path.resolve(imagePath);

        exec(
            `python "./snag-detection-system/pipeline.py" "${absolutePath}"`,
            { timeout: 60000 },
            (error, stdout, stderr) => {

                if (error) {
                    console.error("Python Error:", error);
                    console.error("STDERR:", stderr);
                    return reject(error);
                }

                try {
                    console.log("RAW OUTPUT:", stdout);

                    const raw = stdout.trim();
                    const jsonStart = raw.indexOf("{");

                    if (jsonStart === -1) {
                        return reject(new Error("Invalid Python output"));
                    }

                    const jsonString = raw.slice(jsonStart);

                    const result = JSON.parse(jsonString);

                    if (result.error) {
                        return reject(new Error(result.error));
                    }

                    resolve(result);

                } catch (err) {
                    console.error("Parse Error:", stdout);
                    reject(err);
                }
            }
        );
    });
}

const generateSnagCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CRK-${random}`;
};
// ─── CREATE SNAG (Upload Image + Store Snag) ──────────────────────────────────
const createSnag = async (req, res) => {
    try {
        const {
            project_id,
            location_desc,
            crack_type,
            severity,
            description,
            recommended_action,
        } = req.body;

        const reportedBy = req.user.user_id;
         
        // AI detection 
       
            let aiResult = null;
            if (req.file) {
                const imagePath = req.file.path;

                try {
                    aiResult = await runPythonModel(imagePath);
                    console.log("✅ AI Result:", aiResult);
                } catch (err) {
                    console.error("❌ AI FAILED:", err);
                    return res.status(500).json({
                        success: false, 
                        message: "AI processing failed",
                        error: err.message
                    });
                }
}        
//  IF ONLY IMAGE UPLOAD → RETURN AI RESULT (NO DB SAVE)
if (!location_desc) {
    return res.status(200).json({
        success: true,
        ai: aiResult || {
            damage_type: "crack",
            severity: "Minor",
            confidence: 0.9,
            total_detections: 1,
            output_image: null
        }
    });
}
       // const finalCrackType = aiResult?.damage_type || crack_type || null;
        let finalCrackType = crack_type || null;
        if (aiResult?.damage_type) {
            const type = aiResult.damage_type.toLowerCase();
            if (type.includes("hairline")) finalCrackType = "hairline";
            else if (type.includes("surface")) finalCrackType = "surface";
            else finalCrackType = "structural"; // default for cracks
        } else if (aiResult) {
            finalCrackType = "structural"; // fallback if AI script ran but returned no damage_type
        }

        let finalSeverity = severity || null;
        if (aiResult?.severity) {
            const sev = aiResult.severity.toLowerCase();
            if (sev.includes("minor") || sev.includes("low")) finalSeverity = "low";
            else if (sev.includes("moderate") || sev.includes("medium")) finalSeverity = "medium";
            else if (sev.includes("severe") || sev.includes("high")) finalSeverity = "high";
            else finalSeverity = "medium"; // fallback for 'no damage' or unknown
        } else if (aiResult) {
            finalSeverity = "medium"; // fallback if AI script ran but returned no severity
        }

        const aiDetected = aiResult ? true : false;
        const aiConfidence = aiResult?.confidence || null;
       
        // Generate unique snag code
        const snagCode = await generateSnagCode();


            
        // Insert snag into DB
        const contractorId = req.body.contractor_id || null;
        const sentStatus = contractorId ? true : false;
        const sentAt = contractorId ? 'NOW()' : 'NULL';

        const snagResult = await pool.query(
            `INSERT INTO snags
(snag_code, project_id, reported_by, location_desc, crack_type, severity, description, recommended_action, ai_detected, ai_confidence, ai_result, assigned_to, sent_to_contractor, sent_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,${sentAt})
RETURNING *`,
            [
                snagCode,
                project_id || null,
                reportedBy,
                location_desc,
                finalCrackType,
                finalSeverity,
                description || null,
                recommended_action || null,
                aiDetected,
                aiConfidence,
                aiResult ? JSON.stringify(aiResult) : null,
                contractorId,
                sentStatus
            ]
        );

        const snag = snagResult.rows[0];

        if (req.file) {
            const imageUrl = `/uploads/${req.file.filename}`;
            await pool.query(
                `INSERT INTO images (snag_id, image_url, file_name, file_size)
         VALUES ($1, $2, $3, $4)`,
                [snag.snag_id, imageUrl, req.file.originalname, req.file.size]
            );
        }

        // Notify the user via Socket.io
        notifyUser(reportedBy, 'snag_created', snag);
        if (req.body.contractor_id) {
            notifyUser(req.body.contractor_id, 'snag_assigned', snag);
        }

        res.status(201).json({
            success: true,
            message: `Snag ${snagCode} created successfully.`,
            data: snag,
        });
    } catch (error) {
        console.error('Create snag error:', error);
        // cleanup uploaded file on error
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        res.status(500).json({ success: false, message: 'Server error creating snag.' });
    }
    
};

// ─── GET ALL SNAGS ────────────────────────────────────────────────────────────
const getAllSnags = async (req, res) => {
    try {
        const { status, severity, crack_type, project_id } = req.query;
        const user = req.user;

        let query = `
      SELECT
        s.*,
        u.name  AS reported_by_name,
        u.email AS reported_by_email,
        c.name  AS assigned_to_name,
        p.project_name,
        COALESCE(
          json_agg(
            json_build_object('image_id', i.image_id, 'image_url', i.image_url, 'file_name', i.file_name)
          ) FILTER (WHERE i.image_id IS NOT NULL), '[]'
        ) AS images
      FROM snags s
      LEFT JOIN users    u ON s.reported_by = u.user_id
      LEFT JOIN users    c ON s.assigned_to = c.user_id
      LEFT JOIN projects p ON s.project_id  = p.project_id
      LEFT JOIN images   i ON s.snag_id     = i.snag_id
    `;

        const conditions = [];
        const values = [];
        let idx = 1;

        // Contractor sees only snags assigned to them
        if (user.role === 'contractor') {
            conditions.push(`s.assigned_to = $${idx++}`);
            values.push(user.user_id);
        }
        // Site engineer sees only their own snags
        if (user.role === 'site_engineer') {
            conditions.push(`s.reported_by = $${idx++}`);
            values.push(user.user_id);
        }

        if (status) { conditions.push(`s.status = $${idx++}`); values.push(status); }
        if (severity) { conditions.push(`s.severity = $${idx++}`); values.push(severity); }
        if (crack_type) { conditions.push(`s.crack_type = $${idx++}`); values.push(crack_type); }
        if (project_id) { conditions.push(`s.project_id = $${idx++}`); values.push(project_id); }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` GROUP BY s.snag_id, u.name, u.email, c.name, p.project_name ORDER BY s.created_at DESC`;

        const result = await pool.query(query, values);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Get all snags error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching snags.' });
    }
};

// ─── GET SINGLE SNAG ──────────────────────────────────────────────────────────
const getSnagById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT
        s.*,
        u.name  AS reported_by_name,
        u.email AS reported_by_email,
        c.name  AS assigned_to_name,
        p.project_name,
        COALESCE(
          json_agg(
            json_build_object('image_id', i.image_id, 'image_url', i.image_url, 'file_name', i.file_name)
          ) FILTER (WHERE i.image_id IS NOT NULL), '[]'
        ) AS images
       FROM snags s
       LEFT JOIN users    u ON s.reported_by = u.user_id
       LEFT JOIN users    c ON s.assigned_to = c.user_id
       LEFT JOIN projects p ON s.project_id  = p.project_id
       LEFT JOIN images   i ON s.snag_id     = i.snag_id
       WHERE s.snag_id = $1
       GROUP BY s.snag_id, u.name, u.email, c.name, p.project_name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Snag not found.' });
        }

        const snag = result.rows[0];

        // Access check
        if (req.user.role === 'contractor' && snag.assigned_to !== req.user.user_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        res.json({ success: true, data: snag });
    } catch (error) {
        console.error('Get snag error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── UPDATE SNAG (Engineer edits AI output) ───────────────────────────────────
const updateSnag = async (req, res) => {
    try {
        const { id } = req.params;
        const { crack_type, severity, description, recommended_action, location_desc, contractor_id } = req.body;

        const result = await pool.query(
            `UPDATE snags
       SET crack_type = COALESCE($1, crack_type),
           severity = COALESCE($2, severity),
           description = COALESCE($3, description),
           recommended_action = COALESCE($4, recommended_action),
           location_desc = COALESCE($5, location_desc),
           assigned_to = COALESCE($6, assigned_to),
           updated_at = NOW()
       WHERE snag_id = $7
       RETURNING *`,
            [crack_type, severity, description, recommended_action, location_desc, contractor_id || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Snag not found.' });
        }

        res.json({ success: true, message: 'Snag updated successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Update snag error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── SEND REPORT TO CONTRACTOR ────────────────────────────────────────────────
const sendReportToContractor = async (req, res) => {
    try {
        const { id } = req.params;
        const { contractor_id } = req.body;

        if (!contractor_id) {
            return res.status(400).json({ success: false, message: 'contractor_id is required.' });
        }

        // Fetch snag details (with image)
        const snagResult = await pool.query(
            `SELECT s.*, p.project_name, i.image_url
       FROM snags s
       LEFT JOIN projects p ON s.project_id = p.project_id
       LEFT JOIN images i ON s.snag_id = i.snag_id
       WHERE s.snag_id = $1
       LIMIT 1`,
            [id]
        );

        if (snagResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Snag not found.' });
        }

        const snag = snagResult.rows[0];

        // Fetch contractor details
        const contractorResult = await pool.query(
            `SELECT user_id, name, email FROM users WHERE user_id = $1 AND role = 'contractor'`,
            [contractor_id]
        );

        if (contractorResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Contractor not found.' });
        }

        const contractor = contractorResult.rows[0];

        // Build report data
        const reportData = {
            snag_code: snag.snag_code,
            project_name: snag.project_name,
            location_desc: snag.location_desc,
            crack_type: snag.crack_type,
            severity: snag.severity,
            description: snag.description,
            recommended_action: snag.recommended_action,
            reported_at: snag.created_at,
        };

        // Save report in DB
        await pool.query(
            `INSERT INTO reports (snag_id, report_data, sent_to, sent_at)
       VALUES ($1, $2, $3, NOW())`,
            [id, JSON.stringify(reportData), contractor_id]
        );

        // Mark snag as sent and assign to contractor
        await pool.query(
            `UPDATE snags SET sent_to_contractor = true, sent_at = NOW(), assigned_to = $2, updated_at = NOW()
       WHERE snag_id = $1`,
            [id, contractor_id]
        );

        // ── Real-time notification via Socket.IO ──
        notifyUser(contractor_id, 'new_snag_report', {
            message: `New snag report assigned: ${snag.snag_code}`,
            snag_code: snag.snag_code,
            severity: snag.severity,
            crack_type: snag.crack_type,
            location: snag.location_desc,
            timestamp: new Date(),
        });

        // ── Send email to contractor ──
        let emailResult = { success: false, error: 'Email not configured' };
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            emailResult = await sendSnagReportEmail({
                contractorEmail: contractor.email,
                contractorName: contractor.name,
                snagData: { ...snag, project_name: snag.project_name },
            });
        }

        res.json({
            success: true,
            message: `Report sent to contractor ${contractor.name} successfully.`,
            data: {
                snag_code: snag.snag_code,
                contractor: contractor.name,
                email_sent: emailResult.success,
                notification_sent: true,
            },
        });
    } catch (error) {
        console.error('Send report error:', error);
        res.status(500).json({ success: false, message: 'Server error sending report.' });
    }
};

// ─── UPDATE SNAG STATUS (Contractor updates) ──────────────────────────────────
const updateSnagStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'in_progress', 'resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        // Get current status and assignment first
        const current = await pool.query('SELECT * FROM snags WHERE snag_id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Snag not found.' });
        }

        const snag = current.rows[0];

        // Contractor can only update if they are the assignee
        if (req.user.role === 'contractor' && snag.assigned_to !== req.user.user_id) {
            return res.status(403).json({ success: false, message: 'Access denied. This snag is not assigned to you.' });
        }

        const oldStatus = snag.status;

        // Update status
        const updated = await pool.query(
            `UPDATE snags SET status = $1, updated_at = NOW() WHERE snag_id = $2 RETURNING *`,
            [status, id]
        );

        // Log status change
        await pool.query(
            `INSERT INTO status_updates (snag_id, updated_by, old_status, new_status, notes)
       VALUES ($1, $2, $3, $4, $5)`,
            [id, req.user.user_id, oldStatus, status, notes || null]
        );

        const updatedSnag = updated.rows[0];

        // ── Notify the site engineer in real-time ──
        if (updatedSnag.reported_by) {
            notifyUser(updatedSnag.reported_by, 'snag_status_updated', {
                message: `Snag ${updatedSnag.snag_code} status updated to: ${status}`,
                snag_code: updatedSnag.snag_code,
                new_status: status,
                timestamp: new Date(),
            });

            // ── Send status update email to engineer ──
            if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
                const engineerResult = await pool.query(
                    'SELECT name, email FROM users WHERE user_id = $1',
                    [updatedSnag.reported_by]
                );
                if (engineerResult.rows.length > 0) {
                    await sendStatusUpdateEmail({
                        engineerEmail: engineerResult.rows[0].email,
                        engineerName: engineerResult.rows[0].name,
                        snagData: updatedSnag,
                        newStatus: status,
                    });
                }
            }
        }

        res.json({
            success: true,
            message: `Snag status updated to "${status}".`,
            data: updatedSnag,
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── DELETE SNAG ──────────────────────────────────────────────────────────────
const deleteSnag = async (req, res) => {
    try {
        const { id } = req.params;

        // Get images to delete files
        const images = await pool.query('SELECT image_url FROM images WHERE snag_id = $1', [id]);

        const result = await pool.query('DELETE FROM snags WHERE snag_id = $1 RETURNING snag_id, snag_code', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Snag not found.' });
        }

        // Delete image files from disk
        images.rows.forEach(({ image_url }) => {
            const filePath = path.join(__dirname, '../../', image_url);
            if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
        });

        res.json({ success: true, message: `Snag ${result.rows[0].snag_code} deleted successfully.` });
    } catch (error) {
        console.error('Delete snag error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET DASHBOARD STATS ──────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        let whereClause = '';
        const values = [];

        if (user.role === 'site_engineer') {
            whereClause = 'WHERE reported_by = $1';
            values.push(user.user_id);
        } else if (user.role === 'contractor') {
            whereClause = 'WHERE assigned_to = $1';
            values.push(user.user_id);
        }

        const stats = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved')    AS resolved,
        COUNT(*) FILTER (WHERE severity = 'high')      AS high_severity,
        COUNT(*) FILTER (WHERE severity = 'medium')    AS medium_severity,
        COUNT(*) FILTER (WHERE severity = 'low')       AS low_severity,
        COUNT(*)                                        AS total
       FROM snags ${whereClause}`,
            values
        );

        res.json({ success: true, data: stats.rows[0] });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = {
    createSnag,
    getAllSnags,
    getSnagById,
    updateSnag,
    sendReportToContractor,
    updateSnagStatus,
    deleteSnag,
    getDashboardStats,
};     