import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

function stripBOM(content) {
    return content.replace(/^\uFEFF/, '').trim();
}

const translationsDir = path.join(PROJECT_ROOT, 'src/lib/data/translations');
const transcriptionsDir = path.join(PROJECT_ROOT, 'src/lib/data/transcriptions/en/levels');

// Clean up B2_general.json, C1_general.json, C2_general.json by removing duplicates that exist in other levels
const levelsToFix = ['B2', 'C1', 'C2'];

levelsToFix.forEach(level => {
    const languages = fs.readdirSync(translationsDir).filter(f => fs.statSync(path.join(translationsDir, f)).isDirectory());
    
    languages.forEach(lang => {
        const langLevelsDir = path.join(translationsDir, lang, 'levels');
        if (!fs.existsSync(langLevelsDir)) return;
        
        const allOtherKeys = new Set();
        const files = fs.readdirSync(langLevelsDir).filter(f => f.endsWith('.json'));
        
        // Load all keys EXCEPT from the target general file
        const generalFile = path.join(langLevelsDir, `${level}_general.json`);
        files.forEach(file => {
            const filePath = path.join(langLevelsDir, file);
            if (filePath !== generalFile) {
                const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
                Object.keys(content).forEach(k => allOtherKeys.add(k));
            }
        });
        
        // Now read generalFile and remove keys that are in allOtherKeys
        if (fs.existsSync(generalFile)) {
            let generalContent = JSON.parse(stripBOM(fs.readFileSync(generalFile, 'utf-8')));
            let modified = false;
            
            Object.keys(generalContent).forEach(key => {
                if (allOtherKeys.has(key)) {
                    delete generalContent[key];
                    modified = true;
                }
            });
            
            if (modified) {
                fs.writeFileSync(generalFile, JSON.stringify(generalContent, null, '\t') + '\n', 'utf-8');
                console.log(`[${lang}] Removed duplicates from ${level}_general.json`);
            }
        }
    });

    // Clean up transcriptions
    if (fs.existsSync(transcriptionsDir)) {
        const transFiles = fs.readdirSync(transcriptionsDir).filter(f => f.endsWith('.json'));
        const allOtherTransKeys = new Set();
        const generalTransFile = path.join(transcriptionsDir, `${level}_general.json`);
        
        transFiles.forEach(file => {
            const filePath = path.join(transcriptionsDir, file);
            if (filePath !== generalTransFile) {
                const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
                Object.keys(content).forEach(k => allOtherTransKeys.add(k));
            }
        });
        
        if (fs.existsSync(generalTransFile)) {
            let generalTransContent = JSON.parse(stripBOM(fs.readFileSync(generalTransFile, 'utf-8')));
            let modified = false;
            
            Object.keys(generalTransContent).forEach(key => {
                if (allOtherTransKeys.has(key)) {
                    delete generalTransContent[key];
                    modified = true;
                }
            });
            
            if (modified) {
                fs.writeFileSync(generalTransFile, JSON.stringify(generalTransContent, null, '\t') + '\n', 'utf-8');
                console.log(`[transcriptions/en] Removed duplicates from ${level}_general.json`);
            }
        }
    }
});

console.log('Cleanup completed.');
