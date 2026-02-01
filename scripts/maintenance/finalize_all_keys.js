import fs from 'fs';
import path from 'path';

const baseDir = 'src/lib/data/translations';
const languages = ['en', 'uk', 'crh', 'nl', 'de'];
const mapping = JSON.parse(fs.readFileSync('polysemy_migration.json', 'utf8'));
const newMapping = {};

function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scan(fullPath);
        } else if (item.endsWith('.json')) {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const lang = fullPath.includes('uk') ? 'uk' : (fullPath.includes('en') ? 'en' : 'other');
            
            for (const [key, value] of Object.entries(content)) {
                if (key.match(/_\d+$/) && !mapping[key]) {
                    const enBase = key.replace(/_\d+$/, '');
                    // Якщо у нас вже є запис для цього ключа в newMapping, ігноруємо
                    if (newMapping[key]) continue;

                    // Намагаємося придумати назву. Якщо це український файл, використовуємо значення.
                    // Якщо ні, просто залишаємо як є для ручної правки пізніше.
                    newMapping[key] = { value, enBase };
                }
            }
        }
    }
}

languages.forEach(lang => {
    const langDir = path.join(baseDir, lang);
    if (fs.existsSync(langDir)) scan(langDir);
});

// Додаємо нові ключі до мапи
for (const [key, data] of Object.entries(newMapping)) {
    const suffix = data.value.toLowerCase().replace(/[^\w\s]/g, '').split(' ').slice(0, 2).join('_');
    mapping[key] = `${data.enBase}_${suffix || key.split('_').pop()}`;
}

fs.writeFileSync('polysemy_migration.json', JSON.stringify(mapping, null, 4));
console.log('Final polysemy map updated.');
