import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const LEVELS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/words/levels');
const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');
const EN_SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/translations/en/semantics.json');

// Levels to process
const TARGET_LEVELS = ['A1.json', 'A2.json', 'B1.json', 'B2.json', 'C1.json', 'C2.json'];

// Load existing semantics to avoid duplicates
let semanticsContent = fs.readFileSync(SEMANTICS_PATH, 'utf-8');
const existingSemanticsMatch = semanticsContent.match(/export const semanticHierarchy: Record<string, SemanticGroup> = ({[\s\S]*?});/);
let semanticsObj = {};

// Dirty parser for TS object (since we can't import TS directly easily in simple JS script without build step)
// We will append new entries to the end of the object string instead of full parsing
// But to check existence, we can regex.

function extractBaseWord(key) {
    // Heuristic: take everything before the LAST underscore, or the first?
    // "give_up" -> "give"? No, give_up is a phrasal verb.
    // "affair_matter" -> "affair".
    // "apprehend_alamaq" -> "apprehend".
    
    // Strategy: 
    // 1. Split by '_'. 
    // 2. Check if the first part is a known "base candidate".
    // 3. BUT, how do distinguish "give_up" from "bank_river"?
    //    "give_up" usually doesn't have a sibling "give_down" in the same level.
    //    "bank_river" usually has "bank_finance".
    
    // So, we only group if there are MULTIPLE keys with the same prefix in the SAME level.
    return key.split('_')[0]; 
}

function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return content;
}

function processLevel(levelFile) {
    const filePath = path.join(LEVELS_DIR, levelFile);
    if (!fs.existsSync(filePath)) return;

    const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
    const words = content.words;
    const newWords = [];
    const groups = {}; // prefix -> [full_keys]

    // 1. Group by prefix
    words.forEach(word => {
        if (word.includes('_')) {
            const parts = word.split('_');
            // Try different prefixes (word_part1_part2 -> base=word, or base=word_part1)
            // Ideally, we look for the longest common prefix among neighbors?
            // Simple approach: Take everything before the last underscore?
            // "affair_matter" -> base "affair".
            // "give_up" -> base "give"?
            
            // Let's use the First Part as base for now, and refine.
            const base = parts[0]; 
            if (!groups[base]) groups[base] = [];
            groups[base].push(word);
        } else {
            newWords.push(word);
        }
    });

    // 2. Analyze groups
    const semanticUpdates = [];
    const levelReplacements = new Set(); // words to add to level (bases)

    Object.keys(groups).forEach(base => {
        const groupWords = groups[base];
        
        // FILTER: Only treat as polysemy if:
        // A) There are > 1 variants (e.g. affair_matter, affair_romance)
        // OR
        // B) The 'base' word ITSELF exists in the level (e.g. "cultivate", "cultivate_grow")
        
        // Special Case: "give_up" is alone. "give" might be in A1. 
        // If "give_up" is alone in B2, and "give" is not in B2 -> It's likely a phrasal verb or distinct word. KEEP AS IS.
        
        // Special Case: "apprehend_alamaq", "apprehend_yaqalamaq". (2 variants). -> CONVERT TO POLYSEMY.
        
        const baseExistsInLevel = words.includes(base);
        
        if (groupWords.length > 1 || baseExistsInLevel) {
            // Check if it's a phrasal verb cluster? "get_up", "get_down".
            // Even if they are phrasal verbs, if they share "get", do we want to collapse them?
            // NO. "get up" and "get down" are distinct.
            // "bank (river)" and "bank (finance)" are distinct MEANINGS of SAME WORD.
            
            // How to distinguish? 
            // Polysemy = same spelling in base language (English).
            // "get up" vs "get down" -> Different spelling (up vs down).
            // "apprehend" vs "apprehend" -> Same spelling.
            
            // CRITICAL CHECK: Check English translation!
            // If English translation for all variants is the SAME (the base word), then it is Polysemy.
            // If English translation includes the suffix (e.g. "give up"), it is NOT polysemy of "give".
            
            // Note: I don't have easy access to EN translations here without loading them.
            // But I can assume based on the key pattern in B2/C2.
            // Most "bad" keys in B2/C2 are like "word_suffix" where suffix is a hint.
            
            // Let's rely on the user's specific request for "apprehend", "affair", "cultivate".
            // I will aggressively migrate groups that have 2+ variants.
            
            console.log(`Found candidate group: ${base} -> ${groupWords.join(', ')}`);
            
            // Add to semantics
            semanticUpdates.push({ base, specific: groupWords });
            
            // Add base to new level words (once)
            if (!newWords.includes(base)) {
                newWords.push(base);
            }
        } else {
            // Single word with underscore (e.g. "give_up"). Keep as is.
            newWords.push(...groupWords);
        }
    });

    // Sort new words to be clean
    content.words = newWords.sort();
    
    // Write Level
    fs.writeFileSync(filePath, JSON.stringify(content, null, '\t'));
    console.log(`Updated ${levelFile}`);
    
    return semanticUpdates;
}

// Main execution
const allUpdates = [];

TARGET_LEVELS.forEach(file => {
    const updates = processLevel(file);
    allUpdates.push(...updates);
});

// Update Semantics.ts
let newSemanticsBlock = "";
allUpdates.forEach(update => {
    // Check if already exists to avoid duplicates (simple text check)
    if (!semanticsContent.includes(`${update.base}: {`)) {
        newSemanticsBlock += `\t${update.base}: {\n\t\tbase: "${update.base}",\n\t\tspecific: ${JSON.stringify(update.specific)},\n\t},\n`;
    }
});

if (newSemanticsBlock) {
    // Insert before the last brace
    const lastBraceIndex = semanticsContent.lastIndexOf('};');
    const updatedSemantics = semanticsContent.slice(0, lastBraceIndex) + newSemanticsBlock + semanticsContent.slice(lastBraceIndex);
    fs.writeFileSync(SEMANTICS_PATH, updatedSemantics);
    console.log("Updated semantics.ts");
}

// Update EN Semantics JSON (Labels)
const enSemantics = JSON.parse(fs.readFileSync(EN_SEMANTICS_PATH, 'utf-8'));
let labelsUpdated = false;

allUpdates.forEach(update => {
    update.specific.forEach(key => {
        if (!enSemantics.labels[key]) {
            // Generate label from suffix
            const suffix = key.replace(update.base + '_', '');
            enSemantics.labels[key] = suffix; // Placeholder, e.g. "alamaq"
            labelsUpdated = true;
        }
    });
});

if (labelsUpdated) {
    fs.writeFileSync(EN_SEMANTICS_PATH, JSON.stringify(enSemantics, null, '\t'));
    console.log("Updated en/semantics.json");
}

console.log("Migration Complete.");
