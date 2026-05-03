const fs = require('fs');
const path = require('path');

const langs = ['en', 'uk', 'el', 'nl', 'de', 'crh', 'pl'];
const baseDir = path.join(process.cwd(), 'src/lib/data/translations');

const updates = [
    {
        group: 'cousin',
        file: 'A1_general.json',
        data: {
            'cousin_female': ["cousin", "двоюрідна сестра", "ξαδέρφη", "nicht", "Cousine", "emce-tize qızı", "kuzynka"],
            'cousin_male': ["cousin", "двоюрідний брат", "ξάδερφος", "neef", "Cousin", "emce-tize balası", "kuzyn"]
        },
        cleanBase: {
            'uk': 'двоюрідний брат',
            'pl': 'kuzyn'
        }
    },
    {
        group: 'mine',
        file: 'A2_general.json',
        data: {
            'mine_possessive': ["mine", "мій", "δικός μου", "mijn", "mein", "menimki", "mój"],
            'mine_excavation': ["mine", "шахта", "ορυχείο", "mijn", "Mine", "maden", "kopalnia"]
        },
        cleanBase: {
            'uk': 'мій',
            'pl': 'mój'
        }
    },
    {
        group: 'crash',
        files: {
            'crash_accident': 'B1_nouns_concrete.json',
            'crash_verb': 'B1_verbs.json'
        },
        data: {
            'crash_accident': ["crash", "аварія", "σύγκρουση", "crash", "Absturz", "qaza", "katastrofa"],
            'crash_verb': ["crash", "розбиватися", "συντρίβομαι", "crashen", "abstürzen", "parçalanmaq", "rozbijać się"]
        },
        cleanBase: {
            'uk': 'аварія',
            'pl': 'katastrofa',
            'nl': 'crash',
            'de': 'Absturz'
        },
        baseKeyFile: 'B1_nouns_concrete.json'
    },
    {
        group: 'cure',
        file: 'B1_body_health.json',
        data: {
            'cure_medicine': ["cure", "ліки", "θεραπεία", "genezing", "Heilung", "ilâc", "lekarstwo"],
            'cure_verb': ["cure", "лікувати", "θεραπεύω", "genezen", "heilen", "tedavi etmek", "leczyć"]
        },
        cleanBase: {
            'uk': 'ліки',
            'pl': 'lekarstwo',
            'nl': 'genezing',
            'de': 'Heilung'
        }
    },
    {
        group: 'confidence',
        file: 'B1_nouns_abstract.json',
        data: {
            'confidence_assurance': ["confidence", "впевненість", "αυτοπεποίθηση", "zelfvertrouwen", "Selbstvertrauen", "özüne inam", "pewność siebie"],
            'confidence_trust': ["confidence", "довіра", "εμπιστοσύνη", "vertrouwen", "Vertrauen", "itam", "zaufanie"]
        },
        cleanBase: {
            'uk': 'впевненість',
            'crh': 'özüne inam'
        }
    },
    {
        group: 'trial',
        file: 'B1_nouns_concrete.json',
        data: {
            'trial_court': ["trial", "судовий процес", "δίκη", "proces", "Prozess", "mahkeme", "proces"],
            'trial_test': ["trial", "випробування", "δοκιμή", "proef", "Versuch", "sınav", "próba"]
        },
        cleanBase: {
            'uk': 'судовий процес',
            'pl': 'proces',
            'nl': 'proces',
            'de': 'Prozess'
        }
    },
    {
        group: 'collapse',
        files: {
            'collapse_noun': 'B1_nouns_concrete.json',
            'collapse_verb': 'B1_verbs.json'
        },
        data: {
            'collapse_noun': ["collapse", "крах", "κατάρρευση", "instorting", "Einsturz", "yığıluv", "zapaść"],
            'collapse_verb': ["collapse", "руйнуватися", "καταρρέω", "instorten", "zusammenbrechen", "yığılmaq", "zawalać się"]
        },
        cleanBase: {
            'uk': 'крах',
            'pl': 'zapaść',
            'nl': 'instorting',
            'de': 'Einsturz'
        },
        baseKeyFile: 'B1_nouns_concrete.json'
    },
    {
        group: 'cabin',
        file: 'B1_travel.json',
        data: {
            'cabin_plane': ["cabin", "салон літака", "θάλαμος επιβατών", "cabine", "Flugzeugkabine", "tayyare kabinası", "kabina samolotu"],
            'cabin_ship': ["cabin", "каюта", "καμπίνα", "hut", "Kabine", "kabina", "kajuta"]
        },
        cleanBase: {
            'uk': 'салон літака',
            'pl': 'kabina samolotu',
            'nl': 'cabine',
            'de': 'Flugzeugkabine'
        }
    },
    {
        group: 'approach',
        file: 'B1_verbs.json',
        data: {
            'approach_method': ["approach", "підхід", "προσέγγιση", "aanpak", "Ansatz", "usul", "podejście"],
            'approach_verb': ["approach", "наближатися", "πλησιάζω", "naderen", "nähern", "yaqınlaşmaq", "zbliżać się"]
        },
        cleanBase: {
            'uk': 'підхід',
            'pl': 'podejście',
            'nl': 'aanpak',
            'de': 'Ansatz'
        }
    }
];

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return {};
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.startsWith('\uFEFF')) {
        content = content.slice(1);
    }
    return JSON.parse(content);
}

function writeJson(filePath, data) {
    const content = '\uFEFF' + JSON.stringify(data, null, '\t');
    fs.writeFileSync(filePath, content, 'utf8');
}

langs.forEach((lang, langIdx) => {
    const langDir = path.join(baseDir, lang, 'levels');
    
    updates.forEach(update => {
        const group = update.group;
        
        // Update/Add specific keys
        if (update.file) {
            const filePath = path.join(langDir, update.file);
            const data = readJson(filePath);
            for (const [key, translations] of Object.entries(update.data)) {
                data[key] = translations[langIdx];
            }
            
            // Clean base key if in the same file
            if (update.cleanBase[lang]) {
                data[group] = update.cleanBase[lang];
            }
            
            writeJson(filePath, data);
        } else if (update.files) {
            // Keys are in different files
            for (const [key, fileName] of Object.entries(update.files)) {
                const filePath = path.join(langDir, fileName);
                const data = readJson(filePath);
                data[key] = update.data[key][langIdx];
                
                // Clean base key if it belongs to this file
                if (update.baseKeyFile === fileName && update.cleanBase[lang]) {
                    data[group] = update.cleanBase[lang];
                }
                
                writeJson(filePath, data);
            }
            
            // Handle base key if it's in another file not in update.files
            if (update.baseKeyFile && !Object.values(update.files).includes(update.baseKeyFile)) {
                 const filePath = path.join(langDir, update.baseKeyFile);
                 const data = readJson(filePath);
                 if (update.cleanBase[lang]) {
                     data[group] = update.cleanBase[lang];
                 }
                 writeJson(filePath, data);
            }
        }
    });
});

console.log('Batch update completed.');
