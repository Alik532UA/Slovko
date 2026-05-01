const fs = require('fs');
const path = require('path');

const transDir = 'src/lib/data/transcriptions/en/levels';
const topicsDir = 'src/lib/data/words/topics';
const levelsDir = 'src/lib/data/words/levels';

// 1. Collect ALL known IPA globally
const globalIpa = {};
const transFiles = fs.readdirSync(transDir);
transFiles.forEach(file => {
    try {
        const content = JSON.parse(fs.readFileSync(path.join(transDir, file), 'utf8').trim().replace(/^\uFEFF/, ''));
        Object.entries(content).forEach(([k, v]) => {
            if (v && v.length > 2) globalIpa[k] = v;
        });
    } catch (e) {}
});

console.log(`Collected ${Object.keys(globalIpa).length} unique IPA transcriptions.`);

// 2. Load word-to-topic mapping (NEW: Handles Arrays)
const wordToTopic = {};
const topicFiles = fs.readdirSync(topicsDir);
topicFiles.forEach(file => {
    const topicId = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(topicsDir, file), 'utf8').trim().replace(/^\uFEFF/, ''));
    
    // Support both formats: object { words: [] } or raw array []
    const words = Array.isArray(content) ? content : (content.words || []);
    
    words.forEach(w => {
        if (!wordToTopic[w]) wordToTopic[w] = [];
        wordToTopic[w].push(topicId);
    });
});

// 3. Load word-to-level mapping
const wordToLevel = {};
const levelFiles = fs.readdirSync(levelsDir);
levelFiles.forEach(file => {
    const levelId = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(levelsDir, file), 'utf8').trim().replace(/^\uFEFF/, ''));
    
    const words = Array.isArray(content.words) ? content.words : [];
    
    words.forEach(w => {
        wordToLevel[w] = levelId;
    });
});

// 4. Function to get IPA (with semantic fallback)
function getIpa(key) {
    if (globalIpa[key]) return globalIpa[key];
    const base = key.split('_')[0];
    if (globalIpa[base]) return globalIpa[base];
    return null;
}

// 5. Update transcription files
let updatedCount = 0;
const targetFiles = {};

Object.keys(wordToLevel).forEach(word => {
    const level = wordToLevel[word];
    const topics = wordToTopic[word] || ['general'];
    
    topics.forEach(topic => {
        const fileName = `${level}_${topic}.json`;
        if (!targetFiles[fileName]) targetFiles[fileName] = new Set();
        targetFiles[fileName].add(word);
        
        Object.keys(globalIpa).forEach(ipaKey => {
            if (ipaKey.startsWith(word + '_')) {
                targetFiles[fileName].add(ipaKey);
            }
        });
    });
});

Object.entries(targetFiles).forEach(([fileName, words]) => {
    const filePath = path.join(transDir, fileName);
    let content = {};
    if (fs.existsSync(filePath)) {
        try {
            content = JSON.parse(fs.readFileSync(filePath, 'utf8').trim().replace(/^\uFEFF/, ''));
        } catch (e) {
            content = {};
        }
    }
    
    let changed = false;
    words.forEach(word => {
        if (!content[word]) {
            const ipa = getIpa(word);
            if (ipa) {
                content[word] = ipa;
                changed = true;
                updatedCount++;
            }
        }
    });
    
    if (changed) {
        const sorted = {};
        Object.keys(content).sort().forEach(k => sorted[k] = content[k]);
        fs.writeFileSync(filePath, JSON.stringify(sorted, null, '\t') + '\n', 'utf8');
    }
});

console.log(`Successfully recovered ${updatedCount} IPA transcriptions.`);
