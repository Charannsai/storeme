const fs = require('fs');
const path = require('path');
//changes should be done
const walks = [
    'c:/Users/karth/OneDrive/Desktop/storeme/mobile/src/screens',
    'c:/Users/karth/OneDrive/Desktop/storeme/mobile/src/navigation',
    'c:/Users/karth/OneDrive/Desktop/storeme/mobile/App.tsx'
];

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
        return dir.endsWith('.tsx') || dir.endsWith('.ts') ? [dir] : [];
    }
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

let files = [];
walks.forEach(w => {
    files = files.concat(walk(w));
});

files.forEach(file => {
    let original = fs.readFileSync(file, 'utf8');
    let content = original;

    // Change accent blue to dark gray #1A1A1A
    content = content.replace(/#3B82F6/ig, '#1A1A1A');

    // Slightly darker alternative blue to #0A0A0A
    content = content.replace(/#2563EB/ig, '#0A0A0A');

    // Checkboxes overlay rgba translation
    content = content.replace(/rgba\(59,\s*130,\s*246/ig, 'rgba(26, 26, 26');

    // Lighter background shades
    content = content.replace(/#EFF6FF/ig, '#F8FAFC');
    content = content.replace(/#DBEAFE/ig, '#E2E8F0');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated colors in ${path.basename(file)}`);
    }
});
