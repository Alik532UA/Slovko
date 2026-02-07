import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TOPICS_DIR = path.join(ROOT_DIR, 'src/lib/data/words/topics');
const TRANSLATIONS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

const topicMap = {};
const topics = fs.readdirSync(TOPICS_DIR).filter(f => f.endsWith('.json'));

for (const topicFile of topics) {
    const topicName = topicFile.replace('.json', '');
    const keys = JSON.parse(fs.readFileSync(path.join(TOPICS_DIR, topicFile), 'utf8'));
    for (const key of keys) {
        if (!topicMap[key]) topicMap[key] = [];
        topicMap[key].push(topicName);
    }
}

function splitLevel(lang, level) {
    const levelsDir = path.join(TRANSLATIONS_DIR, lang, 'levels');
    if (!fs.existsSync(levelsDir)) return;

    const filePath = path.join(levelsDir, `${level}.json`);
    if (!fs.existsSync(filePath)) return;

    console.log(`📦 Processing ${lang}/${level}...`);
    const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const splitData = { general: {} };
    
    let originalCount = Object.keys(originalData).length;
    let distributedCount = 0;

    for (const [key, value] of Object.entries(originalData)) {
        const targetTopics = topicMap[key];
        
        if (targetTopics && targetTopics.length > 0) {
            const topic = targetTopics[0]; 
            if (!splitData[topic]) splitData[topic] = {};
            splitData[topic][key] = value;
        } else {
            splitData.general[key] = value;
        }
    }

    for (const [topic, data] of Object.entries(splitData)) {
        if (Object.keys(data).length === 0) continue;
        
        const newFileName = `${level}_${topic}.json`;
        const newPath = path.join(levelsDir, newFileName);
        fs.writeFileSync(newPath, JSON.stringify(data, null, '\t') + '\n', 'utf8');
        distributedCount += Object.keys(data).length;
    }

    if (originalCount !== distributedCount) {
        console.error(`❌ Error for ${lang}/${level}: original ${originalCount}, new ${distributedCount}`);
    } else {
        console.log(`✅ Success ${lang}/${level}. Total words: ${distributedCount}`);
    }
}

const langs = fs.readdirSync(TRANSLATIONS_DIR);
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

for (const lang of langs) {
    for (const level of levels) {
        splitLevel(lang, level);
    }
}

console.log('\n🚀 Done!');