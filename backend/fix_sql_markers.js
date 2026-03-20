const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('s.reported_by = ${idx++}')) {
    lines[i] = lines[i].replace('s.reported_by = ${idx++}', 's.reported_by = $${idx++}');
    console.log(`✅ Fixed line ${i+1}: ${lines[i].trim()}`);
  }
}

fs.writeFileSync(filePath, lines.join('\n'));
