import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

function getCategory(word) {
    const cleanKey = word.split('_')[0]; // Беремо базу ключа без суфікса
    if (word.endsWith('ly')) return 'adverbs';
    const commonVerbs = ['analyze', 'assess', 'assume', 'avoid', 'behave', 'apply', 'appoint', 'arise', 'arrange', 'arrest', 'assist', 'claim', 'complete', 'contain', 'deliver', 'depend', 'exist', 'improve', 'include', 'manage', 'prepare', 'provide', 'reduce', 'remain', 'remove', 'report', 'require', 'return', 'serve', 'suggest', 'support', 'trust'];
    if (word.endsWith('ize') || word.endsWith('ise') || word.endsWith('ate') || word.endsWith('ify') || commonVerbs.includes(cleanKey)) {
        return 'verbs';
    }
    if (word.endsWith('able') || word.endsWith('ible') || word.endsWith('ous') || word.endsWith('ive') || word.endsWith('ic') || word.endsWith('al') || word.endsWith('ful') || word.endsWith('less') || word.endsWith('ent') || word.endsWith('ant')) {
        return 'adjectives';
    }
    return 'nouns';
}

function processLevel(level) {
    const langs = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());
    for (const lang of langs) {
        const generalPath = path.join(TRANS_DIR, lang, 'levels', `${level}_general.json`);
        if (!fs.existsSync(generalPath)) continue;
        console.log(`📦 Categorizing ${lang}/${level}_general...`);
        const data = JSON.parse(fs.readFileSync(generalPath, 'utf8'));
        const split = { verbs: {}, adjectives: {}, adverbs: {}, nouns: {} };
        for (const [key, value] of Object.entries(data)) {
            const cat = getCategory(key);
            split[cat][key] = value;
        }
        for (const [cat, items] of Object.entries(split)) {
            if (Object.keys(items).length === 0) continue;
            const newPath = path.join(TRANS_DIR, lang, 'levels', `${level}_${cat}.json`);
            let existing = {};
            if (fs.existsSync(newPath)) existing = JSON.parse(fs.readFileSync(newPath, 'utf8'));
            Object.assign(existing, items);
            fs.writeFileSync(newPath, JSON.stringify(existing, null, '\t') + '\n', 'utf8');
        }
        fs.unlinkSync(generalPath);
    }
}

function processTranscriptions(level) {
    const transDir = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');
    const generalPath = path.join(transDir, `${level}_general.json`);
    if (!fs.existsSync(generalPath)) return;
    console.log(`🎤 Categorizing transcriptions for ${level}_general...`);
    const data = JSON.parse(fs.readFileSync(generalPath, 'utf8'));
    const split = { verbs: {}, adjectives: {}, adverbs: {}, nouns: {} };
    for (const [key, value] of Object.entries(data)) {
        const cat = getCategory(key);
        split[cat][key] = value;
    }
    for (const [cat, items] of Object.entries(split)) {
        if (Object.keys(items).length === 0) continue;
        const newPath = path.join(transDir, `${level}_${cat}.json`);
        let existing = {};
        if (fs.existsSync(newPath)) existing = JSON.parse(fs.readFileSync(newPath, 'utf8'));
        Object.assign(existing, items);
        fs.writeFileSync(newPath, JSON.stringify(existing, null, '\t') + '\n', 'utf8');
    }
    fs.unlinkSync(generalPath);
}

['B1', 'B2'].forEach(lvl => {
    processLevel(lvl);
    processTranscriptions(lvl);
});
console.log('\n🚀 Done!');