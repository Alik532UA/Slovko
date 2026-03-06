const fs = require('fs');
const path = require('path');
const langs = ['uk', 'en', 'de', 'crh', 'nl', 'el', 'pl'];

const dataMap = {
    aberration: {
        file: 'C2_general.json',
        keys: ['aberration_deviation', 'aberration_mental'],
        trans: {
            uk: { k1: 'відхилення', k2: 'заблудження', l1: 'норми', l2: 'розумове' },
            en: { k1: 'aberration', k2: 'aberration', l1: 'deviation', l2: 'mental' },
            de: { k1: 'Abweichung', k2: 'Verirrung', l1: 'Abweichung', l2: 'geistige' },
            nl: { k1: 'afwijking', k2: 'dwaling', l1: 'afwijking', l2: 'geestelijk' },
            crh: { k1: 'sapuv', k2: 'yañlışlıq', l1: 'sapuv', l2: 'fikir' },
            el: { k1: 'παρέκκλιση', k2: 'πλάνη', l1: 'απόκλιση', l2: 'πνευματική' },
            pl: { k1: 'aberracja', k2: 'odchylenie', l1: 'odchylenie', l2: 'umysłowe' }
        }
    },
    abolish: {
        file: 'C1_general.json',
        keys: ['abolish_law', 'abolish_system'],
        trans: {
            uk: { k1: 'скасовувати', k2: 'ліквідовувати', l1: 'закон', l2: 'устрій' },
            en: { k1: 'abolish', k2: 'abolish', l1: 'law', l2: 'system' },
            de: { k1: 'abschaffen', k2: 'aufheben', l1: 'Gesetz', l2: 'System' },
            nl: { k1: 'afschaffen', k2: 'opheffen', l1: 'wet', l2: 'systeem' },
            crh: { k1: 'bitirmek', k2: 'yoq etmek', l1: 'qanun', l2: 'tertib' },
            el: { k1: 'καταργώ', k2: 'καταργώ (σύστημα)', l1: 'νόμο', l2: 'σύστημα' },
            pl: { k1: 'znosić', k2: 'obalać', l1: 'prawo', l2: 'system' }
        }
    },
    accord: {
        file: 'C1_general.json',
        keys: ['accord_agreement', 'accord_harmony'],
        trans: {
            uk: { k1: 'згода', k2: 'гармонія', l1: 'договір', l2: 'співзвуччя' },
            en: { k1: 'accord', k2: 'accord', l1: 'agreement', l2: 'harmony' },
            de: { k1: 'Abkommen', k2: 'Einklang', l1: 'Vertrag', l2: 'Einklang' },
            nl: { k1: 'akkoord', k2: 'overeenstemming', l1: 'verdrag', l2: 'harmonie' },
            crh: { k1: 'anlaşma', k2: 'uyğunlıq', l1: 'anlaşma', l2: 'uyğunlıq' },
            el: { k1: 'συμφωνία', k2: 'αρμονία', l1: 'σύμβαση', l2: 'αρμονία' },
            pl: { k1: 'porozumienie', k2: 'zgoda', l1: 'umowa', l2: 'harmonia' }
        }
    },
    adjustment: {
        file: 'C1_general.json',
        keys: ['adjustment_change', 'adjustment_setting'],
        trans: {
            uk: { k1: 'регулювання', k2: 'налаштування', l1: 'зміна', l2: 'технічне' },
            en: { k1: 'adjustment', k2: 'adjustment', l1: 'change', l2: 'setting' },
            de: { k1: 'Anpassung', k2: 'Einstellung', l1: 'Änderung', l2: 'Einstellung' },
            nl: { k1: 'aanpassing', k2: 'afstelling', l1: 'verandering', l2: 'instelling' },
            crh: { k1: 'ayarlama', k2: 'tüzetüv', l1: 'tüzetüv', l2: 'ayarlama' },
            el: { k1: 'προσαρμογή', k2: 'ρύθμιση', l1: 'αλλαγή', l2: 'ρύθμιση' },
            pl: { k1: 'regulacja', k2: 'dostosowanie', l1: 'zmiana', l2: 'ustawienie' }
        }
    }
};

const TRANSLATIONS_DIR = path.join(process.cwd(), 'src/lib/data/translations');

langs.forEach(lang => {
    Object.entries(dataMap).forEach(([baseWord, config]) => {
        const filePath = path.join(TRANSLATIONS_DIR, lang, 'levels', config.file);
        if (!fs.existsSync(filePath)) return;
        
        let data = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF+/, ''));
        
        // Видаляємо старі варіанти (включаючи ті з суфіксами)
        delete data[baseWord];
        delete data[baseWord + '_sapuv'];
        delete data[baseWord + '_verirrung'];
        
        data[config.keys[0]] = config.trans[lang].k1;
        data[config.keys[1]] = config.trans[lang].k2;
        
        fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(data, null, '\t'), 'utf8');
        console.log(`Processed ${baseWord} for ${lang}`);

        const semPath = path.join(TRANSLATIONS_DIR, lang, 'semantics.json');
        if (fs.existsSync(semPath)) {
            let semData = JSON.parse(fs.readFileSync(semPath, 'utf8').replace(/^\uFEFF+/, ''));
            semData.labels = semData.labels || {};
            semData.labels[config.keys[0]] = config.trans[lang].l1;
            semData.labels[config.keys[1]] = config.trans[lang].l2;
            fs.writeFileSync(semPath, '\uFEFF' + JSON.stringify(semData, null, '\t'), 'utf8');
        }
    });
});
