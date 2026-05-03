import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

function getCategory(word) {
    const cleanKey = word.split('_')[0].toLowerCase();
    
    // Пріоритет суфіксам у ключах
    if (word.includes('_verb')) return 'verbs';
    if (word.includes('_adj')) return 'adjectives';
    if (word.includes('_adv')) return 'adverbs';
    if (word.includes('_noun')) return 'nouns';

    if (word.endsWith('ly')) return 'adverbs';
    
    const commonVerbs = [
        'analyze', 'assess', 'assume', 'avoid', 'behave', 'apply', 'appoint', 'arise', 'arrange', 'arrest', 'assist', 
        'claim', 'complete', 'contain', 'deliver', 'depend', 'exist', 'improve', 'include', 'manage', 'prepare', 
        'provide', 'reduce', 'remain', 'remove', 'report', 'require', 'return', 'serve', 'suggest', 'support', 'trust',
        'abide', 'abolish', 'abrade', 'abrogate', 'abscond', 'accede', 'accelerate', 'accentuate', 'acclaim', 'acclimate',
        'accompany', 'accomplish', 'accrue', 'accumulate', 'achieve', 'acknowledge', 'acquire', 'act', 'activate', 
        'adapt', 'add', 'address', 'adjust', 'administer', 'admire', 'admit', 'adopt', 'adore', 'adorn', 'advance',
        'advise', 'advocate', 'affect', 'affirm', 'afford', 'agree', 'aid', 'aim', 'alarm', 'alert', 'align', 'allege',
        'allocate', 'allow', 'alter', 'amend', 'amuse', 'analyze', 'announce', 'annoy', 'answer', 'anticipate', 'apologize',
        'appear', 'appease', 'applaud', 'apply', 'appoint', 'appraise', 'appreciate', 'apprehend', 'approach', 'approve',
        'argue', 'arise', 'arm', 'arouse', 'arrange', 'arrest', 'arrive', 'articulate', 'ascend', 'ascertain', 'ascribe',
        'ask', 'aspire', 'assail', 'assault', 'assemble', 'assert', 'assess', 'assign', 'assimilate', 'assist', 'associate',
        'assume', 'assure', 'astonish', 'attach', 'attack', 'attain', 'attempt', 'attend', 'attest', 'attract', 'attribute',
        'augment', 'authenticate', 'authorize', 'avail', 'avenge', 'aver', 'avert', 'avoid', 'avow', 'await', 'awake', 'award'
    ];

    if (word.endsWith('ize') || word.endsWith('ise') || word.endsWith('ate') || word.endsWith('ify') || 
        word.endsWith('en') || word.endsWith('ish') || commonVerbs.includes(cleanKey)) {
        // Винятки для 'ish' та 'en', які можуть бути прикметниками або іменниками
        const adjectivesIshEn = ['reddish', 'bluish', 'greenish', 'yellowish', 'childish', 'selfish', 'golden', 'wooden', 'woollen', 'earthen', 'brazen'];
        if (adjectivesIshEn.includes(cleanKey)) return 'adjectives';
        return 'verbs';
    }

    if (word.endsWith('able') || word.endsWith('ible') || word.endsWith('ous') || word.endsWith('ive') || 
        word.endsWith('ic') || word.endsWith('al') || word.endsWith('ful') || word.endsWith('less') || 
        word.endsWith('ent') || word.endsWith('ant') || word.endsWith('ory') || word.endsWith('ary') ||
        word.endsWith('ed') || word.endsWith('ing')) {
        
        // Винятки для 'ing' та 'ed', які можуть бути іменниками
        const nounsIngEd = ['building', 'meeting', 'wedding', 'feeling', 'meaning', 'painting', 'drawing', 'seed', 'feed', 'bed'];
        if (nounsIngEd.includes(cleanKey)) return 'nouns';
        
        return 'adjectives';
    }

    return 'nouns';
}

function processLevel(level) {
    const langs = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());
    for (const lang of langs) {
        const generalPath = path.join(TRANS_DIR, lang, 'levels', `${level}_general.json`);
        if (!fs.existsSync(generalPath)) continue;
        console.log(`📦 Categorizing ${lang}/${level}_general...`);
        const content = fs.readFileSync(generalPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(content);
        const split = { verbs: {}, adjectives: {}, adverbs: {}, nouns: {} };
        for (const [key, value] of Object.entries(data)) {
            const cat = getCategory(key);
            split[cat][key] = value;
        }
        for (const [cat, items] of Object.entries(split)) {
            if (Object.keys(items).length === 0) continue;
            const newPath = path.join(TRANS_DIR, lang, 'levels', `${level}_${cat}.json`);
            let existing = {};
            if (fs.existsSync(newPath)) {
                try {
                    existing = JSON.parse(fs.readFileSync(newPath, 'utf8').replace(/^\uFEFF/, ''));
                } catch (e) {
                    console.error(`Error parsing ${newPath}: ${e.message}`);
                    existing = {};
                }
            }
            Object.assign(existing, items);
            fs.writeFileSync(newPath, JSON.stringify(existing, null, '\t') + '\n', 'utf8');
        }
        fs.unlinkSync(generalPath);
    }
}

function processTranscriptions(level) {
    const transDir = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');
    const generalPath = path.join(transDir, `${level}_general.json`);
    if (!fs.existsSync(generalPath)) return;
    console.log(`🎤 Categorizing transcriptions for ${level}_general...`);
    const content = fs.readFileSync(generalPath, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(content);
    const split = { verbs: {}, adjectives: {}, adverbs: {}, nouns: {} };
    for (const [key, value] of Object.entries(data)) {
        const cat = getCategory(key);
        split[cat][key] = value;
    }
    for (const [cat, items] of Object.entries(split)) {
        if (Object.keys(items).length === 0) continue;
        const newPath = path.join(transDir, `${level}_${cat}.json`);
        let existing = {};
        if (fs.existsSync(newPath)) {
            try {
                existing = JSON.parse(fs.readFileSync(newPath, 'utf8').replace(/^\uFEFF/, ''));
            } catch (e) {
                console.error(`Error parsing ${newPath}: ${e.message}`);                existing = {};
            }
        }
        Object.assign(existing, items);
        fs.writeFileSync(newPath, JSON.stringify(existing, null, '\t') + '\n', 'utf8');
    }
    fs.unlinkSync(generalPath);
}

['B1', 'B2', 'C1'].forEach(lvl => {
    processLevel(lvl);
    processTranscriptions(lvl);
});
console.log('\n🚀 Done!');