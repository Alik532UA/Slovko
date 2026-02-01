import fs from 'fs';
import path from 'path';

const baseDir = 'src/lib/data/translations/uk';
const mapping = {};

function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scan(fullPath);
        } else if (item.endsWith('.json')) {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            for (const [key, value] of Object.entries(content)) {
                if (key.match(/_\d+$/)) {
                    const enBase = key.replace(/_\d+$/, '');
                    mapping[key] = { uk: value, enBase: enBase };
                }
            }
        }
    }
}

scan(baseDir);
fs.writeFileSync('remaining_keys.json', JSON.stringify(mapping, null, 2), 'utf8');
console.log('Collected ' + Object.keys(mapping).length + ' keys.');