const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../src/lib/data');
const keysToRemove = ['qualify_gain', 'qualify_meet'];

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
                content = content.replace(/^\uFEFF/, ''); // strip BOM
                const data = JSON.parse(content);
                let modified = false;

                if (Array.isArray(data)) {
                    const initialLength = data.length;
                    const newData = data.filter(w => !keysToRemove.includes(w));
                    if (newData.length !== initialLength) {
                        modified = true;
                        // We must update the array in place or re-assign
                        data.length = 0;
                        data.push(...newData);
                    }
                } else if (data.words && Array.isArray(data.words)) {
                    // For levels/A2.json etc
                    const initialLength = data.words.length;
                    data.words = data.words.filter(w => !keysToRemove.includes(w));
                    if (data.words.length !== initialLength) modified = true;
                } else {
                    // For translations and transcriptions
                    for (const key of keysToRemove) {
                        if (data[key]) {
                            delete data[key];
                            modified = true;
                        }
                    }
                    if (data.labels) {
                        for (const key of keysToRemove) {
                            if (data.labels[key]) {
                                delete data.labels[key];
                                modified = true;
                            }
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

processDirectory(targetDir);
console.log("Done.");
