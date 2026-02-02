import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLATIONS_DIR = path.resolve(__dirname, '../../src/lib/i18n/translations');

function getDeepKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((res, el) => {
        if (Array.isArray(obj[el])) {
            return res;
        } else if (typeof obj[el] === 'object' && obj[el] !== null) {
            return [...res, ...getDeepKeys(obj[el], prefix + el + '.')];
        }
        return [...res, prefix + el];
    }, []);
}

function checkTranslations() {
    const files = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));
    const data = {};
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf8');
        data[file] = JSON.parse(content);
    });

    const enKeys = getDeepKeys(data['en.json']);
    let hasErrors = false;

    console.log(`--- Translation Check (Reference: en.json, ${enKeys.length} keys) ---`);

    files.forEach(file => {
        if (file === 'en.json') return;

        const currentKeys = getDeepKeys(data[file]);
        const missing = enKeys.filter(k => !currentKeys.includes(k));
        const extra = currentKeys.filter(k => !enKeys.includes(k));

        if (missing.length > 0 || extra.length > 0) {
            hasErrors = true;
            console.log(`
[${file}]:`);
            if (missing.length > 0) {
                console.log(`  Missing keys (${missing.length}):`);
                missing.forEach(k => console.log(`    - ${k}`));
            }
            if (extra.length > 0) {
                console.log(`  Extra keys (${extra.length}) [Consider removing]:`);
                extra.forEach(k => console.log(`    - ${k}`));
            }
        } else {
            console.log(`[${file}]: OK`);
        }
    });

    if (hasErrors) {
        process.exit(1);
    } else {
        console.log('\nAll translations are synchronized!');
    }
}

checkTranslations();
