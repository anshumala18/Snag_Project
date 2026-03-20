import os

path = 'src/controllers/snagController.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '(s.reported_by = ${idx++}'
replacement = '(s.reported_by = $${idx++}'

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ REPLACED BY PYTHON")
else:
    print("❌ TARGET NOT FOUND")
