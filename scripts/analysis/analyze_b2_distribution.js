import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_B2 = path.join(ROOT_DIR, 'src/lib/data/words/levels/B2.json');
const TRANS_EN_DIR = path.join(ROOT_DIR, 'src/lib/data/translations/en/levels');

async function analyzeB2() {
    const b2Data = JSON.parse(fs.readFileSync(MASTER_B2, 'utf8'));
    const allWords = new Set(b2Data.words);
    console.log(`Total words in B2 Master List: ${allWords.size}`);

    const files = fs.readdirSync(TRANS_EN_DIR).filter(f => f.startsWith('B2_'));
    const distributedWords = new Set();
    const distribution = {};

    for (const file of files) {
        const filePath = path.join(TRANS_EN_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keys = Object.keys(data);
        distribution[file] = keys.length;
        keys.forEach(k => distributedWords.add(k));
    }

    console.log('\nDistribution in existing B2 modules (EN):');
    Object.entries(distribution).sort((a, b) => b[1] - a[1]).forEach(([file, count]) => {
        console.log(`${file}: ${count} words`);
    });

    const missing = [...allWords].filter(w => !distributedWords.has(w));
    console.log(`\nWords in Master List but NOT in any B2 translation module: ${missing.length}`);
    
    if (missing.length > 0) {
        console.log('First 20 missing words:', missing.slice(0, 20).join(', '));
    }

    const extra = [...distributedWords].filter(w => !allWords.has(w));
    console.log(`\nWords in translation modules but NOT in B2 Master List: ${extra.length}`);
    if (extra.length > 0) {
        console.log('First 20 extra words:', extra.slice(0, 20).join(', '));
    }
}

analyzeB2();
