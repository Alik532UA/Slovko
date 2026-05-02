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
                if (translations[key] && translations[key][lang]) {
                    content[key] = translations[key][lang];
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(content, null, '\t'), 'utf8');
                console.log(`Updated keys in ${lang}/${file}`);
            }
        });
    });
}

const batch52 = {
    "villager": { uk: "селянин", pl: "mieszkaniec wsi", de: "Dorfbewohner", nl: "dorpsbewoner", el: "χωρικός", crh: "köylü" },
    "violation": { uk: "порушення", pl: "naruszenie", de: "Verletzung", nl: "schending", el: "παραβίαση", crh: "bozuv" },
    "virtue": { uk: "доброчесність", pl: "cnota", de: "Tugend", nl: "deugd", el: "αρετή", crh: "fazilet" },
    "vocal": { uk: "вокальний / голосний", pl: "wokalny", de: "vokal", nl: "vocaal", el: "φωνητικός", crh: "sesli" },
    "vow": { uk: "обітниця", pl: "ślubowanie", de: "Gelübde", nl: "gelofte", el: "όρκος", crh: "ant" },
    "vulnerability": { uk: "вразливість", pl: "wrażliwość", de: "Verwundbarkeit", nl: "kwetsbaarheid", el: "τρωτότητα", crh: "zayıflıq" },
    "vulnerable": { uk: "вразливий", pl: "wrażliwy", de: "verwundbar", nl: "kwetsbaar", el: "ευάλωτος", crh: "zayıf" },
    "ward": { uk: "палата / підопічний", pl: "oddział / podopieczny", de: "Station / Mündel", nl: "afdeling", el: "θάλαμος", crh: "qorçalangan" },
    "warehouse": { uk: "склад", pl: "magazyn", de: "Lagerhaus", nl: "magazijn", el: "αποθήκη", crh: "anbar" },
    "warfare": { uk: "війна", pl: "wojna", de: "Kriegführung", nl: "oorlogsvoering", el: "πόλεμος", crh: "cenk" },
    "warrior": { uk: "воїн", pl: "wojownik", de: "Krieger", nl: "krijger", el: "πολεμιστής", crh: "cenkçi" },
    "weaken": { uk: "послаблювати", pl: "osłabiać", de: "schwächen", nl: "verzwakken", el: "εξασθενώ", crh: "zayıflatmaq" },
    "weave": { uk: "ткати / плести", pl: "tkać", de: "weben", nl: "weven", el: "υφαίνω", crh: "toqumaq" },
    "weed": { uk: "бур'ян", pl: "chwast", de: "Unkraut", nl: "onkruid", el: "αγριόχορτο", crh: "ot" },
    "well-being": { uk: "добробут", pl: "dobrostan", de: "Wohlbefinden", nl: "welzijn", el: "ευεξία", crh: "eyilik" },
    "whatsoever": { uk: "будь-який", pl: "jakikolwiek", de: "überhaupt", nl: "wat dan ook", el: "οποιοσδήποτε", crh: "kim olsa" },
    "whereby": { uk: "за допомогою якого", pl: "za pomocą którego", de: "wodurch", nl: "waarbij", el: "με το οποίο", crh: "onıñnen" },
    "whilst": { uk: "в той час як", pl: "podczas gdy", de: "während", nl: "terwijl", el: "ενώ", crh: "eken" },
    "whip": { uk: "батіг", pl: "bicz", de: "Peitsche", nl: "zweep", el: "μαστίγιο", crh: "qamçı" },
    "wholly": { uk: "цілком", pl: "całkowicie", de: "völlig", nl: "volledig", el: "εξ ολοκλήρου", crh: "tamamile" },
    "widen": { uk: "розширювати", pl: "poszerzać", de: "erweitern", nl: "verbreden", el: "διευρύνω", crh: "kenişletmek" },
    "widow": { uk: "вдова", pl: "wdowa", de: "Witwe", nl: "weduwe", el: "χήρα", crh: "tul qadın" },
    "width": { uk: "ширина", pl: "szerokość", de: "Breite", nl: "breedte", el: "πλάτος", crh: "kenişlik" },
    "willingness": { uk: "готовність", pl: "gotowość", de: "Bereitschaft", nl: "bereidheid", el: "προθυμία", crh: "razılıq" },
    "wipe": { uk: "витирати", pl: "wycierać", de: "wischen", nl: "vegen", el: "σκουπίζω", crh: "silmek" },
    "wit": { uk: "дотепність", pl: "dowcip", de: "Witz", nl: "gevatheid", el: "πνεύμα", crh: "aqıl" },
    "withdrawal": { uk: "відкликання / вилучення", pl: "wycofanie", de: "Rückzug", nl: "opname", el: "απόσυρση", crh: "keri çekilüv" },
    "workout": { uk: "тренування", pl: "trening", de: "Training", nl: "training", el: "γυμναστική", crh: "meşq" },
    "worship": { uk: "поклоніння", pl: "uwielbienie", de: "Anbetung", nl: "aanbidding", el: "λατρεία", crh: "ibadet" },
    "worthwhile": { uk: "вартий уваги", pl: "wart zachodu", de: "lohnenswert", nl: "de moeite waard", el: "αξιόλογος", crh: "faydalı" },
    "worthy": { uk: "гідний", pl: "godny", de: "würdig", nl: "waardig", el: "άξιος", crh: "lâyıq" },
    "yell": { uk: "кричати", pl: "krzyczeць", de: "schreien", nl: "schreeuwen", el: "ουρλιάζω", crh: "baqırmaq" },
    "youngster": { uk: "юнак / підліток", pl: "młodzieniec", de: "Jugendlicher", nl: "jongere", el: "νεαρός", crh: "genç" }
};

applyTranslations(batch52);
