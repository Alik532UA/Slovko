import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'src/lib/data');
const translationsDir = path.join(dataDir, 'translations');
const levelsDir = path.join(dataDir, 'words/levels');
const topicsDir = path.join(dataDir, 'words/topics');

const languages = ['uk', 'en', 'nl', 'crh'];

async function getJsonFiles(dir) {
    try {
        const files = await fs.readdir(dir);
        return files.filter(f => f.endsWith('.json'));
    } catch {
        return [];
    }
}

async function refine() {
    console.log('Starting refinement...');

    // 1. Load Word Lists
    const levelWords = {}; // id -> Set<word>
    const topicWords = {}; // id -> Set<word>

    // Load Levels
    const levelFiles = await getJsonFiles(levelsDir);
    for (const file of levelFiles) {
        const content = JSON.parse(await fs.readFile(path.join(levelsDir, file), 'utf-8'));
        levelWords[content.id] = new Set(content.words);
        console.log(`Loaded Level: ${content.id} (${content.words.length} words)`);
    }

    // Load Topics
    const topicFiles = await getJsonFiles(topicsDir);
    for (const file of topicFiles) {
        // topics usually have id inside content
        const content = JSON.parse(await fs.readFile(path.join(topicsDir, file), 'utf-8'));
        // Filename might be 'animals.json', id might be 'animals'
        const id = path.basename(file, '.json');
        topicWords[id] = new Set(content.words);
        console.log(`Loaded Topic: ${id} (${content.words.length} words)`);
    }

    // 2. Process Languages
    for (const lang of languages) {
        const langDir = path.join(translationsDir, lang);
        console.log(`\nProcessing Language: ${lang}`);

        try {
            await fs.access(langDir);
        } catch {
            console.warn(`Directory ${langDir} not found, skipping.`);
            continue;
        }

        // Gather all existing translations back into a single map
        const masterDictionary = {};
        const files = await getJsonFiles(langDir);

        for (const file of files) {
            const content = JSON.parse(await fs.readFile(path.join(langDir, file), 'utf-8'));
            Object.assign(masterDictionary, content);
        }
        console.log(`  Total words found: ${Object.keys(masterDictionary).length}`);

        // Prepare output directories
        const outLevelsDir = path.join(langDir, 'levels');
        const outTopicsDir = path.join(langDir, 'topics');
        await fs.mkdir(outLevelsDir, { recursive: true });
        await fs.mkdir(outTopicsDir, { recursive: true });

        // Distribute to Levels
        for (const [id, words] of Object.entries(levelWords)) {
            const levelData = {};
            let count = 0;
            for (const word of words) {
                if (masterDictionary[word]) {
                    levelData[word] = masterDictionary[word];
                    count++;
                }
            }
            if (count > 0) {
                await fs.writeFile(
                    path.join(outLevelsDir, `${id}.json`),
                    JSON.stringify(levelData, null, 4),
                    'utf-8'
                );
            }
        }

        // Distribute to Topics
        for (const [id, words] of Object.entries(topicWords)) {
            const topicData = {};
            let count = 0;
            for (const word of words) {
                if (masterDictionary[word]) {
                    topicData[word] = masterDictionary[word];
                    count++;
                }
            }
            if (count > 0) {
                await fs.writeFile(
                    path.join(outTopicsDir, `${id}.json`),
                    JSON.stringify(topicData, null, 4),
                    'utf-8'
                );
            }
        }

        // Remaining words (Common)
        const commonData = {};
        let commonCount = 0;

        const allLevelWords = new Set(Object.values(levelWords).flatMap(s => [...s]));
        const allTopicWords = new Set(Object.values(topicWords).flatMap(s => [...s]));

        for (const [word, translation] of Object.entries(masterDictionary)) {
            const inLevel = allLevelWords.has(word);
            const inTopic = allTopicWords.has(word);

            if (!inLevel && !inTopic) {
                commonData[word] = translation;
                commonCount++;
            }
        }

        await fs.writeFile(
            path.join(langDir, 'common.json'),
            JSON.stringify(commonData, null, 4),
            'utf-8'
        );
        console.log(`  Saved common.json (${commonCount} words)`);

        // Cleanup: delete loose json files in langDir (except common.json which we just wrote)
        // Wait, I just wrote common.json. 
        // The previous files were A1.json, A2.json, etc in langDir.
        // I should remove them.
        for (const file of files) {
            if (file !== 'common.json') {
                await fs.unlink(path.join(langDir, file));
            }
        }
        console.log(`  Cleaned up old files in ${langDir}`);
    }

    console.log('\nRefinement complete.');
}

refine().catch(console.error);
