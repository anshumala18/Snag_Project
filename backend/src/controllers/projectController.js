const { pool } = require('../config/db');

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────
const createProject = async (req, res) => {
    try {
        const { project_name, location, description, contractor_id } = req.body;
        const engineer_id = req.user.user_id;

        if (!project_name) {
            return res.status(400).json({ success: false, message: 'Project name is required.' });
        }

        const result = await pool.query(
            `INSERT INTO projects (project_name, location, description, engineer_id, contractor_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [project_name, location || null, description || null, engineer_id, contractor_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'Project created successfully.',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET ALL PROJECTS ─────────────────────────────────────────────────────────
const getAllProjects = async (req, res) => {
    try {
        const user = req.user;
        let query = `
      SELECT p.*,
        e.name AS engineer_name,
        c.name AS contractor_name,
        COUNT(s.snag_id) AS total_snags,
        COUNT(s.snag_id) FILTER (WHERE s.status = 'resolved') AS resolved_snags
      FROM projects p
      LEFT JOIN users e ON p.engineer_id   = e.user_id
      LEFT JOIN users c ON p.contractor_id = c.user_id
      LEFT JOIN snags s ON p.project_id    = s.project_id
    `;

        const values = [];
        if (user.role === 'site_engineer') {
            query += ` WHERE p.engineer_id = $1`;
            values.push(user.user_id);
        } else if (user.role === 'contractor') {
            query += ` WHERE p.contractor_id = $1`;
            values.push(user.user_id);
        }

        query += ` GROUP BY p.project_id, e.name, c.name ORDER BY p.created_at DESC`;

        const result = await pool.query(query, values);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET SINGLE PROJECT ───────────────────────────────────────────────────────
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.*,
        e.name AS engineer_name,
        c.name AS contractor_name,
        COUNT(s.snag_id) AS total_snags,
        COUNT(s.snag_id) FILTER (WHERE s.status != 'resolved') AS pending_snags,
        COUNT(s.snag_id) FILTER (WHERE s.status = 'resolved') AS resolved_snags
       FROM projects p
       LEFT JOIN users e ON p.engineer_id   = e.user_id
       LEFT JOIN users c ON p.contractor_id = c.user_id
       LEFT JOIN snags s ON p.project_id    = s.project_id
       WHERE p.project_id = $1
       GROUP BY p.project_id, e.name, c.name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_name, location, description, status, contractor_id } = req.body;

        const result = await pool.query(
            `UPDATE projects
       SET project_name  = COALESCE($1, project_name),
           location      = COALESCE($2, location),
           description   = COALESCE($3, description),
           status        = COALESCE($4, status),
           contractor_id = COALESCE($5, contractor_id),
           updated_at    = NOW()
       WHERE project_id = $6
       RETURNING *`,
            [project_name, location, description, status, contractor_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        res.json({ success: true, message: 'Project updated.', data: result.rows[0] });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { createProject, getAllProjects, getProjectById, updateProject };
