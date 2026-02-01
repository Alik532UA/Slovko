import fs from 'fs';
import path from 'path';

const issues = [
  { "file": "src/lib/data/translations/nl/levels/A1.json", "key": "later", "fixed": "later" },
  { "file": "src/lib/data/translations/nl/topics/time.json", "key": "later", "fixed": "later" },
  { "file": "src/lib/data/translations/nl/levels/B1.json", "key": "database", "fixed": "database" },
  { "file": "src/lib/data/translations/nl/topics/it.json", "key": "database", "fixed": "database" },
  { "file": "src/lib/data/translations/de/levels/B1.json", "key": "nation", "fixed": "Nation" },
  { "file": "src/lib/data/translations/de/levels/B1.json", "key": "moment", "fixed": "Moment" },
  { "file": "src/lib/data/translations/de/levels/B1.json", "key": "start_noun", "fixed": "Start" },
  { "file": "src/lib/data/translations/de/levels/B1.json", "key": "start_verb", "fixed": "starten" }
];

// Список всіх підозрілих ключів з попереднього аналізу
const allSuspicious = [
    "later", "hard", "free", "wake", "wild", "bet", "owe", "database_management", 
    "main", "drug", "database", "hostel", "airline", "alarm", "entail_involve", 
    "overlook_ignore", "seize_grab", "entail_cost", "annul", "apprise", "pardon", 
    "atm", "right", "nurse", "drop", "sorry_adj", "skate", "management", "moment", 
    "nation", "past", "rest", "start_noun", "start_verb", "tube", "bias_prejudice", 
    "realise_verb", "state_declare", "state_country", "adoption_1", "adoption_2"
];

const baseDir = 'src/lib/data/translations';

function cleanup() {
    const langs = ['nl', 'de'];
    langs.forEach(lang => {
        const langDir = path.join(baseDir, lang);
        if (!fs.existsSync(langDir)) return;

        const scan = (dir) => {
            fs.readdirSync(dir).forEach(item => {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    scan(fullPath);
                } else if (item.endsWith('.json')) {
                    let data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    let modified = false;

                    const enPath = fullPath.replace(path.join(baseDir, lang), path.join(baseDir, 'en'));
                    const enData = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};

                    for (const key of Object.keys(data)) {
                        const value = data[key];
                        const enValue = enData[key] || key;

                        // Перевірка на "сміття"
                        const isBad = value.length > enValue.length * 4 || /%s|\{|\}/.test(value) || value.includes('\t');
                        
                        if (isBad) {
                            // Якщо у нас є ручне виправлення — використовуємо його
                            const manual = issues.find(i => fullPath.includes(i.file.replace(/\//g, path.sep)) && i.key === key);
                            data[key] = manual ? manual.fixed : enValue;
                            modified = true;
                            console.log(`Cleaned up ${key} in ${fullPath}: ${value.substring(0, 20)}... -> ${data[key]}`);
                        }
                    }

                    if (modified) {
                        fs.writeFileSync(fullPath, JSON.stringify(data, null, 4));
                    }
                }
            });
        };
        scan(langDir);
    });
}

cleanup();