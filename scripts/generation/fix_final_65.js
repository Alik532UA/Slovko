import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../../src/lib/data/translations');

const DATA = {
  "crh": {
    "you_pronoun": "siz",
    "brother_male": "qardaş",
    "fireplace_hearth": "ocaq",
    "bell": "çan",
    "boil": "qaynatmaq",
    "bomb": "bomba",
    "bored": "zerikken",
    "bother": "raatsız etmek",
    "brand": "marka",
    "decipher_code": "şifreni açmaq"
  },
  "uk": {
    "you_pronoun": "ви",
    "branch_tak": "гілка",
    "earth_yer": "земля",
    "jam_jam": "варення",
    "pie_pie": "пиріг",
    "sausage_wurst": "ковбаса",
    "station_2": "станція",
    "station_bahnhof": "вокзал",
    "wood_bos": "ліс",
    "wood_holz": "деревина",
    "behavior": "поведінка",
    "belief": "віра",
    "bell": "дзвоник",
    "bother": "турбувати"
  },
  "nl": {
    "you_pronoun": "jij",
    "brother_male": "broer",
    "fireplace_hearth": "haard",
    "boil": "koken",
    "bomb": "bom",
    "bored": "verveeld",
    "bother": "storen",
    "brand": "merk"
  },
  "de": {
    "brother_male": "Bruder",
    "fireplace_hearth": "Kamin",
    "boil": "kochen",
    "bomb": "Bombe",
    "bored": "gelangweilt",
    "bother": "stören",
    "brand": "Marke"
  },
  "el": {
    "branch_tak": "κλαδί",
    "brother_male": "αδελφός",
    "drive_drive": "οδηγώ",
    "earth_yer": "γη",
    "fireplace_hearth": "τζάκι",
    "garden": "κήπος",
    "how_much": "πόσο",
    "jam_jam": "μαρμελάδα",
    "kind": "είδος",
    "office": "γραφείο",
    "our": "μας",
    "pie_pie": "πίτα",
    "sausage_wurst": "λουκάνικο",
    "sheep": "πρόβατο",
    "station_2": "σταθμός",
    "station_bahnhof": "σταθμός",
    "wood_bos": "δάσος",
    "wood_holz": "ξύλο",
    "your": "σου",
    "their": "τους",
    "them": "τους",
    "these": "αυτά",
    "they": "αυτοί",
    "this": "αυτό",
    "those": "εκείνα",
    "we": "εμείς"
  }
};

const FILES = [
    { lang: 'crh', level: 'A1', file: 'A1_pronouns_people.json', keys: ['you_pronoun'] },
    { lang: 'nl', level: 'A1', file: 'A1_pronouns_people.json', keys: ['you_pronoun'] },
    { lang: 'uk', level: 'A1', file: 'A1_pronouns_people.json', keys: ['you_pronoun'] },
    
    { lang: 'crh', level: 'A2', file: 'A2_family_relationships.json', keys: ['brother_male'] },
    { lang: 'crh', level: 'A2', file: 'A2_home.json', keys: ['fireplace_hearth'] },
    { lang: 'de', level: 'A2', file: 'A2_family_relationships.json', keys: ['brother_male'] },
    { lang: 'de', level: 'A2', file: 'A2_home.json', keys: ['fireplace_hearth'] },
    { lang: 'nl', level: 'A2', file: 'A2_family_relationships.json', keys: ['brother_male'] },
    { lang: 'nl', level: 'A2', file: 'A2_home.json', keys: ['fireplace_hearth'] },
    
    { lang: 'uk', level: 'A2', file: 'A2_nature.json', keys: ['branch_tak', 'earth_yer', 'wood_bos', 'wood_holz'] },
    { lang: 'uk', level: 'A2', file: 'A2_food.json', keys: ['jam_jam', 'pie_pie', 'sausage_wurst'] },
    { lang: 'uk', level: 'A2', file: 'A2_travel.json', keys: ['station_2', 'station_bahnhof'] },
    
    { lang: 'el', level: 'A2', file: 'A2_nature.json', keys: ['branch_tak', 'earth_yer', 'wood_bos', 'wood_holz', 'garden'] },
    { lang: 'el', level: 'A2', file: 'A2_family_relationships.json', keys: ['brother_male'] },
    { lang: 'el', level: 'A2', file: 'A2_basic_verbs.json', keys: ['drive_drive'] },
    { lang: 'el', level: 'A2', file: 'A2_home.json', keys: ['fireplace_hearth'] },
    { lang: 'el', level: 'A2', file: 'A2_food.json', keys: ['jam_jam', 'pie_pie', 'sausage_wurst'] },
    { lang: 'el', level: 'A2', file: 'A2_questions.json', keys: ['how_much'] },
    { lang: 'el', level: 'A2', file: 'A2_adjectives.json', keys: ['kind'] },
    { lang: 'el', level: 'A2', file: 'A2_education_work.json', keys: ['office'] },
    { lang: 'el', level: 'A2', file: 'A2_pronouns_people.json', keys: ['our', 'your'] },
    { lang: 'el', level: 'A2', file: 'A2_animals.json', keys: ['sheep'] },
    { lang: 'el', level: 'A2', file: 'A2_travel.json', keys: ['station_2', 'station_bahnhof'] },

    { lang: 'crh', level: 'B1', file: 'B1_general.json', keys: ['bell', 'brand'] },
    { lang: 'crh', level: 'B1', file: 'B1_verbs.json', keys: ['boil', 'bother'] },
    { lang: 'crh', level: 'B1', file: 'B1_nouns_abstract.json', keys: ['bomb'] },
    { lang: 'crh', level: 'B1', file: 'B1_adjectives.json', keys: ['bored'] },
    
    { lang: 'de', level: 'B1', file: 'B1_verbs.json', keys: ['boil', 'bother'] },
    { lang: 'de', level: 'B1', file: 'B1_nouns_abstract.json', keys: ['bomb'] },
    { lang: 'de', level: 'B1', file: 'B1_adjectives.json', keys: ['bored'] },
    { lang: 'de', level: 'B1', file: 'B1_general.json', keys: ['brand'] },

    { lang: 'nl', level: 'B1', file: 'B1_verbs.json', keys: ['boil', 'bother'] },
    { lang: 'nl', level: 'B1', file: 'B1_nouns_abstract.json', keys: ['bomb'] },
    { lang: 'nl', level: 'B1', file: 'B1_adjectives.json', keys: ['bored'] },
    { lang: 'nl', level: 'B1', file: 'B1_general.json', keys: ['brand'] },

    { lang: 'uk', level: 'B1', file: 'B1_nouns_abstract.json', keys: ['behavior', 'belief'] },
    { lang: 'uk', level: 'B1', file: 'B1_general.json', keys: ['bell'] },
    { lang: 'uk', level: 'B1', file: 'B1_verbs.json', keys: ['bother'] },

    { lang: 'el', level: 'B1', file: 'B1_pronouns_people.json', keys: ['their', 'them', 'these', 'they', 'this', 'those', 'we'] },
    
    { lang: 'crh', level: 'C1', file: 'C1_general.json', keys: ['decipher_code'] }
];

console.log("🚀 Running Final 65 Fix...");

FILES.forEach(({ lang, file, keys }) => {
    const filePath = path.join(BASE_DIR, lang, 'levels', file);
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    let modified = false;
    keys.forEach(key => {
        if (DATA[lang] && DATA[lang][key]) {
            if (!content[key]) {
                content[key] = DATA[lang][key];
                modified = true;
            }
        }
    });

    if (modified) {
        const sorted = Object.keys(content).sort().reduce((obj, key) => {
            obj[key] = content[key];
            return obj;
        }, {});
        fs.writeFileSync(filePath, JSON.stringify(sorted, null, '\t') + '\n');
        console.log(`✅ Updated ${lang}/${file}`);
    }
});

console.log("Done.");
