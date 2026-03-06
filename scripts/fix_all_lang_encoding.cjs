const fs = require('fs');
const path = require('path');

// Directories containing language-related files
const LANG_DIRS = [
    'src/lib/data',
    'src/lib/i18n/translations',
    'src/lib/services/transcription' // for .ts mappers if needed
];

// Mapping for common Polish Mojibake (just in case they exist in other files too)
const MOJIBAKE_MAP = {
    '\u00C4\u0087': '\u0107', '\u00C3\u00B3': '\u00F3', '\u00C5\u0082': '\u0142', 
    '\u00C4\u0099': '\u0119', '\u00C5\u009B': '\u015B', '\u00C5\u00BA': '\u017A', 
    '\u00C5\u00BC': '\u017C', '\u00C5\u0084': '\u0144', '\u00C4\u0085': '\u0105',
    '\u00C4\u0086': '\u0106', '\u00C3\u0093': '\u00D3', '\u00C5\u0081': '\u0141', 
    '\u00C4\u0098': '\u0118', '\u00C5\u009A': '\u015A', '\u00C5\u00B9': '\u0179', 
    '\u00C5\u00BB': '\u017B', '\u00C5\u0083': '\u0143', '\u00C4\u0084': '\u0104'
};

function fixMojibake(text) {
    let fixed = text;
    for (const [bad, good] of Object.entries(MOJIBAKE_MAP)) {
        fixed = fixed.split(bad).join(good);
    }
    return fixed;
}

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            processFile(path.join(filePath, file));
        }
        return;
    }

    // Only process .json and .ts (mappers/data)
    if (!filePath.endsWith('.json') && !filePath.endsWith('.ts')) return;

    console.log(`Ensuring UTF-8 BOM: ${filePath}`);
    const rawBuffer = fs.readFileSync(filePath);
    
    // Check if it already has BOM
    if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
        // Already has BOM, but let's check for Mojibake just in case
        const content = rawBuffer.slice(3).toString('utf8');
        const fixedContent = fixMojibake(content);
        if (content !== fixedContent) {
            console.log(`  -> Fixed Mojibake in already BOM file`);
            const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
            const newBuffer = Buffer.concat([bom, Buffer.from(fixedContent, 'utf8')]);
            fs.writeFileSync(filePath, newBuffer);
        }
        return;
    }

    // No BOM, read as utf8, fix Mojibake, and write with BOM
    const content = rawBuffer.toString('utf8');
    const fixedContent = fixMojibake(content);
    
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const buffer = Buffer.concat([bom, Buffer.from(fixedContent, 'utf8')]);
    
    fs.writeFileSync(filePath, buffer);
}

LANG_DIRS.forEach(processFile);
console.log('All language files processed and ensured UTF-8 with BOM!');
