const fs = require('fs');
const path = require('path');

const PL_DIRS = [
    'src/lib/data/translations/pl',
    'src/lib/services/transcription/pl.ts'
];

// Use Unicode escapes to avoid encoding issues in the script itself
const MOJIBAKE_MAP = {
    // lowercase
    '\u00C4\u0087': '\u0107', // ć
    '\u00C3\u00B3': '\u00F3', // ó
    '\u00C5\u0082': '\u0142', // ł
    '\u00C4\u0099': '\u0119', // ę
    '\u00C5\u009B': '\u015B', // ś
    '\u00C5\u00BA': '\u017A', // ź
    '\u00C5\u00BC': '\u017C', // ż
    '\u00C5\u0084': '\u0144', // ń
    '\u00C4\u0085': '\u0105', // ą
    
    // uppercase
    '\u00C4\u0086': '\u0106', // Ć
    '\u00C3\u0093': '\u00D3', // Ó
    '\u00C5\u0081': '\u0141', // Ł
    '\u00C4\u0098': '\u0118', // Ę
    '\u00C5\u009A': '\u015A', // Ś
    '\u00C5\u00B9': '\u0179', // Ź
    '\u00C5\u00BB': '\u017B', // Ż
    '\u00C5\u0083': '\u0143', // Ń
    '\u00C4\u0084': '\u0104'  // Ą
};

function fixMojibake(text) {
    let fixed = text;
    for (const [bad, good] of Object.entries(MOJIBAKE_MAP)) {
        fixed = fixed.split(bad).join(good);
    }
    return fixed;
}

function processFile(filePath) {
    console.log(`Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixMojibake(content);
    
    // Always save as UTF-8 with BOM
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const buffer = Buffer.concat([bom, Buffer.from(fixedContent, 'utf8')]);
    
    fs.writeFileSync(filePath, buffer);
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    if (fs.statSync(dir).isFile()) {
        processFile(dir);
        return;
    }
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.json') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

PL_DIRS.forEach(walkDir);
console.log('Done fixing encoding!');
