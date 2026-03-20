const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix missing $ in SQL conditions
content = content.replace(/reported_by = \${idx\+\+}/g, 'reported_by = $${idx++}');

// 2. Ensure exports are complete
const exportTarget = /module\.exports = \{[\s\S]+?\};/;
const completeExport = `module.exports = {
    createSnag,
    getAllSnags,
    getSnagById,
    updateSnag,
    getReportPreview,
    getMailLogs,
    sendReportToContractor,
    updateSnagStatus,
    deleteSnag,
    getDashboardStats,
};`;

if (exportTarget.test(content)) {
    content = content.replace(exportTarget, completeExport);
}

fs.writeFileSync(filePath, content);
console.log('✅ Final fixes applied to snagController.js');
