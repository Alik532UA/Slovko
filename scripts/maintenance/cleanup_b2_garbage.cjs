const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../src/lib/data');

const keysToDelete = [
    'I_pronoun', 'actual_fact', 'advocate_noun', 'bank_river', 'bear_bear', 
    'drive_verb', 'fireplace_kamin', 'fireplace_ocaq', 'gas_gas', 'gas_gaz', 
    'holiday_1', 'holiday_tatil', 'like_verb', 'live_verb', 'no_negation', 
    'pasta_pasta', 'pot_pot', 'than_conjunction', 'too_adverb', 'towel_havl', 
    'towel_towel', 'until_conjunction', 'while_conjunction'
];

const keyRenames = {
    'wage_hourly': 'wage'
};

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
                    const initialLength = data.length;
                    // Delete keys
                    const newData = data.filter(w => !keysToDelete.includes(w));
                    // Rename keys
                    for (let i = 0; i < newData.length; i++) {
                        if (keyRenames[newData[i]]) {
                            newData[i] = keyRenames[newData[i]];
                        }
                    }
                    // Remove duplicates just in case
                    const uniqueData = [...new Set(newData)];
                    
                    if (uniqueData.length !== initialLength || JSON.stringify(uniqueData) !== JSON.stringify(data)) {
                        modified = true;
                        data.length = 0;
                        data.push(...uniqueData);
                    }
                } else if (data.words && Array.isArray(data.words)) {
                    // For levels/A2.json etc
                    const initialLength = data.words.length;
                    // Delete keys
                    let newWords = data.words.filter(w => !keysToDelete.includes(w));
                    // Rename keys
                    newWords = newWords.map(w => keyRenames[w] || w);
                    
                    if (JSON.stringify(newWords) !== JSON.stringify(data.words)) {
                        modified = true;
                        data.words = newWords;
                    }
                } else {
                    // For translations and transcriptions
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

                    // Handle renames
                    for (const [oldKey, newKey] of Object.entries(keyRenames)) {
                        if (data[oldKey]) {
                            data[newKey] = data[oldKey];
                            delete data[oldKey];
                            modified = true;
                        }
                        if (data.labels && data.labels[oldKey]) {
                            data.labels[newKey] = data.labels[oldKey];
                            delete data.labels[oldKey];
                            modified = true;
                        }
                    }
                }

                if (modified) {
                    fs.writeFileSync(fullPath, JSON.stringify(data, null, '\t') + '\n', 'utf8');
                    console.log(`Updated ${fullPath}`);
                }
            } catch (e) {
                console.error(`Error processing ${fullPath}:`, e);
            }
        }
    }
}

processDirectory(dataDir);
console.log("Cleanup and rename complete.");
