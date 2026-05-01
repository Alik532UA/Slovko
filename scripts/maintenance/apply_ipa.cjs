const fs = require('fs');
const path = require('path');

const batchFile = '.temp_ipa_chunk.json';
const dir = 'src/lib/data/transcriptions/en/levels';

if (!fs.existsSync(batchFile)) {
    console.error('Batch file not found');
    process.exit(1);
}

let batchRaw = fs.readFileSync(batchFile, 'utf8');
// Strip BOM if exists
if (batchRaw.charCodeAt(0) === 0xFEFF) {
    batchRaw = batchRaw.slice(1);
}

const batch = JSON.parse(batchRaw);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let totalUpdated = 0;

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    let updated = false;

    Object.keys(batch).forEach(word => {
        const regex = new RegExp(`"${word}": "//"`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, `"${word}": "${batch[word]}"`);
            updated = true;
            totalUpdated++;
        }
    });

    if (updated) {
        fs.writeFileSync(p, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});

console.log(`Successfully applied ${totalUpdated} transcriptions.`);
