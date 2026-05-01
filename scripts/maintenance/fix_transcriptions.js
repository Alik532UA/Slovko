import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const WORDS_DIR = path.join(ROOT_DIR, "src/lib/data/words/levels");
const TRANS_DIR = path.join(ROOT_DIR, "src/lib/data/transcriptions/en/levels");

// Велика база транскрипцій для відновлення (зібрана LLM)
const MASTER_TRANS = {
    "strawberry": "ˈstrɔːbəri", "joke": "dʒəʊk", "include": "ɪnˈkluːd",
    "teacher": "ˈtiːtʃə", "student": "ˈstjuːdnt", "movie": "ˈmuːvi",
    "music": "ˈmjuːzɪk", "game": "ɡeɪm", "doctor": "ˈdɒktə",
    "nurse": "nɜːs", "police": "pəˈliːs", "job": "dʒɒb",
    "weather": "ˈweðə", "language": "ˈlæŋɡwɪdʒ", "word": "wɜːd",
    "question": "ˈkwestʃən", "answer": "ˈɑːnsə", "price": "praɪs",
    "market": "ˈmɑːkɪt", "tiger": "ˈtaɪɡə", "wolf": "wʊlf",
    "fox": "fɒks", "rabbit": "ˈræbɪt", "goat": "ɡəʊt",
    "duck": "dʌk", "spider": "ˈspaɪdə", "elephant": "ˈelɪfənt",
    "monkey": "ˈmʌŋki", "stove": "stəʊv", "sink": "sɪŋk",
    "balcony": "ˈbælkəni", "time_abstract": "taɪm", "time_clock": "taɪm",
    "you_informal": "juː", "you_formal": "juː", "right_direction": "raɪt",
    "hard_difficult": "hɑːd", "too_also": "tuː", "too_excessive": "tuː",
    "station_transport": "ˈsteɪʃn", "station_stop": "ˈsteɪʃn", "kitchen": "ˈkɪtʃɪn",
    "spare_tire": "ˌspeə ˈtaɪə", "bug_insect": "bʌɡ", "bug_error": "bʌɡ",
    "wood_material": "wʊd", "wood_forest": "wʊd", "earth_ground": "ɜːθ",
    "holiday_celebration": "ˈhɒlədeɪ", "holiday_vacation": "ˈhɒlədeɪ",
    "back_body": "bæk", "back_direction": "bæk", "spring": "sprɪŋ",
    "summer": "ˈsʌmə", "autumn": "ˈɔːtəm", "winter": "ˈwɪntə",
    "cloud": "klaʊd", "beach": "biːtʃ", "mountain": "ˈmaʊntən", "island": "ˈaɪlənd"
};

function run() {
    console.log("🚀 Starting systematic transcription recovery...");
    
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    
    for (const level of levels) {
        const wordsPath = path.join(WORDS_DIR, `${level}.json`);
        if (!fs.existsSync(wordsPath)) continue;

        const wordKeys = JSON.parse(fs.readFileSync(wordsPath, "utf8")).words;
        const generalPath = path.join(TRANS_DIR, `${level}_general.json`);
        
        if (!fs.existsSync(generalPath)) {
            fs.writeFileSync(generalPath, "{}\n", "utf8");
        }
        
        const generalData = JSON.parse(fs.readFileSync(generalPath, "utf8"));
        let count = 0;

        for (const key of wordKeys) {
            // Перевіряємо, чи є транскрипція в БУДЬ-ЯКОМУ модулі цього рівня
            const transFiles = fs.readdirSync(TRANS_DIR).filter(f => f.startsWith(`${level}_`));
            let found = false;
            for (const f of transFiles) {
                const data = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, f), "utf8"));
                if (data[key]) { found = true; break; }
            }

            if (!found && MASTER_TRANS[key]) {
                generalData[key] = MASTER_TRANS[key];
                count++;
            }
        }

        if (count > 0) {
            fs.writeFileSync(generalPath, JSON.stringify(generalData, null, "\t") + "\n", "utf8");
            console.log(`✅ Level ${level}: Added ${count} missing transcriptions to general module.`);
        }
    }
    console.log("\n✨ Done!");
}

run();