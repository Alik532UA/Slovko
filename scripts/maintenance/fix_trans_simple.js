import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const WORDS_DIR = path.join(ROOT_DIR, "src/lib/data/words/levels");
const TRANS_DIR = path.join(ROOT_DIR, "src/lib/data/transcriptions/en/levels");

// Велика база транскрипцій для відновлення
const MASTER_DATA = {
    "strawberry": "ˈstrɔːbəri", "joke": "dʒəʊk", "include": "ɪnˈkluːд",
    "beer": "bɪər", "teacher": "ˈtiːtʃər", "student": "ˈstjuːдnt", "movie": "ˈmuːvi",
    "music": "ˈmjuːzɪk", "game": "ɡeɪm", "doctor": "ˈдɒктər", "nurse": "nɜːrs",
    "police": "pəˈliːs", "job": "дʒɒb", "weather": "ˈweðər", "language": "ˈlæŋɡwɪдʒ",
    "word": "wɜːrд", "question": "ˈkwestʃən", "answer": "ˈænsər", "price": "praɪs",
    "market": "ˈmɑːrkɪt", "tiger": "ˈtaɪɡər", "wolf": "wʊlf", "fox": "fɒks",
    "rabbit": "ˈræbɪt", "goat": "ɡəʊt", "duck": "дʌк", "spider": "ˈspaɪдər",
    "elephant": "ˈelɪfənt", "monkey": "ˈmʌŋki", "stove": "stəʊv", "sink": "sɪŋk",
    "balcony": "ˈbælkəni", "time_abstract": "taɪm", "time_clock": "taɪm",
    "you_informal": "juː", "you_formal": "juː", "right_direction": "raɪt",
    "hard_difficult": "hɑːrд", "too_also": "tuː", "too_excessive": "tuː",
    "go_foot": "ɡəʊ", "go_vehicle": "ɡəʊ", "food": "fuːд", "breakfast": "ˈbrekfəst",
    "lunch": "lʌntʃ", "dinner": "ˈдɪnər", "meal": "miːl", "cafe": "kæˈfeɪ",
    "menu": "ˈmenjuː", "apartment": "əˈpɑːrtmənt", "kitchen": "ˈkɪtʃɪn", "floor": "flɔːr",
    "box": "bɒks", "phone": "fəʊn", "thing": "θɪŋ", "station": "ˈsteɪʃn",
    "world": "wɜːrlд", "country": "ˈkʌntri", "and_conjunction": "ænд", "but_conjunction": "bʌt",
    "or_conjunction": "ɔːr", "because_conjunction": "bɪˈkɒz", "if_conjunction": "ɪf",
    "children": "ˈtʃɪlдrən", "dad": "дæд", "mom": "mɑːm", "daughter": "ˈдɔːtər",
    "closed": "kləʊzд", "t_shirt": "ˈtiː ʃɜːrt", "glasses": "ˈɡlæsɪz", "not": "nɑːt",
    "sorry": "ˈsɑːri", "of": "əv", "ok": "ˌəʊˈkeɪ", "call": "kɔːl", "pay": "peɪ",
    "meet": "miːt", "learn": "lɜːrn", "change": "tʃeɪndʒ", "watch_verb": "wɑːtʃ",
    "follow": "ˈfɑːləʊ", "create": "kriˈeɪt", "speak": "spiːk", "read": "riːд",
    "spend": "spenд", "grow": "ɡrəʊ", "open": "ˈəʊpən", "walk": "wɔːк", "win": "wɪn",
    "offer": "ˈɑːfər", "remember": "rɪˈmembər", "buy": "baɪ", "wait": "weɪt",
    "die": "дaɪ", "send": "senд", "build": "bɪlд", "stay": "steɪ", "fall": "fɔːl",
    "cut": "kʌt", "kill": "kɪl", "raise": "reɪz", "pass": "pæs", "sell": "sel",
    "decide": "дɪˈsaɪд", "return": "rɪˈtɜːrn", "hope": "həʊp", "break": "breɪк",
    "cook": "kʊк", "swim": "swɪm", "drive": "дraɪv", "wash": "wɑːʃ", "clean": "kliːn",
    "dance": "дæns", "sing": "sɪŋ", "listen": "ˈlɪsn", "study": "ˈstʌдi",
    "travel": "ˈtrævl", "put": "pʊt", "close": "kləʊz", "finish": "ˈfɪnɪʃ",
    "clean_adj": "kliːn", "free": "friː", "open_adj": "ˈəʊpən", "grey": "ɡreɪ",
    "dark": "дɑːrk", "number": "ˈnʌmbər", "restaurant": "ˈrestrənt", "home": "həʊm",
    "picture": "ˈpɪktʃər", "television": "ˈtelɪvɪʒn", "radio": "ˈreɪдiəʊ",
    "light_object": "laɪt", "park": "pɑːrk", "bike": "baɪк", "shoe": "ʃuː",
    "watch_object": "wɑːtʃ", "so_conjunction": "səʊ", "thanks": "θæŋкс",
    "up": "ʌp", "дown": "дaʊn", "very": "ˈveri", "spring": "sprɪŋ", "summer": "ˈsʌmər",
    "autumn": "ˈɔːtəm", "winter": "ˈwɪntər", "cloud": "klaʊд", "beach": "biːtʃ",
    "mountain": "ˈmaʊntən", "island": "ˈaɪlənд"
};

function run() {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    for (const level of levels) {
        const p = path.join(TRANS_DIR, level + "_general.json");
        if (!fs.existsSync(p)) continue;
        const data = JSON.parse(fs.readFileSync(p, "utf8"));
        let count = 0;
        for (const [k, v] of Object.entries(MASTER_DATA)) {
            // Перевіряємо чи слово в Master List рівня
            const ml = JSON.parse(fs.readFileSync(path.join(WORDS_DIR, level + ".json"), "utf8"));
            if (ml.words.includes(k) && !data[k]) {
                data[k] = v;
                count++;
            }
        }
        if (count > 0) {
            fs.writeFileSync(p, JSON.stringify(data, null, "\t") + "\n");
            console.log("Updated", level, count);
        }
    }
}
run();
