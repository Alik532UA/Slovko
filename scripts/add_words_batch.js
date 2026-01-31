
import fs from 'fs';
import path from 'path';

const LANGUAGES = ['uk', 'en', 'de', 'nl', 'crh'];

/**
 * batch: Array of { 
 *   key: string, 
 *   level: string, (e.g. 'A2')
 *   translations: { uk, en, de, nl, crh },
 *   transcription: string,
 *   topics: string[] (optional)
 * }
 */
export function addWordsBatch(batch) {
    batch.forEach(item => {
        // 1. Update words/levels
        const levelPath = `src/lib/data/words/levels/${item.level}.json`;
        const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
        if (!levelData.words.includes(item.key)) {
            levelData.words.push(item.key);
            fs.writeFileSync(levelPath, JSON.stringify(levelData, null, 4));
        }

        // 2. Update words/topics
        if (item.topics) {
            item.topics.forEach(topic => {
                const topicPath = `src/lib/data/words/topics/${topic}.json`;
                if (fs.existsSync(topicPath)) {
                    const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
                    if (!topicData.words.includes(item.key)) {
                        topicData.words.push(item.key);
                        fs.writeFileSync(topicPath, JSON.stringify(topicData, null, 4));
                    }
                }
            });
        }

        // 3. Update translations
        LANGUAGES.forEach(lang => {
            const transPath = `src/lib/data/translations/${lang}/levels/${item.level}.json`;
            const transData = JSON.parse(fs.readFileSync(transPath, 'utf8'));
            transData[item.key] = item.translations[lang];
            fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));

            if (item.topics) {
                item.topics.forEach(topic => {
                    const topicTransPath = `src/lib/data/translations/${lang}/topics/${topic}.json`;
                    if (fs.existsSync(topicTransPath)) {
                        const topicTransData = JSON.parse(fs.readFileSync(topicTransPath, 'utf8'));
                        topicTransData[item.key] = item.translations[lang];
                        fs.writeFileSync(topicTransPath, JSON.stringify(topicTransData, null, 4));
                    }
                });
            }
        });

        // 4. Update transcriptions
        const transcPath = `src/lib/data/transcriptions/levels/${item.level}.json`;
        const transcData = JSON.parse(fs.readFileSync(transcPath, 'utf8'));
        transcData[item.key] = item.transcription;
        fs.writeFileSync(transcPath, JSON.stringify(transcData, null, 4));

        if (item.topics) {
            item.topics.forEach(topic => {
                const topicTranscPath = `src/lib/data/transcriptions/topics/${topic}.json`;
                if (fs.existsSync(topicTranscPath)) {
                    const topicTranscData = JSON.parse(fs.readFileSync(topicTranscPath, 'utf8'));
                    topicTranscData[item.key] = item.transcription;
                    fs.writeFileSync(topicTranscPath, JSON.stringify(topicTranscData, null, 4));
                }
            });
        }
    });
}
