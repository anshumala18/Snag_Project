const fs = require('fs');
const filePath = 'c:\\Users\\Anshumala\\Downloads\\Snag_AI\\snag-detection-ai\\backend\\src\\controllers\\snagController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Regex to find the broken section
const targetRegex = /\[crack_type, severity, description, recommended_action, location_desc, contractor_id \|\| null, id\]\s+\);\s+\/\/\s+───\s+SEND\s+REPORT\s+TO\s+CONTRACTOR\s+───/;

const replacement = `[crack_type, severity, description, recommended_action, location_desc, contractor_id || null, id]
        );

        res.json({ success: true, message: 'Snag updated successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Update snag error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── SEND REPORT TO CONTRACTOR ───────────────────────────────────────────────`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('✅ Regex fix successful!');
} else {
    console.log('❌ Regex did not match.');
}
