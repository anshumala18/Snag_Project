const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Lines 510 to 524 (1-indexed) are junk.
// That's indices 509 to 523 (0-indexed).

const newLines = [
    ...lines.slice(0, 509),
    ...lines.slice(524)
];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('✅ Deleted lines 510-524');
