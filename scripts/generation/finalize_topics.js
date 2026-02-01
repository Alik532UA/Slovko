
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

const DATA = {
    "present_time": ["present", "теперішній", "şimdiki", "Gegenwart", "tegenwoordige tijd", "ˈpreznt"],
    "past": ["past", "минуле", "keçmiş", "Vergangenheit", "verleden", "pɑːst"],
    "luck": ["luck", "удача", "baht", "Glück", "geluk", "lʌk"],
    "late": ["late", "пізній", "keç", "spät", "laat", "leɪt"],
    "early": ["early", "ранній", "er", "früh", "vroeg", "ˈɜːrli"],
    "wrong": ["wrong", "неправильний", "yañlış", "falsch", "verkeerd", "rɒŋ"],
    "easy": ["easy", "легкий", "qolay", "einfach", "makkelijk", "ˈiːzi"],
    "to_be": ["to be", "бути", "olmaq", "sein", "zijn", "tu biː"],
    "to_have": ["to have", "мати", "saip olmaq", "haben", "hebben", "tu hæv"],
    "to_do": ["to do", "робити", "yapmaq", "tun", "doen", "tu duː"],
    "sock": ["sock", "шкарпетка", "çoraq", "Socke", "sok", "sɒk"],
    "suit": ["suit", "костюм", "kostyum", "Anzug", "pak", "suːt"],
    "sweater": ["sweater", "светр", "sviter", "Pullover", "trui", "ˈswetər"],
    "tie_clothes": ["tie", "краватка", "qalstuk", "Krawatte", "das", "taɪ"],
    "grade": ["grade", "оцінка", "derece", "Note", "cijfer", "ɡreɪd"],
    "professor": ["professor", "професор", "professor", "Professor", "hoogleraar", "prəˈfesər"],
    "nephew": ["nephew", "племінник", "yegen", "Neffe", "neef", "ˈnefjuː"],
    "niece": ["niece", "племінниця", "yegen", "Nichte", "nicht", "niːs"],
    "divorced": ["divorced", "розлучений", "boşanğan", "geschieden", "gescheiden", "dɪˈvɔːrst"],
    "marry": ["marry", "одружуватися", "evlenmek", "heiraten", "trouwen", "ˈmæri"],
    "here": ["here", "тут", "mında", "hier", "hier", "hɪər"],
    "there": ["there", "там", "anda", "dort", "daar", "ðeər"],
    "where": ["where", "де", "qayda", "wo", "waar", "weər"],
    "everywhere": ["everywhere", "всюди", "er yerde", "überall", "overal", "ˈevriwer"],
    "somewhere": ["somewhere", "десь", "bir yerde", "irgendwo", "ergens", "ˈsʌmwer"],
    "nowhere": ["nowhere", "ніде", "iç bir yerde", "nirgends", "nergens", "ˈnəʊwer"],
    "in": ["in", "в", "içinde", "in", "in", "ɪn"],
    "on": ["on", "на", "üstünde", "auf", "op", "ɒn"],
    "at": ["at", "в / на", "anda", "an", "bij", "æt"],
    "to": ["to", "до", "ge / qa", "zu", "naar", "tuː"],
    "from": ["from", "з / від", "dan / den", "von", "van", "frɒm"],
    "with": ["with", "з", "ile", "mit", "met", "wɪð"],
    "without": ["without", "без", "-sız / -siz", "ohne", "zonder", "wɪˈðaʊt"],
    "for": ["for", "для", "içün", "für", "voor", "fɔːr"],
    "about": ["about", "про", "aqqında", "über", "over", "əˈbaʊt"],
    "under": ["under", "під", "altında", "unter", "onder", "ˈʌndər"],
    "above": ["above", "над", "üstünde", "über", "boven", "əˈbʌv"],
    "behind": ["behind", "позаду", "arqasında", "hinter", "achter", "bɪˈhaɪnd"],
    ["between"]: ["between", "між", "arısında", "zwischen", "tussen", "bɪˈtwiːn"],
    "during": ["during", "під час", "devamında", "während", "tijdens", "ˈdjʊərɪŋ"],
    "since": ["since", "з (часу)", "berli", "seit", "sinds", "sɪns"],
    "until": ["until", "до (часу)", "qadar", "bis", "tot", "ənˈtɪl"],
    "chance": ["chance", "шанс", "fırsat", "Chance", "kans", "tʃɑːns"],
    "error": ["error", "помилка", "ata", "Fehler", "fout", "ˈerər"],
    "blood": ["blood", "кров", "qan", "Blut", "bloed", "blʌd"],
    "stomach": ["stomach", "шлунок", "mide", "Magen", "maag", "ˈstʌmək"],
    "university": ["university", "університет", "universitet", "Universität", "universiteit", "ˌjuːnɪˈvɜːrsəti"],
    "politics": ["politics", "політика", "siyaset", "Politik", "politiek", "ˈpɒlətɪks"],
    "government": ["government", "уряд", "ükümet", "Regierung", "overheid", "ˈɡʌvənmənt"],
    "president": ["president", "президент", "prezident", "Präsident", "president", "ˈprezɪdənt"],
    "citizen": ["citizen", "громадянин", "vatan-daş", "Bürger", "burger", "ˈsɪtɪzn"]
};

function finalize() {
    const langs = ['en', 'uk', 'crh', 'de', 'nl'];
    const topicsDir = path.join(DATA_DIR, 'words/topics');
    
    fs.readdirSync(topicsDir).forEach(file => {
        const topicData = JSON.parse(fs.readFileSync(path.join(topicsDir, file), 'utf-8'));
        const wordKeys = topicData.words || [];

        langs.forEach((lang, idx) => {
            const transPath = path.join(DATA_DIR, 'translations', lang, 'topics', file);
            if (!fs.existsSync(transPath)) return;
            
            const transData = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
            wordKeys.forEach(key => {
                if (DATA[key]) {
                    transData[key] = DATA[key][idx];
                }
            });
            fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));
        });

        const ipaPath = path.join(DATA_DIR, 'transcriptions/topics', file);
        if (fs.existsSync(ipaPath)) {
            const ipaData = JSON.parse(fs.readFileSync(ipaPath, 'utf-8'));
            wordKeys.forEach(key => {
                if (DATA[key]) {
                    ipaData[key] = DATA[key][5];
                }
            });
            fs.writeFileSync(ipaPath, JSON.stringify(ipaData, null, 4));
        }
    });
    console.log("Final 100% synchronization complete.");
}

finalize();
