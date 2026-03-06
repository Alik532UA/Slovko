import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_DIR = path.join(ROOT_DIR, 'src/lib/data/words/levels');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');

/**
 * Читає JSON файл, видаляючи BOM
 */
function readJson(filePath) {
    const rawBuffer = fs.readFileSync(filePath);
    let content;
    
    // Check for UTF-8 BOM manually via buffer
    if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
        content = rawBuffer.slice(3).toString('utf8');
    } else {
        content = rawBuffer.toString('utf8');
    }
    
    // Final safety strip and trim
    content = content.replace(/^\uFEFF/, '').trim();
    
    try {
        return JSON.parse(content);
    } catch (e) {
        console.error(`Failed to parse JSON: ${filePath}`);
        throw e;
    }
}

function auditTranscriptions() {
    console.log('🎤 Запуск глибокого аудиту транскрипцій (EN)...\n');
    
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    let totalMissing = 0;

    for (const level of levels) {
        const masterPath = path.join(MASTER_DIR, `${level}.json`);
        if (!fs.existsSync(masterPath)) continue;

        const masterData = readJson(masterPath);
        const masterKeys = masterData.words;

        // Збираємо всі транскрипції з усіх модулів рівня
        const subFiles = fs.readdirSync(TRANS_DIR).filter(f => f.startsWith(`${level}_`));
        const transcriptionMap = {};

        for (const file of subFiles) {
            const content = readJson(path.join(TRANS_DIR, file));
            Object.assign(transcriptionMap, content);
        }

        const missing = masterKeys.filter(k => !transcriptionMap[k]);

        if (missing.length > 0) {
            console.log(`❌ [${level}] Відсутні транскрипції: ${missing.length}`);
            missing.forEach(k => console.log(`   - ${k}`));
            totalMissing += missing.length;
        } else {
            console.log(`✅ [${level}] OK`);
        }
    }

    if (totalMissing === 0) {
        console.log('\n✨ Всі слова мають транскрипції!');
    } else {
        console.log(`\n⚠️ Всього знайдено ${totalMissing} пропусків.`);
        process.exit(1);
    }
}

auditTranscriptions();
