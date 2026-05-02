const fs = require('fs');
const path = require('path');
const fileToFix = process.argv[2];
const lang = process.argv[3];

const duplicatesPath = path.join(__dirname, '../../.temp/duplicates_to_remove.json');
const duplicatesToRemove = JSON.parse(fs.readFileSync(duplicatesPath, 'utf8'));

const basename = path.basename(fileToFix);
const keysToRemove = duplicatesToRemove[basename] || [];

const contentStr = fs.readFileSync(fileToFix, 'utf8');
const hasBOM = contentStr.charCodeAt(0) === 0xFEFF;
const content = JSON.parse(hasBOM ? contentStr.slice(1) : contentStr);

for (const key of keysToRemove) {
    delete content[key];
}

const newJson = JSON.stringify(content, null, '\t') + '\n';
console.log(newJson);
