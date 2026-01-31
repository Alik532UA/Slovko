import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

const FINAL_WORDS = [
    ["A2", "homework", "homework", "домашнє завдання", "ev işi", "Hausaufgabe", "huiswerk", "ˈhəʊmwɜːrk"],
    ["A2", "exam", "exam", "іспит", "sınav", "Prüfung", "examen", "ɪɡˈzæm"],
    ["A1", "class", "class", "клас", "sınıf", "Klasse", "klas", "klɑːs"],
    ["B1", "salary", "salary", "зарплата", "maaş", "Gehalt", "salaris", "ˈsæləri"],
    ["B1", "profession", "profession", "професія", "zenaat", "Beruf", "beroep", "prəˈfeʃn"],
    ["A2", "luck", "luck", "удача", "baht", "Glück", "geluk", "lʌk"],
    ["A2", "late", "late", "пізній", "keç", "spät", "laat", "leɪt"],
    ["A2", "early", "early", "ранній", "er", "früh", "vroeg", "ˈɜːrli"],
    ["A2", "wrong", "wrong", "неправильний", "yañlış", "falsch", "verkeerd", "rɒŋ"],
    ["A2", "easy", "easy", "легкий", "qolay", "einfach", "makkelijk", "ˈiːzi"]
];

function update() {
    FINAL_WORDS.forEach(([level, key, en, uk, crh, de, nl, ipa]) => {
        const wordsPath = path.join(DATA_DIR, 'words/levels', `${level}.json`);
        const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
        if (!wordsData.words.includes(key)) {
            wordsData.words.push(key);
            fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 4));
        }

        ['en', 'uk', 'crh', 'de', 'nl'].forEach((lang, idx) => {
            const transPath = path.join(DATA_DIR, 'translations', lang, 'levels', `${level}.json`);
            const transData = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
            const values = [en, uk, crh, de, nl];
            transData[key] = values[idx];
            fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));
        });

        const ipaPath = path.join(DATA_DIR, 'transcriptions/levels', `${level}.json`);
        const ipaData = JSON.parse(fs.readFileSync(ipaPath, 'utf-8'));
        ipaData[key] = ipa;
        fs.writeFileSync(ipaPath, JSON.stringify(ipaData, null, 4));
    });
}
update();