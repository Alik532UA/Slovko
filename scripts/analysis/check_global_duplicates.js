import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations/en/levels');

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

function analyze() {
    console.log('--- GLOBAL DUPLICATE ANALYSIS (EN) ---');
    
    if (!fs.existsSync(TRANS_DIR)) {
        console.error('Directory not found:', TRANS_DIR);
        return;
    }

    const files = fs.readdirSync(TRANS_DIR).filter(f => f.endsWith('.json'));
    const keyMap = new Map();

    for (const file of files) {
        const filePath = path.join(TRANS_DIR, file);
        const data = readJson(filePath);
        
        Object.keys(data).forEach(key => {
            if (!keyMap.has(key)) {
                keyMap.set(key, []);
            }
            keyMap.get(key).push(file);
        });
    }

    let duplicateCount = 0;
    const sortedKeys = Array.from(keyMap.keys()).sort();

    console.log('Count | Key | Files');
    console.log('-------------------');

    for (const key of sortedKeys) {
        const occurrences = keyMap.get(key);
        if (occurrences.length > 1) {
            duplicateCount++;
            const countStr = String(occurrences.length).padEnd(5, ' ');
            const keyStr = key.padEnd(25, ' ');
            console.log(`${countStr} | ${keyStr} | ${occurrences.join(', ')}`);
        }
    }

    console.log('\nTotal unique duplicate keys found:', duplicateCount);

    /*
     * Код виходу, а не лише рядок у виводі.
     *
     * `05_Validation_Pipeline.md` подає цей скрипт як обов'язковий перед комітом
     * і наказує AI-агентові запускати його після кожної зміни даних. Доки він
     * завжди виходив із нулем, «запустив» і «перевірив» були різними речами:
     * дублікати друкувалися в лог і не зупиняли нічого, а зелений код виходу
     * ішов у звіт як доказ (AI-AGENT-PITFALLS-v8 § 1.2 — успіх це код виходу,
     * а не слово у виводі).
     */
    if (duplicateCount > 0) {
        console.error(
            `Порушено SSoT: ${duplicateCount} ключів зустрічаються більш ніж на одному рівні.`
        );
        process.exitCode = 1;
    }
}

analyze();