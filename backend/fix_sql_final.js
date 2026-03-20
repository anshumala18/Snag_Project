const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

const dollar = String.fromCharCode(36);
const target = 's.reported_by = ${idx++}';
const replacement = 's.reported_by = ' + dollar + '${idx++}';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('✅ Replaced target with: ' + replacement);
} else {
  console.log('❌ Target not found');
}
