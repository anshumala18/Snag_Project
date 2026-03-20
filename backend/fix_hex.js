const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = '(s.reported_by = ${idx++} OR s.reported_by IS NULL)';
const replacement = '(s.reported_by = ' + String.fromCharCode(36) + '${idx++} OR s.reported_by IS NULL)';

if (content.indexOf(target) !== -1) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('✅ REPLACED Successfully');
} else {
  console.log('❌ TARGET NOT FOUND in: ' + filePath);
}
