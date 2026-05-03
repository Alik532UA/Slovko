import fs from 'fs';
import path from 'path';

const translationsMap = {
    "left": { en: "left", uk: "ліворуч", el: "αριστερά", nl: "links", de: "links", crh: "sol", pl: "lewo" },
    "apply": { en: "apply", uk: "застосовувати", el: "εφαρμόζω", nl: "toepassen", de: "anwenden", crh: "qullanmaq", pl: "stosować" },
    "certainly": { en: "certainly", uk: "звичайно", el: "βεβαίως", nl: "zeker", de: "gewiss", crh: "elbette", pl: "z pewnością" },
    "complaint": { en: "complaint", uk: "скарга", el: "παράπονο", nl: "klacht", de: "Beschwerde", crh: "şikâyet", pl: "skarga" },
    "simply": { en: "simply", uk: "просто", el: "αпλά", nl: "gewoon", de: "einfach", crh: "sade", pl: "po prostu" },
    "towel": { en: "towel", uk: "рушник", el: "πετσέτα", nl: "handdoek", de: "Handtuch", crh: "havlı", pl: "ręcznik" },
    "collision": { en: "collision", uk: "зіткнення", el: "σύγκρουση", nl: "botsing", de: "Kollision", crh: "toquşuv", pl: "kolizja" },
    "rely": { en: "rely", uk: "покладатися", el: "βασίζομαι", nl: "vertrouwen", de: "verlassen", crh: "itimat etmek", pl: "polegać" },
    "supply": { en: "supply", uk: "постачати", el: "προμηθεύω", nl: "leveren", de: "liefern", crh: "temin etmek", pl: "zaopatrywać" },
    "wage_hourly": { en: "wage", uk: "зарплата", el: "μισθός", nl: "loon", de: "Lohn", crh: "maaş", pl: "stawka godzinowa" },
    "bear_bear": { en: "bear", uk: "ведмідь", el: "αρκούδα", nl: "beer", de: "Bär", crh: "ayı", pl: "niedźwiedź" },
    "drive_verb": { en: "drive", uk: "водити", el: "οδηγώ", nl: "rijden", de: "fahren", crh: "sürmek", pl: "prowadzić" },
    "gas_gas": { en: "gas", uk: "бензин", el: "βενζίνη", nl: "benzine", de: "Benzin", crh: "benzin", pl: "benzyna" },
    "gas_gaz": { en: "gas", uk: "газ", el: "αέριο", nl: "gas", de: "Gas", crh: "gaz", pl: "gaz" },
    "pasta": { en: "pasta", uk: "паста", el: "ζυμαρικά", nl: "pasta", de: "Pasta", crh: "makarna", pl: "makaron" },
    "pasta_pasta": { en: "pasta", uk: "макарони", el: "ζυмаρικά", nl: "deegwaren", de: "Nudeln", crh: "makarna", pl: "makaron" },
    "I_pronoun": { en: "I", uk: "я", el: "εγώ", nl: "ik", de: "ich", crh: "men", pl: "ja" },
    "fireplace_kamin": { en: "fireplace", uk: "камін", el: "τζάκι", nl: "open haard", de: "Kamin", crh: "kamin", pl: "kominek" },
    "fireplace_ocaq": { en: "fireplace", uk: "вогнище", el: "εστία", nl: "open haard", de: "Kamin", crh: "ocaq", pl: "palenisko" },
    "good_morning": { en: "good morning", uk: "доброго ранку", el: "καλημέρα", nl: "goedemorgen", de: "guten Morgen", crh: "hayır sabahlar", pl: "dzień dobry" },
    "holiday_celebration": { en: "holiday", uk: "свято", el: "γιορτή", nl: "vakantie", de: "Ferien", crh: "bayрам", pl: "święto" },
    "holiday_tatil": { en: "holiday", uk: "відпустка", el: "διακοπές", nl: "vakantie", de: "Ferien", crh: "tatil", pl: "wakacje" },
    "like_verb": { en: "like", uk: "подобатися", el: "μου αρέσει", nl: "houden van", de: "mögen", crh: "beğenmek", pl: "lubić" },
    "live_verb": { en: "live", uk: "жити", el: "ζω", nl: "wonen", de: "leben", crh: "yaşamaq", pl: "żyć" },
    "no_negation": { en: "no", uk: "ні", el: "όχι", nl: "nee", de: "nein", crh: "yoq", pl: "nie" },
    "pot_pot": { en: "pot", uk: "каструля", el: "κατσαρόλα", nl: "pot", de: "Topf", crh: "tencere", pl: "garnek" },
    "than_conjunction": { en: "than", uk: "ніж", el: "από", nl: "dan", de: "als", crh: "daha", pl: "niż" },
    "too_adverb": { en: "too", uk: "надто", el: "πολύ", nl: "te", de: "zu", crh: "pek", pl: "zbyt" },
    "towel_havl": { en: "towel", uk: "рушник", el: "πετσέτα", nl: "handdoek", de: "Handtuch", crh: "havlı", pl: "ręcznik" },
    "towel_towel": { en: "towel", uk: "рушник", el: "πετσέτα", nl: "handdoek", de: "Handtuch", crh: "peskir", pl: "ręcznik" },
    "until_conjunction": { en: "until", uk: "до", el: "μέχρι", nl: "tot", de: "bis", crh: "qadar", pl: "aż do" },
    "while_conjunction": { en: "while", uk: "поки", el: "ενώ", nl: "terwijl", de: "während", crh: "ekende", pl: "podczas gdy" },
    "actual_fact": { en: "actual", uk: "фактичний", el: "πραγματικός", nl: "feitelijk", de: "tatsächlich", crh: "kerçek", pl: "rzeczywisty" },
    "adopt": { en: "adopt", uk: "усиновлювати", el: "υιοθετώ", nl: "adopteren", de: "adoptieren", crh: "evlatlıqqa almaq", pl: "adoptować" },
    "advance": { en: "advance", uk: "прогрес", el: "πρόοδος", nl: "vooruitgang", de: "Fortschritt", crh: "ilerleme", pl: "postęp" },
    "advocate_noun": { en: "advocate", uk: "прихильник", el: "υποστηрикτής", nl: "voorstander", de: "Befürworter", crh: "tarafdar", pl: "zwolennik" },
    "famine": { en: "famine", uk: "голод", el: "λιμός", nl: "hongersnood", de: "Hungersnot", crh: "clıq", pl: "głód" },
    "adequate": { en: "adequate", uk: "адекватний", el: "επαρκής", nl: "voldoende", de: "angemessen", crh: "yeterli", pl: "adekwatny" },
    "accustomed": { en: "accustomed", uk: "звиклий", el: "συνηθισлений", nl: "gewend", de: "gewohnt", crh: "alışqan", pl: "przyzwyczajony" },
    "administer": { en: "administer", uk: "здійснювати", el: "διαχειρίζομαι", nl: "beheren", de: "verwalten", crh: "idare etmek", pl: "zarządzać" },
    "emission": { en: "emission", uk: "викид", el: "εκπομπή", nl: "uitstoot", de: "Emission", crh: "yayıluv", pl: "emisja" }
};

const languages = ['uk', 'el', 'nl', 'de', 'crh', 'pl'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

languages.forEach(lang => {
    levels.forEach(level => {
        const dirPath = `src/lib/data/translations/${lang}/levels`;
        if (!fs.existsSync(dirPath)) return;
        
        const files = fs.readdirSync(dirPath).filter(f => f.startsWith(level) && f.endsWith('.json'));
        
        files.forEach(fileName => {
            const filePath = path.join(dirPath, fileName);
            let s = fs.readFileSync(filePath, 'utf8');
            let hasBOM = false;
            if (s.charCodeAt(0) === 0xFEFF) {
                s = s.slice(1);
                hasBOM = true;
            }
            
            try {
                const data = JSON.parse(s);
                let changed = false;
                
                // Read corresponding English file to know which keys belong here
                const enFilePath = path.join(`src/lib/data/translations/en/levels`, fileName);
                if (fs.existsSync(enFilePath)) {
                    let enS = fs.readFileSync(enFilePath, 'utf8');
                    if (enS.charCodeAt(0) === 0xFEFF) enS = enS.slice(1);
                    const enData = JSON.parse(enS);
                    
                    Object.keys(enData).forEach(key => {
                        if (!data[key] && translationsMap[key]) {
                            data[key] = translationsMap[key][lang];
                            changed = true;
                            console.log(`Added ${key} to ${filePath}`);
                        }
                    });
                }
                
                if (changed) {
                    const sorted = {};
                    Object.keys(data).sort().forEach(k => sorted[k] = data[k]);
                    fs.writeFileSync(filePath, (hasBOM ? '\ufeff' : '') + JSON.stringify(sorted, null, '\t') + '\n', 'utf8');
                }
            } catch (e) {
                console.error(`Error processing ${filePath}: ${e.message}`);
            }
        });
    });
});

console.log('✅ Synchronization completed.');
