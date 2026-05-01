import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

function stripBOM(content) {
    return content.replace(/^\uFEFF/, '').trim();
}

function formatKeyToLabel(key) {
    return key
        .replace(/_\d+$/, "") 
        .replace(/_(noun|verb|adj|adv|adjective|adverb)$/, "") 
        .replace(/_/g, " "); 
}

const translationsDir = path.join(PROJECT_ROOT, 'src/lib/data/translations');
const transcriptionsDir = path.join(PROJECT_ROOT, 'src/lib/data/transcriptions/en/levels');

const levelsToFix = ['B2', 'C1', 'C2'];

levelsToFix.forEach(level => {
    const masterFile = path.join(PROJECT_ROOT, `src/lib/data/words/levels/${level}.json`);
    if (!fs.existsSync(masterFile)) return;
    
    const masterData = JSON.parse(stripBOM(fs.readFileSync(masterFile, 'utf-8')));
    const masterWords = masterData.words || masterData;
    
    // Fix translations for all languages
    const languages = fs.readdirSync(translationsDir).filter(f => fs.statSync(path.join(translationsDir, f)).isDirectory());
    
    languages.forEach(lang => {
        const langLevelsDir = path.join(translationsDir, lang, 'levels');
        if (!fs.existsSync(langLevelsDir)) return;
        
        const files = fs.readdirSync(langLevelsDir).filter(f => f.startsWith(`${level}_`) && f.endsWith('.json'));
        const allKeys = new Set();
        
        files.forEach(file => {
            const content = JSON.parse(stripBOM(fs.readFileSync(path.join(langLevelsDir, file), 'utf-8')));
            Object.keys(content).forEach(k => allKeys.add(k));
        });
        
        const missingWords = masterWords.filter(w => !allKeys.has(w));
        
        if (missingWords.length > 0) {
            const generalFile = path.join(langLevelsDir, `${level}_general.json`);
            let generalContent = {};
            if (fs.existsSync(generalFile)) {
                generalContent = JSON.parse(stripBOM(fs.readFileSync(generalFile, 'utf-8')));
            }
            
            missingWords.forEach(w => {
                generalContent[w] = formatKeyToLabel(w);
            });
            
            // Sort keys
            const sortedContent = Object.keys(generalContent).sort().reduce((acc, key) => {
                acc[key] = generalContent[key];
                return acc;
            }, {});

            fs.writeFileSync(generalFile, JSON.stringify(sortedContent, null, '\t') + '\n', 'utf-8');
            console.log(`[${lang}] Added ${missingWords.length} missing translations to ${level}_general.json`);
        }
    });

    // Fix transcriptions (EN only)
    if (fs.existsSync(transcriptionsDir)) {
        const transFiles = fs.readdirSync(transcriptionsDir).filter(f => f.startsWith(`${level}_`) && f.endsWith('.json'));
        const allTransKeys = new Set();
        
        transFiles.forEach(file => {
            const content = JSON.parse(stripBOM(fs.readFileSync(path.join(transcriptionsDir, file), 'utf-8')));
            Object.keys(content).forEach(k => allTransKeys.add(k));
        });
        
        const missingTransWords = masterWords.filter(w => !allTransKeys.has(w));
        
        if (missingTransWords.length > 0) {
            const generalTransFile = path.join(transcriptionsDir, `${level}_general.json`);
            let generalTransContent = {};
            if (fs.existsSync(generalTransFile)) {
                generalTransContent = JSON.parse(stripBOM(fs.readFileSync(generalTransFile, 'utf-8')));
            }
            
            missingTransWords.forEach(w => {
                generalTransContent[w] = ""; // empty transcription
            });
            
            const sortedTransContent = Object.keys(generalTransContent).sort().reduce((acc, key) => {
                acc[key] = generalTransContent[key];
                return acc;
            }, {});

            fs.writeFileSync(generalTransFile, JSON.stringify(sortedTransContent, null, '\t') + '\n', 'utf-8');
            console.log(`[transcriptions/en] Added ${missingTransWords.length} missing transcriptions to ${level}_general.json`);
        }
    }
});

console.log('Fix completed.');
