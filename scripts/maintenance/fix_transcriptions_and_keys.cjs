const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../src/lib/data');
const wordsDir = path.join(dataDir, 'words/levels');
const semanticsFile = path.join(dataDir, 'semantics.ts');

// 1. Gather all valid keys from master word lists
const validMasterKeys = new Set();
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
for (const lvl of levels) {
    const file = path.join(wordsDir, `${lvl}.json`);
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(content);
        if (data.words) {
            data.words.forEach(w => validMasterKeys.add(w));
        }
    }
}

// 2. Gather all valid semantics keys
const semanticsContent = fs.readFileSync(semanticsFile, 'utf8');
const semanticsRegex = /specific:\s*\[([^\]]+)\]/g;
let match;
while ((match = semanticsRegex.exec(semanticsContent)) !== null) {
    const keysStr = match[1];
    const keys = keysStr.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    keys.forEach(k => validMasterKeys.add(k));
}

// 3. List of missing transcriptions from the audit
const missingTranscriptions = [
    "advert", "advertising", "alright", "as_well", "athlete", "bad_luck", "bake", "balloon", "baseball", "based", "basket", "basketball", "bean", "beard", "behaviour", "billion", "bin", "biology", "blog", "blonde", "builder", "businessman", "buyer", "cabinet", "camping", "candle", "careless", "cartoon", "celebration", "cell", "channel", "chat", "chemist", "chest", "chief", "cigarette", "clerk", "clinic", "closely", "cloth", "clothing", "coal", "colorful", "column", "comedy", "complaint", "towel",
    "collision", "wage_hourly",
    "I_pronoun", "actual_fact", "adequate", "adopt", "advance", "advocate_noun", "bank_river", "bear_bear", "drive_verb", "famine", "fireplace_kamin", "fireplace_ocaq", "gas_gas", "gas_gaz", "good_morning", "holiday_1", "holiday_tatil", "like_verb", "live_verb", "no_negation", "pasta", "pasta_pasta", "pot_pot", "than_conjunction", "too_adverb", "towel_havl", "towel_towel", "until_conjunction", "while_conjunction",
    "accustomed", "emission"
];

// Determine which to delete and which to add transcriptions for
const keysToDelete = [];
const keysNeedsTranscription = [];

for (const key of missingTranscriptions) {
    if (validMasterKeys.has(key)) {
        keysNeedsTranscription.push(key);
    } else {
        keysToDelete.push(key);
    }
}

console.log("Keys to DELETE (invalid):", keysToDelete);
console.log("Keys to TRANSCRIBE (valid):", keysNeedsTranscription);

// 4. Delete invalid keys from all translation and transcription files
function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.json')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                content = content.replace(/^\uFEFF/, '');
                const data = JSON.parse(content);
                let modified = false;

                if (Array.isArray(data)) {
                    // Ignore, these are not key-value maps
                } else if (!data.words && !data.id) { // Only translation/transcription files
                    for (const key of keysToDelete) {
                        if (data[key]) {
                            delete data[key];
                            modified = true;
                        }
                    }
                    if (data.labels) {
                        for (const key of keysToDelete) {
                            if (data.labels[key]) {
                                delete data.labels[key];
                                modified = true;
                            }
                        }
                    }
                }

                if (modified) {
                    fs.writeFileSync(fullPath, JSON.stringify(data, null, '\t') + '\n', 'utf8');
                }
            } catch (e) {
                console.error(`Error processing ${fullPath}:`, e);
            }
        }
    }
}

processDirectory(path.join(dataDir, 'translations'));
processDirectory(path.join(dataDir, 'transcriptions'));
console.log("Cleanup of invalid keys complete.");

// 5. Output a script to fetch transcriptions via an API or just log them so I can add them manually
// I will output a simple JSON file with keys needed so the AI can fill them in
fs.writeFileSync('needs_transcription.json', JSON.stringify(keysNeedsTranscription, null, 2));

