const fs = require('fs');
const path = require('path');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Syntax Error (Remove junk between getMailLogs and updateSnagStatus)
const junkRegex = /\/\/\s+───\s+GET\s+MAIL\s+LOGS\s+────────────────────────────────────────────────────────────[\s\S]+?n\(\{[\s\S]+?\}\s+catch\s+\(error\)\s+\{[\s\S]+?\}\s+\};\s+/;

const replacement = `// ─── GET MAIL LOGS ────────────────────────────────────────────────────────────
const getMailLogs = async (req, res) => {
    try {
        const result = await pool.query(
            \`SELECT m.*, s.snag_code, u.name as sender_name 
             FROM mail_logs m
             LEFT JOIN snags s ON m.snag_id = s.snag_id
             LEFT JOIN users u ON m.user_id = u.user_id
             ORDER BY m.sent_at DESC\`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Mail logs error:', error);
        res.status(500).json({ success: false, message: 'Error fetching mail logs.' });
    }
};
`;

if (junkRegex.test(content)) {
    content = content.replace(junkRegex, replacement);
    console.log('✅ Removed syntax error junk.');
} else {
    // Fallback search
    console.log('❌ Junk Regex failed. Manual check required.');
}

// 2. Fix Ownership Check for old snags (Allow reported_by IS NULL)
content = content.replace(
    /conditions\.push\(\`s\.reported_by = \$\$\{idx\+\+\}\`(\s+)\|\|\s+s\.reported_by\s+IS\s+NULL\)/g,
    `conditions.push(\`(s.reported_by = \$\$\{idx++\} OR s.reported_by IS NULL)\`)`
);

// Wait, check the actual line in content.
const engineerCondition = /conditions\.push\(`s\.reported_by = \$\$\{idx\+\+\}`\);/g;
content = content.replace(engineerCondition, `conditions.push(\`(s.reported_by = \$\$\{idx++\} OR s.reported_by IS NULL)\`);`);

const statsCondition = /whereClause = 'WHERE reported_by = \$1'/;
content = content.replace(statsCondition, `whereClause = 'WHERE (reported_by = $1 OR reported_by IS NULL)'`);

fs.writeFileSync(filePath, content);
console.log('✅ Applied fixes to snagController.js');
