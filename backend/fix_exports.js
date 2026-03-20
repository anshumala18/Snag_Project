const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `module.exports = {
    createSnag,
    getAllSnags,
    getSnagById,
    updateSnag,
    getReportPreview,
    getMailLogs,
    updateSnagStatus,
    deleteSnag,
    getDashboardStats,
};`;

const replacement = `module.exports = {
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

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('✅ Updated exports in snagController.js');
} else {
    // try with different indentation
    const lines = content.split('\n');
    const startIdx = lines.findIndex(l => l.includes('module.exports = {'));
    if (startIdx !== -1) {
        const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('};'));
        if (endIdx !== -1) {
            const newExports = [
                'module.exports = {',
                '    createSnag,',
                '    getAllSnags,',
                '    getSnagById,',
                '    updateSnag,',
                '    getReportPreview,',
                '    getMailLogs,',
                '    sendReportToContractor,',
                '    updateSnagStatus,',
                '    deleteSnag,',
                '    getDashboardStats,',
                '};'
            ];
            lines.splice(startIdx, endIdx - startIdx + 1, ...newExports);
            fs.writeFileSync(filePath, lines.join('\n'));
            console.log('✅ Updated exports via line splice in snagController.js');
        } else {
             console.log('❌ Could not find end of exports.');
        }
    } else {
        console.log('❌ Could not find start of exports.');
    }
}
