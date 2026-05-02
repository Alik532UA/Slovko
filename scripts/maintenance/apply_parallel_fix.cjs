const fs = require('fs');
const path = require('path');

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
                const searchKey = key.toLowerCase();
                if (translations[key] || translations[searchKey]) {
                    const trans = translations[key] || translations[searchKey];
                    if (trans[lang]) {
                        content[key] = trans[lang];
                        changed = true;
                    }
                }
            });

            if (changed) {
                fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(content, null, '\t'), 'utf8');
                console.log(`Updated keys in ${lang}/${file}`);
            }
        });
    });
}

const batch107 = {
    "whereby": { uk: "за допомогою якого", el: "με το οποίο", de: "wodurch", nl: "waarbij", pl: "za pomocą którego", crh: "onıñnen" },
    "whilst": { uk: "в той час як", el: "ενώ", de: "während", nl: "terwijl", pl: "podczas gdy", crh: "eken" },
    "whip": { uk: "батіг", el: "μαστίγιο", de: "Peitsche", nl: "zweep", pl: "bicz", crh: "qamçı" },
    "wholly": { uk: "цілком", el: "εξ ολοκλήρου", de: "völlig", nl: "volledig", pl: "całkowicie", crh: "tamamile" },
    "widen": { uk: "розширювати", el: "διευρύνω", de: "erweitern", nl: "verbreden", pl: "poszerzać", crh: "kenişletmek" },
    "widow": { uk: "вдова", el: "χήρα", de: "Witwe", nl: "weduwe", pl: "wdowa", crh: "tul qadın" },
    "width": { uk: "ширина", el: "πλάτος", de: "Breite", nl: "breedte", pl: "szerokość", crh: "kenişlik" },
    "willingness": { uk: "готовність", el: "προθυμία", de: "Bereitschaft", nl: "bereidheid", pl: "gotowość", crh: "razılıq" },
    "wipe": { uk: "витирати", el: "σκουπίζω", de: "wischen", nl: "vegen", pl: "wycierać", crh: "silmek" },
    "wit": { uk: "дотепність", el: "πνεύμα", de: "Witz", nl: "gevatheid", pl: "dowcip", crh: "aqıl" },
    "withdrawal": { uk: "відкликання / вилучення", el: "απόσυρση", de: "Rückzug", nl: "opname", pl: "wycofanie", crh: "keri çekilüv" },
    "workout": { uk: "тренування", el: "γυμναστική", de: "Training", nl: "training", pl: "trening", crh: "meşq" },
    "worship": { uk: "поклоніння", el: "λατρεία", de: "Anbetung", nl: "aanbidding", pl: "uwielbienie", crh: "ibadet" },
    "worthwhile": { uk: "вартий уваги", el: "αξιόλογος", de: "lohnenswert", nl: "de moeite waard", pl: "wart zachodu", crh: "faydalı" },
    "worthy": { uk: "гідний", el: "άξιος", de: "würdig", nl: "waardig", pl: "godny", crh: "lâyıq" },
    "yell": { uk: "кричати", el: "ουρλιάζω", de: "schreien", nl: "schreeuwen", pl: "krzyczeć", crh: "baqırmaq" },
    "youngster": { uk: "юнак / підліток", el: "νεαρός", de: "Jugendlicher", nl: "jongere", pl: "młodzieniec", crh: "genç" },
    "zone": { uk: "зона", el: "ζώνη", de: "Zone", nl: "zone", pl: "strefa", crh: "zona" },
    "shampoo": { uk: "шампунь", el: "σαμπουάν", de: "Shampoo", nl: "shampoo", pl: "szampon", crh: "şampun" },
    "vase": { uk: "ваза", el: "βάζο", de: "Vase", nl: "vaas", pl: "wazon", crh: "vaza" },
    "sand": { uk: "пісок", el: "άμμος", de: "Sand", nl: "zand", pl: "piasek", crh: "qum" },
    "nation": { uk: "нація", el: "έθνος", de: "Nation", nl: "natie", pl: "naród", crh: "millet" },
    "expedition": { uk: "експедиція", el: "αποστολή", de: "Expedition", nl: "expeditie", pl: "ekspedycja", crh: "sefer" },
    "medium": { uk: "середній", el: "μέσο", de: "Medium", nl: "medium", pl: "średni", crh: "orta" },
    "mild": { uk: "м'який", el: "ήπιος", de: "mild", nl: "mild", pl: "łagodny", crh: "yımşaq" },
    "n.": { uk: "імен.", el: "ουσ.", de: "N.", nl: "znw.", pl: "rzecz.", crh: "is." },
    "rugby": { uk: "регбі", el: "ράγκμπι", de: "Rugby", nl: "rugby", pl: "rugby", crh: "regbi" },
    "studio": { uk: "студія", el: "στούντιο", de: "Studio", nl: "studio", pl: "studio", crh: "studiya" },
    "trend": { uk: "тенденція", el: "τάση", de: "Trend", nl: "trend", pl: "trend", crh: "temayül" },
    "trick": { uk: "трюк / хитрість", el: "κόλπο", de: "Trick", nl: "truc", pl: "sztuczka", crh: "hila" }
};

applyTranslations(batch107);
