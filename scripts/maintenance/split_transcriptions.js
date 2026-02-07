import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TOPICS_DIR = path.join(ROOT_DIR, 'src/lib/data/words/topics');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');

// 1. Завантажуємо карту топіків
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

function splitTranscriptions(level) {
    const filePath = path.join(TRANS_DIR, `${level}.json`);
    if (!fs.existsSync(filePath)) return;

    console.log(`📦 Розбиття транскрипцій для ${level}...`);
    const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const splitData = { general: {} };
    
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
        fs.writeFileSync(path.join(TRANS_DIR, newFileName), JSON.stringify(data, null, '\t') + '\n', 'utf8');
    }

    // Видаляємо старий монолітний файл
    fs.unlinkSync(filePath);
    console.log(`✅ ${level} розбито.`);
}

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
levels.forEach(splitTranscriptions);

console.log('\n🚀 Рефакторинг транскрипцій завершено!');
