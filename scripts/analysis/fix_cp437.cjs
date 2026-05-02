const fs = require('fs');

const cp437ToByte = {
    'Ç':0x80, 'ü':0x81, 'é':0x82, 'â':0x83, 'ä':0x84, 'à':0x85, 'å':0x86, 'ç':0x87, 'ê':0x88, 'ë':0x89, 'è':0x8A, 'ï':0x8B, 'î':0x8C, 'ì':0x8D, 'Ä':0x8E, 'Å':0x8F,
    'É':0x90, 'æ':0x91, 'Æ':0x92, 'ô':0x93, 'ö':0x94, 'ò':0x95, 'û':0x96, 'ù':0x97, 'ÿ':0x98, 'Ö':0x99, 'Ü':0x9A, '¢':0x9B, '£':0x9C, '¥':0x9D, '₧':0x9E, 'ƒ':0x9F,
    'á':0xA0, 'í':0xA1, 'ó':0xA2, 'ú':0xA3, 'ñ':0xA4, 'Ñ':0xA5, 'ª':0xA6, 'º':0xA7, '¿':0xA8, '⌐':0xA9, '¬':0xAA, '½':0xAB, '¼':0xAC, '¡':0xAD, '«':0xAE, '»':0xAF,
    '░':0xB0, '▒':0xB1, '▓':0xB2, '│':0xB3, '┤':0xB4, '╡':0xB5, '╢':0xB6, '╖':0xB7, '╕':0xB8, '╣':0xB9, '║':0xBA, '╗':0xBB, '╝':0xBC, '╜':0xBD, '╛':0xBE, '┐':0xBF,
    '└':0xC0, '┴':0xC1, '┬':0xC2, '├':0xC3, '─':0xC4, '┼':0xC5, '╞':0xC6, '╟':0xC7, '╚':0xC8, '╔':0xC9, '╩':0xCA, '╦':0xCB, '╠':0xCC, '═':0xCD, '╬':0xCE, '╧':0xCF,
    '╨':0xD0, '╤':0xD1, '╥':0xD2, '╙':0xD3, '╘':0xD4, '╒':0xD5, '╓':0xD6, '╫':0xD7, '╪':0xD8, '┘':0xD9, '┌':0xDA, '█':0xDB, '▄':0xDC, '▌':0xDD, '▐':0xDE, '▀':0xDF,
    'α':0xE0, 'ß':0xE1, 'Γ':0xE2, 'π':0xE3, 'Σ':0xE4, 'σ':0xE5, 'µ':0xE6, 'τ':0xE7, 'Φ':0xE8, 'Θ':0xE9, 'Ω':0xEA, 'δ':0xEB, '∞':0xEC, 'φ':0xED, 'ε':0xEE, '∩':0xEF,
    '≡':0xF0, '±':0xF1, '≥':0xF2, '≤':0xF3, '⌠':0xF4, '⌡':0xF5, '÷':0xF6, '≈':0xF7, '°':0xF8, '∙':0xF9, '·':0xFA, '√':0xFB, 'ⁿ':0xFC, '²':0xFD, '■':0xFE, '\xA0':0xFF
};

function fixCorruptedString(str) {
    if (!/[├▒─┼╧╬╝╜╗║╣╕╖╢╡┤│▓░]/.test(str)) {
        return str; 
    }
    
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (cp437ToByte[char] !== undefined) {
            bytes.push(cp437ToByte[char]);
        } else {
            const code = char.charCodeAt(0);
            if (code <= 127) {
                bytes.push(code);
            } else {
                bytes.push(code & 0xFF);
            }
        }
    }
    try {
        const decoded = Buffer.from(bytes).toString('utf8');
        return decoded;
    } catch(e) {
        return str;
    }
}

function processJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let content = rawContent;
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    if (hasBOM) content = content.slice(1);
    
    let json;
    try {
        json = JSON.parse(content);
    } catch(e) {
        return;
    }
    
    let modified = false;
    for (const key in json) {
        const val = json[key];
        if (typeof val === 'string') {
            const fixed = fixCorruptedString(val);
            if (fixed !== val) {
                json[key] = fixed;
                modified = true;
            }
        }
    }
    
    if (modified) {
        const newStr = (hasBOM ? '\uFEFF' : '') + JSON.stringify(json, null, '\t') + '\n';
        fs.writeFileSync(filePath, newStr, 'utf8');
        console.log('Fixed', filePath);
    }
}

const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const suffix = ['general', 'nouns', 'adjectives', 'adverbs', 'verbs', 'clothes', 'home', 'education', 'food', 'family', 'abstract', 'nature', 'travel', 'body_health', 'it', 'cars', 'colors', 'questions', 'pronouns', 'animals', 'basic', 'time'];

langs.forEach(lang => {
    levels.forEach(level => {
        suffix.forEach(suf => {
            processJsonFile(`src/lib/data/translations/${lang}/levels/${level}_${suf}.json`);
        });
    });
});

console.log('Done fixing CP437 mojibake.');
