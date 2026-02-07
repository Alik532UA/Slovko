import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

function isAbstract(word) {
    const abstractSuffixes = ['tion', 'sion', 'ness', 'ment', 'ity', 'ship', 'ance', 'ence', 'ism', 'hood', 'dom', 'ery'];
    const abstractWords = ['access', 'account', 'act', 'action', 'activity', 'administration', 'advantage', 'advice', 'aim', 'analysis', 'anger', 'angle', 'anxiety', 'aspect', 'asset', 'assistance', 'association', 'assumption', 'atmosphere', 'attention', 'authority', 'basis', 'belief', 'benefit', 'cause', 'chance', 'choice', 'command', 'common', 'condition', 'conflict', 'control', 'cost', 'culture', 'danger', 'death', 'degree', 'delay', 'detail', 'difference', 'difficulty', 'direction', 'distance', 'doubt', 'duty', 'effect', 'effort', 'error', 'event', 'example', 'experience', 'fact', 'failure', 'fear', 'feeling', 'future', 'goal', 'habit', 'health', 'help', 'history', 'hope', 'idea', 'interest', 'issue', 'knowledge', 'law', 'level', 'life', 'loss', 'love', 'luck', 'manner', 'matter', 'meaning', 'memory', 'mind', 'mistake', 'moment', 'nature', 'need', 'news', 'notice', 'opinion', 'order', 'part', 'past', 'peace', 'period', 'plan', 'pleasure', 'point', 'power', 'practice', 'pressure', 'price', 'problem', 'process', 'project', 'purpose', 'quality', 'question', 'reason', 'result', 'role', 'rule', 'safety', 'scale', 'science', 'secret', 'sense', 'service', 'shame', 'shape', 'sign', 'size', 'skill', 'society', 'sort', 'source', 'space', 'speed', 'spirit', 'standard', 'state', 'step', 'style', 'subject', 'success', 'system', 'task', 'test', 'thought', 'time', 'title', 'total', 'trouble', 'trust', 'truth', 'type', 'unit', 'use', 'value', 'view', 'voice', 'war', 'way', 'will', 'wish', 'word', 'work', 'worth'];
    const cleanWord = word.split('_')[0].toLowerCase();
    if (abstractWords.includes(cleanWord)) return true;
    if (abstractSuffixes.some(s => cleanWord.endsWith(s))) return true;
    return false;
}

function processNouns(level) {
    const langs = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());
    for (const lang of langs) {
        const nounsPath = path.join(TRANS_DIR, lang, 'levels', `${level}_nouns.json`);
        if (!fs.existsSync(nounsPath)) continue;
        console.log(`📦 Splitting nouns for ${lang}/${level}...`);
        const data = JSON.parse(fs.readFileSync(nounsPath, 'utf8'));
        const abstract = {};
        const concrete = {};
        for (const [key, value] of Object.entries(data)) {
            if (isAbstract(key)) abstract[key] = value;
            else concrete[key] = value;
        }
        if (Object.keys(abstract).length > 0) fs.writeFileSync(path.join(TRANS_DIR, lang, 'levels', `${level}_nouns_abstract.json`), JSON.stringify(abstract, null, '\t') + '\n', 'utf8');
        if (Object.keys(concrete).length > 0) fs.writeFileSync(path.join(TRANS_DIR, lang, 'levels', `${level}_nouns_concrete.json`), JSON.stringify(concrete, null, '\t') + '\n', 'utf8');
        fs.unlinkSync(nounsPath);
    }
}

function processTranscriptionNouns(level) {
    const transDir = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');
    const nounsPath = path.join(transDir, `${level}_nouns.json`);
    if (!fs.existsSync(nounsPath)) return;
    console.log(`🎤 Splitting transcription nouns for ${level}...`);
    const data = JSON.parse(fs.readFileSync(nounsPath, 'utf8'));
    const abstract = {};
    const concrete = {};
    for (const [key, value] of Object.entries(data)) {
        if (isAbstract(key)) abstract[key] = value;
        else concrete[key] = value;
    }
    if (Object.keys(abstract).length > 0) fs.writeFileSync(path.join(transDir, `${level}_nouns_abstract.json`), JSON.stringify(abstract, null, '\t') + '\n', 'utf8');
    if (Object.keys(concrete).length > 0) fs.writeFileSync(path.join(transDir, `${level}_nouns_concrete.json`), JSON.stringify(concrete, null, '\t') + '\n', 'utf8');
    fs.unlinkSync(nounsPath);
}

['B1', 'B2'].forEach(lvl => {
    processNouns(lvl);
    processTranscriptionNouns(lvl);
});
console.log('\n🚀 Done!');