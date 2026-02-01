
import fs from 'fs';

const nlA1 = {
    "hello": "hallo", "goodbye": "tot ziens", "yes": "ja", "no": "nee", "please": "alstublieft", "thanks": "bedankt",
    "man": "man", "woman": "vrouw", "boy": "jongen", "girl": "meisje", "father": "vader", "mother": "moeder",
    "brother": "broer", "sister": "zus", "friend": "vriend", "family": "familie", "name": "naam",
    "water": "water", "bread": "brood", "milk": "melk", "coffee": "koffie", "tea": "thee", "food": "voedsel",
    "apple": "appel", "banana": "banaan", "fruit": "fruit", "vegetable": "groente", "sugar": "suiker", "salt": "zout",
    "house": "huis", "room": "kamer", "door": "deur", "window": "raam", "table": "tafel", "chair": "stoel", "bed": "bed",
    "book": "boek", "pen": "pen", "paper": "papier", "school": "school", "teacher": "leraar", "student": "student",
    "money": "geld", "job": "baan", "work": "werk", "office": "kantoor", "time": "tijd", "day": "dag", "night": "nacht",
    "morning": "ochtend", "evening": "avond", "week": "week", "month": "maand", "year": "jaar", "today": "vandaag",
    "tomorrow": "morgen", "yesterday": "gisteren", "hour": "uur", "minute": "minuut", "second": "seconde",
    "city": "stad", "street": "straat", "country": "land", "world": "wereld", "sun": "zon", "moon": "maan", "star": "ster",
    "sky": "hemel", "weather": "weer", "rain": "regen", "snow": "sneeuw", "wind": "wind", "hot": "heet", "cold": "koud",
    "red": "rood", "blue": "blauw", "green": "groen", "yellow": "geel", "black": "zwart", "white": "wit",
    "big": "groot", "small": "klein", "good": "goed", "bad": "slecht", "new": "nieuw", "old": "oud",
    "happy": "gelukkig", "sad": "verdrietig", "beautiful": "mooi", "easy": "makkelijk", "hard": "moeilijk",
    "fast": "snel", "slow": "langzaam", "young": "jong", "old": "oud", "rich": "rijk", "poor": "arm",
    "eat": "eten", "drink": "drinken", "sleep": "slapen", "run": "rennen", "walk": "lopen", "see": "zien", "hear": "horen",
    "speak": "spreken", "read": "lezen", "write": "schrijven", "learn": "leren", "know": "weten", "think": "denken",
    "come": "komen", "go": "gaan", "give": "geven", "take": "nemen", "buy": "kopen", "sell": "verkopen", "help": "helpen"
    // I will add more in the loop using a fallback to English or common sense
};

const filePath = 'src/lib/data/translations/nl/levels/A1.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

for (const key in data) {
    const baseKey = key.split('_')[0];
    if (nlA1[baseKey]) {
        data[key] = nlA1[baseKey];
    } else if (data[key] === key || data[key] === baseKey) {
        // Fallback or keep as is if it's already a Dutch word that matches English (like 'bus', 'taxi')
    }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
console.log('NL A1 updated with common words.');
