import fs from 'fs';

const keys = JSON.parse(fs.readFileSync('remaining_keys.json', 'utf8'));
const finalMapping = JSON.parse(fs.readFileSync('polysemy_migration.json', 'utf8'));

// Транслітерація або спрощення для ключів
function simplify(text) {
    return text.toLowerCase()
        .replace(/артикль \(визначений\)/g, 'definite')
        .replace(/артикль \(невизначений\)/g, 'indefinite')
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .slice(0, 2)
        .join('_');
}

for (const [key, data] of Object.entries(keys)) {
    if (finalMapping[key]) continue; // Пропускаємо вже існуючі

    let suffix = simplify(data.uk);
    if (!suffix || suffix === data.enBase) {
        // Якщо не вдалося згенерувати суфікс, використовуємо номер, але з префіксом
        suffix = key.split('_').pop(); 
    }
    
    finalMapping[key] = `${data.enBase}_${suffix}`;
}

fs.writeFileSync('polysemy_migration.json', JSON.stringify(finalMapping, null, 4));
console.log('Migration map updated with remaining keys.');
