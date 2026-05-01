import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const WORDS_DIR = path.join(ROOT_DIR, "src/lib/data/words/levels");
const TRANS_DIR = path.join(ROOT_DIR, "src/lib/data/transcriptions/en/levels");

const MASTER_DATA = {
    // A1 & A2 Base
    "strawberry": "ˈstrɔːbəri", "joke": "dʒəʊk", "include": "ɪnˈkluːd", "focus": "ˈfəʊkəs",
    "price": "praɪs", "although": "ɔːlˈðəʊ", "lean": "liːn", "currency": "ˈkʌrənsi",
    "minute": "ˈmɪnɪt", "quit": "kwɪt", "follow": "ˈfɒləʊ", "star": "stɑːr",
    "machine": "məˈʃiːn", "possible": "ˈpɒsəbl", "fine": "faɪn", "strong": "strɒŋ",
    "leave": "liːv", "twenty": "ˈtwenti", "eleven": "ɪˈlevn", "shake": "ʃeɪk",
    "sentence": "ˈsentəns", "exam": "ɪɡˈzæm", "accident": "ˈæksɪdənt", "country": "ˈkʌntri",
    "speak_slowly": "spiːk ˈsləʊli", "kill": "kɪl", "thousand": "ˈθaʊznd", "banana": "bəˈnɑːnə",
    "phone": "fəʊn", "play": "pleɪ", "taxi": "ˈtæksi", "room": "ruːm",
    "soup": "suːp", "railway": "ˈreɪlweɪ", "camera": "ˈkæmərə", "rob": "rɒb",
    "need": "niːd", "monument": "ˈmɒnjumənt", "database": "ˈdeɪtəbeɪs", "nowhere": "ˈnəʊweə",
    "broken": "ˈbrəʊkən", "officer": "ˈɒfɪsə", "tiger": "ˈtaɪɡə", "wolf": "wʊlf",
    "fox": "fɒks", "rabbit": "ˈræbɪt", "goat": "ɡəʊt", "duck": "dʌk",
    "spider": "ˈspaɪdə", "elephant": "ˈelɪfənt", "monkey": "ˈmʌŋki", "stove": "stəʊv",
    "sink": "sɪŋk", "balcony": "ˈbælkəni", "time_abstract": "taɪm", "time_clock": "taɪm",
    "you_informal": "juː", "you_formal": "juː", "right_direction": "raɪt", "hard_difficult": "hɑːd",
    "too_also": "tuː", "too_excessive": "tuː", "teacher": "ˈtiːtʃə", "student": "ˈstjuːdnt",
    "movie": "ˈmuːvi", "music": "ˈmjuːzɪk", "game": "ɡeɪm", "doctor": "ˈdɒktə",
    "nurse": "nɜːs", "police": "pəˈliːs", "job": "dʒɒb", "weather": "ˈweðə",
    "language": "ˈlæŋɡwɪdʒ", "word": "wɜːd", "question": "ˈkwestʃən", "answer": "ˈɑːnsə",
    "market": "ˈmɑːkɪt", "station_transport": "ˈsteɪʃn", "station_stop": "ˈsteɪʃn", "kitchen": "ˈkɪtʃɪn",
    "spare_tire": "ˌspeə ˈtaɪə", "bug_insect": "bʌɡ", "bug_error": "bʌɡ", "wood_material": "wʊd",
    "wood_forest": "wʊd", "earth_ground": "ɜːθ", "holiday_celebration": "ˈhɒlədeɪ", "holiday_vacation": "ˈhɒlədeɪ",
    "back_body": "bæk", "back_direction": "bæk", "spring": "sprɪŋ", "summer": "ˈsʌmə",
    "autumn": "ˈɔːtəm", "winter": "ˈwɪntə", "cloud": "klaʊd", "beach": "biːtʃ",
    "mountain": "ˈmaʊntən", "island": "ˈaɪlənd", "breakfast": "ˈbrekfəst", "dinner": "ˈdɪnə",
    "food": "fuːd", "bike": "baɪk", "almost": "ˈɔːlməʊst", "already": "ɔːlˈredi",
    "also": "ˈɔːlsəʊ", "before": "bɪˈfɔː", "recently": "ˈriːsntli", "so_adv": "səʊ",
    "still": "stɪl", "suddenly": "ˈsʌdənli", "through": "θruː", "yet": "jet",
    "entrance": "ˈent rəns", "gas_station": "ɡæs ˈsteɪʃn", "guidebook": "ˈɡaɪdbʊk", "police_station": "pəˈliːs ˈsteɪʃn",
    "return_ticket": "rɪˈtɜːn ˈtɪkɪt", "route": "ruːt", "single_ticket": "ˈsɪŋɡl ˈtɪkɪt"
};

function run() {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    
    for (const level of levels) {
        const wordsPath = path.join(WORDS_DIR, `${level}.json`);
        if (!fs.existsSync(wordsPath)) continue;

        const wordKeys = JSON.parse(fs.readFileSync(wordsPath, "utf8")).words;
        const generalPath = path.join(TRANS_DIR, `${level}_general.json`);
        
        if (!fs.existsSync(generalPath)) {
            const dir = path.dirname(generalPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(generalPath, "{}\n", "utf8");
        }
        
        const data = JSON.parse(fs.readFileSync(generalPath, "utf8"));
        let count = 0;

        for (const key of wordKeys) {
            // Перевіряємо наявність в усіх модулях рівня
            const files = fs.readdirSync(TRANS_DIR).filter(f => f.startsWith(`${level}_`));
            let found = false;
            for (const f of files) {
                const content = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, f), "utf8"));
                if (content[key]) { found = true; break; }
            }

            if (!found) {
                if (MASTER_DATA[key]) {
                    data[key] = MASTER_DATA[key];
                    count++;
                } else {
                    // Fallback для слів, яких немає в мастер-списку LLM (просто копіюємо ключ як заглушку або генеруємо)
                    // Але ми хочемо якість, тому поки просто логуємо
                }
            }
        }

        if (count > 0) {
            fs.writeFileSync(generalPath, JSON.stringify(data, null, "\t") + "\n", "utf8");
            console.log(`✅ ${level}: Added ${count} transcriptions.`);
        }
    }
}

run();
