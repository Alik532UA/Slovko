import fs from 'fs';
import path from 'path';

const oxfordDir = '.private/The Oxford by CEFR level';
const myWordsDir = 'src/lib/data/words/levels';

const posRegex = /\s+(v\.|n\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|number|indefinite article|modal v\.|exclamation|auxiliary v\.)/;

const oxfordLevels = {
    A1: ['.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A1.txt'],
    A2: ['.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A2.txt'],
    B1: ['.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B1.txt'],
    B2: [
        '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B2.txt',
        '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/B2.txt'
    ],
    C1: ['.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/C1.txt']
};

const oxfordWords = {}; // Level -> Set of words
const allOxfordWords = new Set();
const wordToOxfordLevel = {};

for (const [level, files] of Object.entries(oxfordLevels)) {
    oxfordWords[level] = new Set();
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.error(`Oxford file missing: ${file}`);
            continue;
        }
        let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        for (let line of lines) {
            line = line.trim();
            if (!line || line.includes('Oxford') || line === level) continue;
            
            let wordPart = line;
            const match = line.match(posRegex);
            if (match) {
                wordPart = line.substring(0, match.index);
            } else {
                // If POS not found, try taking the first word
                wordPart = line.split(' ')[0];
            }
            
            // Handle "a, an"
            const words = wordPart.split(',').map(w => w.trim().toLowerCase());
            for (let w of words) {
                w = w.replace(/\s+/g, '_'); // replace spaces with underscores like in our system
                if (w) {
                    oxfordWords[level].add(w);
                    allOxfordWords.add(w);
                    if (!wordToOxfordLevel[w]) {
                        wordToOxfordLevel[w] = level; // Store the first (lowest) level found
                    }
                }
            }
        }
    }
}

// Read our words
const myWords = {};
const allMyWords = new Set();
const wordToMyLevel = {};

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
for (const level of levels) {
    const file = path.join(myWordsDir, `${level}.json`);
    myWords[level] = new Set();
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
        const data = JSON.parse(content);
        const wordsArray = data.words || data;
        
        for (const w of wordsArray) {
            const cleanW = w.split('_')[0]; // Remove suffixes like _verb, _noun
            myWords[level].add(cleanW);
            allMyWords.add(cleanW);
            if (!wordToMyLevel[cleanW]) {
                wordToMyLevel[cleanW] = level;
            }
        }
    }
}

// 1. What percentage of these txt files are in my program?
let oxfordFoundInMyProgram = 0;
let oxfordNotFound = [];

for (const w of allOxfordWords) {
    if (allMyWords.has(w)) {
        oxfordFoundInMyProgram++;
    } else {
        oxfordNotFound.push(w);
    }
}
const coveragePercent = ((oxfordFoundInMyProgram / allOxfordWords.size) * 100).toFixed(2);

// 2. What percentage of these txt files are in the CORRECT levels in my program?
let correctLevelCount = 0;
let incorrectLevelDetails = [];

for (const w of allOxfordWords) {
    if (allMyWords.has(w)) {
        const oxLevel = wordToOxfordLevel[w];
        const myLevel = wordToMyLevel[w];
        if (oxLevel === myLevel) {
            correctLevelCount++;
        } else {
            incorrectLevelDetails.push({ word: w, oxLevel, myLevel });
        }
    }
}
const correctLevelPercent = ((correctLevelCount / oxfordFoundInMyProgram) * 100).toFixed(2);

let mdReport = `# Oxford CEFR Lists Analysis\n\n`;
mdReport += `## 1. Загальне покриття\n`;
mdReport += `- Слів у Oxford 3000/5000: **${allOxfordWords.size}**\n`;
mdReport += `- Знайдено у Slovko: **${oxfordFoundInMyProgram}**\n`;
mdReport += `- Відсоток покриття: **${coveragePercent}%**\n\n`;

mdReport += `## 2. Точність розподілу за рівнями\n`;
mdReport += `- Слів, знайдених у Slovko: **${oxfordFoundInMyProgram}**\n`;
mdReport += `- Збіг рівнів з Oxford: **${correctLevelCount}**\n`;
mdReport += `- Відсоток збігу рівнів: **${correctLevelPercent}%** (з тих, що є в програмі)\n\n`;

mdReport += `## 3. Детальна статистика по рівнях (Oxford)\n`;
for (const level of ['A1', 'A2', 'B1', 'B2', 'C1']) {
    let levelFound = 0;
    for (const w of oxfordWords[level]) {
        if (allMyWords.has(w)) levelFound++;
    }
    const perc = ((levelFound / oxfordWords[level].size) * 100).toFixed(2);
    mdReport += `- **${level}**: ${levelFound} / ${oxfordWords[level].size} (${perc}%)\n`;
}

mdReport += `\n## Випадкові 20 слів з незбігом рівня\n`;
mdReport += `| Слово | Рівень Oxford | Рівень Slovko |\n`;
mdReport += `|---|---|---|\n`;
for (let i = 0; i < Math.min(20, incorrectLevelDetails.length); i++) {
    const item = incorrectLevelDetails[i];
    mdReport += `| ${item.word} | ${item.oxLevel} | ${item.myLevel} |\n`;
}

fs.writeFileSync('.private/analysis_reports/2026-05-02_oxford_coverage_report.md', mdReport);
console.log('Report generated at .private/analysis_reports/2026-05-02_oxford_coverage_report.md');
