import fs from 'fs';
import path from 'path';

const phrasesDir = 'src/lib/data/translations/uk/phrases';
const files = fs.readdirSync(phrasesDir).filter(f => f.endsWith('.json'));

const allBad = [];

files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(phrasesDir, file), 'utf8'));
    Object.entries(content)
        .filter(([k]) => k.match(/_\d+$/))
        .forEach(([k, v]) => {
            allBad.push({ file, key: k, value: v });
        });
});

allBad.forEach(item => {
    console.log(`${item.file}: ${item.key} -> ${item.value}`);
});
