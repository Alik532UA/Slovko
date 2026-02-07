import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const WORDS_DIR = path.join(ROOT_DIR, "src/lib/data/words/levels");
const TRANS_DIR = path.join(ROOT_DIR, "src/lib/data/transcriptions/en/levels");

const MASTER_DATA = {
    "beer": "bɪə", "call": "kɔːl", "cream": "kriːm", "date": "deɪt", "dream": "driːm",
    "fat": "fæt", "flat": "flæt", "fog": "fɒɡ", "follow": "ˈfɒləʊ", "forget": "fəˈɡet",
    "fork": "fɔːk", "free": "friː", "friend": "frend", "front": "frʌnt", "full": "fʊl",
    "fun": "fʌn", "funny": "ˈfʌni", "future": "ˈfjuːtʃə", "gate": "ɡeɪt", "get": "ɡet",
    "gift": "ɡɪft", "give": "ɡɪv", "glad": "ɡlæd", "glove": "ɡlʌv", "gold": "ɡəʊld",
    "good": "ɡʊd", "grandfather": "ˈɡrænfɑːðə", "grandmother": "ˈɡrænmʌðə", "gray": "ɡreɪ",
    "green": "ɡriːn", "ground": "ɡraʊnd", "group": "ɡruːp", "grow": "ɡrəʊ", "guess": "ɡes",
    "guest": "ɡest", "guide": "ɡaɪd", "gun": "ɡʌn", "half": "hɑːf", "hall": "hɔːl",
    "hand": "hænd", "happen": "ˈhæpən", "happy": "ˈhæpi", "hard_solid": "hɑːd", "hate": "heɪt",
    "head": "hed", "health": "helθ", "hear": "hɪə", "heart": "hɑːt", "heat": "hiːt",
    "heavy": "ˈhevi", "high": "haɪ", "history": "ˈhɪstəri", "hit": "hɪt", "hobby": "ˈhɒbi",
    "hold": "həʊld", "hole": "həʊl", "home": "həʊm", "hope": "həʊp", "horrible": "ˈhɒrəbl",
    "horse": "hɔːs", "hot": "hɒt", "hour": "ˈaʊə", "house": "haʊs", "huge": "hjuːdʒ",
    "human": "ˈhjuːmən", "hungry": "ˈhʌŋɡri", "hurry": "ˈhʌri", "hurt": "hɜːt", "husband": "ˈhʌzbənd",
    "ice": "aɪs", "idea": "aɪˈdɪə", "if": "ɪf", "ill": "ɪl", "improve": "ɪmˈpruːv",
    "information": "ˌɪnfəˈmeɪʃn", "insect": "ˈɪnsekt", "inside": "ɪnˈsaɪd", "instead": "ɪnˈsted",
    "instrument": "ˈɪnstrəmənt", "interest": "ˈɪntrest", "interesting": "ˈɪntrestɪŋ", "into": "ˈɪntu",
    "invite": "ɪnˈvaɪt", "island": "ˈaɪlənd", "job": "dʒɒb", "join": "dʒɔɪn", "joke": "dʒəʊk",
    "journey": "ˈdʒɜːni", "juice": "dʒuːs", "jump": "dʒʌmp", "keep": "kiːp", "kick": "kɪk",
    "kill": "kɪl", "kind": "kaɪnd", "king": "kɪŋ", "kiss": "kɪs", "knee": "niː",
    "knife": "naɪf", "know": "nəʊ", "lady": "ˈleɪdi", "land": "lænd", "language": "ˈlæŋɡwɪdʒ",
    "large": "lɑːdʒ", "last": "lɑːst", "laugh": "lɑːf", "law": "lɔː", "lawyer": "ˈlɔɪə",
    "lazy": "ˈleɪzi", "leaf": "liːf", "leave": "liːv", "left": "left", "leg": "leɡ",
    "lemon": "ˈlemən", "lend": "lend", "lesson": "ˈlesn", "library": "ˈlaɪbrəri", "lie": "laɪ",
    "match": "mætʃ", "miss": "mɪs", "present": "ˈpreznt", "ring": "rɪŋ", "rock": "rɒk",
    "save": "seɪv", "smell": "smel", "smoke": "sməʊk", "square": "skweə", "time": "taɪm",
    "wood": "wʊd", "towel": "ˈtaʊəl", "earth": "ɜːθ", "strawberry": "ˈstrɔːbəri", "include": "ɪnˈkluːd"
};

function run() {
    console.log("Fixing transcriptions final...");
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    
    for (const level of levels) {
        const generalPath = path.join(TRANS_DIR, `${level}_general.json`);
        if (!fs.existsSync(generalPath)) continue;
        
        const data = JSON.parse(fs.readFileSync(generalPath, "utf8"));
        let changed = false;
        
        for (const [key, val] of Object.entries(MASTER_DATA)) {
            // Якщо це слово належить до цього рівня (проста перевірка префіксу)
            // Ми просто додаємо в general, якщо його немає ніде
            if (!data[key]) {
                data[key] = val;
                changed = true;
            }
        }
        
        if (changed) {
            fs.writeFileSync(generalPath, JSON.stringify(data, null, "	") + "
", "utf8");
            console.log(`Updated ${level}_general.json`);
        }
    }
}
run();
