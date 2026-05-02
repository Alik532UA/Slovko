const fs = require('fs');
const path = require('path');

/**
 * Скрипт для паралельного оновлення перекладів у всіх мовах.
 * Приймає об'єкт: { "word_key": { uk: "...", pl: "...", ... } }
 */
function applyTranslations(translations) {
    const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
    const baseDir = 'src/lib/data/translations';

    langs.forEach(lang => {
        const langDir = path.join(baseDir, lang, 'levels');
        if (!fs.existsSync(langDir)) return;

        fs.readdirSync(langDir).forEach(file => {
            if (!file.endsWith('.json')) return;
            const filePath = path.join(langDir, file);
            let contentStr = fs.readFileSync(filePath, 'utf8');
            let content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
            let changed = false;

            Object.keys(content).forEach(key => {
                if (translations[key] && translations[key][lang]) {
                    content[key] = translations[key][lang];
                    changed = true;
                }
            });

            if (changed) {
                // Зберігаємо з UTF-8 BOM для Windows та табуляцією для стилю проєкту
                fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(content, null, '\t'), 'utf8');
                console.log(`Updated keys in ${lang}/${file}`);
            }
        });
    });
}

// Пакет перекладів (Batch #2)
const batch2 = {
    "gaze": { uk: "пильний погляд", el: "βλέμμα", de: "Blick", nl: "blik", pl: "spojrzenie", crh: "baqış" },
    "generic": { uk: "загальний", el: "γενικός", de: "allgemein", nl: "generiek", pl: "ogólny", crh: "umumiy" },
    "genocide": { uk: "геноцид", el: "γενοκτονία", de: "Genozid", nl: "genocide", pl: "ludobójstwo", crh: "soyqırım" },
    "glance": { uk: "швидкий погляд", el: "ματιά", de: "Blick", nl: "blik", pl: "rzut oka", crh: "köz taşlav" },
    "glimpse": { uk: "мигцем побачити", el: "φευγαλέα ματιά", de: "flüchtiger Blick", nl: "glimp", pl: "mignięcie", crh: "körüp qaluv" },
    "glorious": { uk: "славетний", el: "ένδοξος", de: "glorreich", nl: "glorieus", pl: "chwalebny", crh: "şanlı" },
    "glory": { uk: "слава", el: "δόξα", de: "Ruhm", nl: "glorie", pl: "chwała", crh: "şan" },
    "governance": { uk: "управління", el: "διακυβέρνηση", de: "Führung", nl: "bestuur", pl: "rządy", crh: "idare etüv" },
    "grace": { uk: "грація", el: "χάρη", de: "Gnade", nl: "gratie", pl: "wdzięk", crh: "lütuf" },
    "grasp": { uk: "зрозуміти", el: "κατανοώ", de: "begreifen", nl: "begrijpen", pl: "pojąć", crh: "añlamaq" },
    "gravity": { uk: "гравітація", el: "βαρύτητα", de: "Schwerkraft", nl: "zwaartekracht", pl: "grawitacja", crh: "yer çekimi" },
    "grid": { uk: "сітка", el: "πλέγμα", de: "Gitter", nl: "rooster", pl: "siatka", crh: "qafes" },
    "grief": { uk: "горе", el: "πένθος", de: "Trauer", nl: "verdriet", pl: "żal", crh: "keder" },
    "grin": { uk: "посмішка", el: "πλατύ χαμόγελο", de: "Grinsen", nl: "grijns", pl: "szeroki uśmiech", crh: "sırıruv" },
    "grind": { uk: "молоти", el: "αλέθω", de: "mahlen", nl: "malen", pl: "mleć", crh: "ögetmek" },
    "grip": { uk: "хватка", el: "λαβή", de: "Griff", nl: "greep", pl: "chwyt", crh: "tutuv" },
    "gross": { uk: "валовий", el: "ακαθάριστος", de: "brutto", nl: "bruto", pl: "brutto", crh: "kaba" },
    "guerrilla": { uk: "партизан", el: "αντάρτης", de: "Guerilla", nl: "guerrilla", pl: "partyzant", crh: "partizan" },
    "guidance": { uk: "керівництво", el: "καθοδήγηση", de: "Anleitung", nl: "begeleiding", pl: "wskazówki", crh: "yol kösterüv" },
    "guilt": { uk: "провина", el: "ενοχή", de: "Schuld", nl: "schuld", pl: "wina", crh: "qabaat" }
};

applyTranslations(batch2);
