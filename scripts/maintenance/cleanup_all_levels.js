import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORDS_DIR = path.join(__dirname, '../../src/lib/data/words/levels');

let seenWords = new Set();

console.log('🚀 Starting global cleanup of duplicate words across levels...');

for (const level of LEVELS) {
    const filePath = path.join(WORDS_DIR, `${level}.json`);
    
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: File not found for level ${level}`);
        continue;
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const originalCount = data.words.length;
        
        // Filter words: keep only those NOT in seenWords
        // Also remove internal duplicates within the file itself
        const uniqueLevelWords = [...new Set(data.words)]; 
        const cleanWords = uniqueLevelWords.filter(word => !seenWords.has(word));
        
        const removedCount = originalCount - cleanWords.length;
        
        if (removedCount > 0) {
            console.log(`[${level}] Removed ${removedCount} duplicates (Original: ${originalCount} -> New: ${cleanWords.length})`);
            data.words = cleanWords;
            fs.writeFileSync(filePath, JSON.stringify(data, null, '	'));
        } else {
            console.log(`[${level}] Clean. (${originalCount} words)`);
        }

        // Add current level's words to seen set for next levels
        cleanWords.forEach(word => seenWords.add(word));

    } catch (error) {
        console.error(`❌ Error processing ${level}:`, error);
    }
}

console.log('✅ Cleanup complete. All levels are now incremental and SSoT compliant.');
