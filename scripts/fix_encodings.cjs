const fs = require('fs');

const win1252ToByte = {
    '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
    '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E,
    '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0152': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F
};

function decodeWin1252(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (win1252ToByte[char] !== undefined) {
            bytes.push(win1252ToByte[char]);
        } else {
            const code = char.charCodeAt(0);
            if (code <= 255) {
                bytes.push(code);
            } else {
                const buf = Buffer.from(char, 'utf8');
                for (let j = 0; j < buf.length; j++) bytes.push(buf[j]);
            }
        }
    }
    return Buffer.from(bytes).toString('utf8');
}

function fixFile(filePath, double = false) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    console.log(`Fixing ${filePath}${double ? ' (double)' : ''}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.substring(1);
    }
    
    let fixed = decodeWin1252(content);
    if (double) {
        fixed = decodeWin1252(fixed);
    }
    
    const writeBOM = filePath.endsWith('.md') || filePath.endsWith('.json');
    
    if (writeBOM) {
        const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
        const buffer = Buffer.concat([bom, Buffer.from(fixed, 'utf8')]);
        fs.writeFileSync(filePath, buffer);
    } else {
        fs.writeFileSync(filePath, fixed, 'utf8');
    }
}

// Виправляю підтверджені проблемні файли
fixFile('scripts/maintenance/deduplicate_semantics.cjs');
fixFile('scripts/maintenance/fix_ipa_simple.cjs');
fixFile('src/lib/data/translations/pl/levels/C1_general.json');
fixFile('src/lib/data/translations/el/levels/C1_general.json');

// Перевіряю semantics.ts на пошкоджену кирилицю
const semanticsContent = fs.readFileSync('src/lib/data/semantics.ts', 'utf8');
if (semanticsContent.includes('Ð')) {
    fixFile('src/lib/data/semantics.ts');
} else {
    console.log('src/lib/data/semantics.ts looks okay.');
}

// Перевіряю звіт на пошкоджену кирилицю (якщо вона там є)
const reportContent = fs.readFileSync('languages_new_analysis_report.md', 'utf8');
if (reportContent.includes('Ð')) {
    fixFile('languages_new_analysis_report.md', true);
} else {
    console.log('languages_new_analysis_report.md looks okay.');
}

console.log('Encoding issues fixed properly!');
