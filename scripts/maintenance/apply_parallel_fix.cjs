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

const batch15 = {
    "notably": { uk: "зокрема", pl: "w szczególności", de: "insbesondere", nl: "met name", el: "ιδίως", crh: "hususan" },
    "notorious": { uk: "горезвісний", pl: "cieszący się złą sławą", de: "berüchtigt", nl: "berucht", el: "διαβόητος", crh: "belli (fena cihetten)" },
    "nursery": { uk: "дитячий садок", pl: "żłobek", de: "Kindergarten", nl: "crèche", el: "βρεφονηπιακός σταθμός", crh: "bala bağçası" },
    "objection": { uk: "заперечення", pl: "sprzeciw", de: "Einwand", nl: "bezwaar", el: "ένσταση", crh: "itiraz" },
    "obsess": { uk: "переслідувати", pl: "mieć obsesję", de: "besessen sein", nl: "obsederen", el: "έχω εμμονή", crh: "tüşüncelerinden çıqarmaq" },
    "obsession": { uk: "одержимість", pl: "obsesja", de: "Besessenheit", nl: "obsessie", el: "εμμονή", crh: "sevda" },
    "occasional": { uk: "випадковий", pl: "sporadyczny", de: "gelegentlich", nl: "incidenteel", el: "περιστασιακός", crh: "ba'zı vaqıtları" },
    "occurrence": { uk: "випадок", pl: "zdarzenie", de: "Vorkommen", nl: "voorval", el: "γεγονός", crh: "vaqia" },
    "odds": { uk: "шанси", pl: "szanse", de: "Chancen", nl: "kansen", el: "πιθανότητες", crh: "ihtimal" },
    "offering": { uk: "пропозиція", pl: "oferta", de: "Angebot", nl: "aanbod", el: "προσφορά", crh: "bağış" },
    "offspring": { uk: "потомство", pl: "potomstwo", de: "Nachwuchs", nl: "nakomelingen", el: "απόγονος", crh: "nesil" },
    "operational": { uk: "оперативний", pl: "operacyjny", de: "betriebsbereit", nl: "operationeel", el: "επιχειρησιακός", crh: "işleyicideli" },
    "optical": { uk: "оптичний", pl: "optyczny", de: "optisch", nl: "optisch", el: "οπτικός", crh: "optik" },
    "optimism": { uk: "оптимізм", pl: "optymizm", de: "Optimismus", nl: "optimisme", el: "αισιοδοξία", crh: "optimizm" },
    "oral": { uk: "усний", pl: "ustny", de: "mündlich", nl: "mondeling", el: "προφορικός", crh: "ağızdan" },
    "organizational": { uk: "організаційний", pl: "organizacyjny", de: "organisatorisch", nl: "organisatorisch", el: "οργανωτικός", crh: "teşkilâtlı" },
    "orientation": { uk: "орієнтація", pl: "orientacja", de: "Orientierung", nl: "oriëntatie", el: "προσανατολισμός", crh: "yöneliş" },
    "outbreak": { uk: "спалах", pl: "wybuch", de: "Ausbruch", nl: "uitbraak", el: "ξέσπασμα", crh: "başlanğıç" },
    "outing": { uk: "прогулянка", pl: "wycieczka", de: "Ausflug", nl: "uitje", el: "εκδρομή", crh: "gezinti" },
    "outlet": { uk: "торгова точка", pl: "punkt sprzedaży", de: "Verkaufsstelle", nl: "outlet", el: "διέξοδος", crh: "çıqış" }
};

applyTranslations(batch15);
