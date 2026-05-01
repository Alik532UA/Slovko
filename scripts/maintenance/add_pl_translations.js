import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_DIR = path.join(ROOT_DIR, 'src/lib/data/words/levels');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const rawBuffer = fs.readFileSync(filePath);
    let content;
    if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
        content = rawBuffer.slice(3).toString('utf8');
    } else {
        content = rawBuffer.toString('utf8');
    }
    try {
        return JSON.parse(content.replace(/^\uFEFF/, '').trim());
    } catch (e) {
        return {};
    }
}

function writeJson(filePath, data) {
    const content = JSON.stringify(data, null, 4);
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const buffer = Buffer.concat([bom, Buffer.from(content, 'utf8')]);
    fs.writeFileSync(filePath, buffer);
}

async function start() {
    console.log('📝 CLI для ручного додавання перекладів (PL)');
    console.log('Введіть переклад, "s" щоб пропустити, "q" для виходу.\n');

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const targetLang = 'pl';
    const sourceLangs = ['uk', 'en'];

    // 1. Побудова карти ключів (де яке слово лежить в UK)
    const keyToFileMap = new Map();
    const referenceTranslations = { uk: {}, en: {} };

    for (const lang of ['uk', 'en']) {
        const langDir = path.join(TRANS_DIR, lang, 'levels');
        if (!fs.existsSync(langDir)) continue;
        const files = fs.readdirSync(langDir);
        for (const file of files) {
            const data = readJson(path.join(langDir, file));
            for (const [key, val] of Object.entries(data)) {
                referenceTranslations[lang][key] = val;
                if (lang === 'uk') keyToFileMap.set(key, file);
            }
        }
    }

    for (const level of levels) {
        const masterPath = path.join(MASTER_DIR, `${level}.json`);
        if (!fs.existsSync(masterPath)) continue;

        const masterData = readJson(masterPath);
        const masterKeys = masterData.words;

        // Завантажуємо поточні переклади PL для цього рівня
        const plTranslations = {};
        const plFiles = {}; // fileName -> data

        for (const lang of [targetLang]) {
            const langDir = path.join(TRANS_DIR, lang, 'levels');
            if (!fs.existsSync(langDir)) continue;
            const files = fs.readdirSync(langDir).filter(f => f.startsWith(`${level}_`));
            for (const file of files) {
                const data = readJson(path.join(langDir, file));
                plFiles[file] = data;
                for (const [key, val] of Object.entries(data)) {
                    plTranslations[key] = val;
                }
            }
        }

        const missing = masterKeys.filter(k => !plTranslations[k]);

        if (missing.length === 0) {
            console.log(`✅ Рівень ${level} повністю перекладений.`);
            continue;
        }

        console.log(`\n--- Рівень ${level}: ${missing.length} відсутніх слів ---`);

        for (const key of missing) {
            const uk = referenceTranslations.uk[key] || '---';
            const en = referenceTranslations.en[key] || '---';
            
            const input = await question(`[${key}]\n   UK: ${uk}\n   EN: ${en}\n   PL: `);

            if (input.toLowerCase() === 'q') {
                rl.close();
                return;
            }

            if (input.toLowerCase() === 's' || input.trim() === '') {
                console.log('   (пропущено)');
                continue;
            }

            // Визначаємо файл для збереження
            let fileName = keyToFileMap.get(key);
            if (!fileName) {
                // Якщо в UK немає (дивно), кладемо в general
                fileName = `${level}_general.json`;
            }

            const filePath = path.join(TRANS_DIR, targetLang, 'levels', fileName);
            const fileData = plFiles[fileName] || readJson(filePath);
            
            fileData[key] = input.trim();
            plFiles[fileName] = fileData;
            
            writeJson(filePath, fileData);
            console.log(`   ✅ Збережено в ${fileName}`);
        }
    }

    console.log('\n✨ Всі доступні слова оброблені!');
    rl.close();
}

start();
