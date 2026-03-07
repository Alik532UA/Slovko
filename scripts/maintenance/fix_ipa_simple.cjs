const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const TSCR_DIR = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');

console.log('🚀 Starting Global IPA recovery for split keys...');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
let totalRecovered = 0;

// 1. Build a global map of ALL base transcriptions
const globalTranscriptions = {};

levels.forEach(lvl => {
    if (!fs.existsSync(TSCR_DIR)) return;
    const files = fs.readdirSync(TSCR_DIR).filter(f => f.startsWith(lvl + '_'));
    files.forEach(file => {
        const filePath = path.join(TSCR_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        Object.entries(data).forEach(([k, v]) => {
            if (v && v.length > 2) {
                // If it's a base word (no suffix), or just store whatever we have
                // but prefer base words as source for others
                if (!k.includes('_')) {
                    globalTranscriptions[k] = v;
                } else {
                     // also store suffix words if they have transcription (for other levels)
                    const basePart = k.split('_')[0];
                    if (!globalTranscriptions[basePart]) {
                        globalTranscriptions[basePart] = v;
                    }
                }
            }
        });
    });
});

// 2. Iterate again to fill missing ones
levels.forEach(lvl => {
    if (!fs.existsSync(TSCR_DIR)) return;
    const files = fs.readdirSync(TSCR_DIR).filter(f => f.startsWith(lvl + '_'));
    files.forEach(file => {
        const filePath = path.join(TSCR_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const newData = { ...data };
        let changed = false;

        Object.keys(data).forEach(key => {
            if (!data[key] || data[key].length < 2) {
                const base = key.split('_')[0];
                if (globalTranscriptions[base]) {
                    newData[key] = globalTranscriptions[base];
                    changed = true;
                    totalRecovered++;
                } else if (globalTranscriptions[key]) {
                    // unexpected case: key is missing here but found in global map (other file)
                     newData[key] = globalTranscriptions[key];
                     changed = true;
                     totalRecovered++;
                }
            }
        });

        if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(newData, null, '\t') + '\n');
            console.log(`[${file}] Recovered transcriptions.`);
        }
    });
});

console.log(`✅ Done! Recovered ${totalRecovered} transcriptions.`);
