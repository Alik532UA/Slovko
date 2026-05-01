import fs from "fs";
import path from "path";

const baseDir = "src/lib/data/translations";
const languages = ["en", "uk", "el", "nl", "de", "crh", "pl"];

const newKeys = {
    "A1_general.json": {
        "break_verb": { en: "break", uk: "ламати", el: "σπάω", nl: "breken", de: "brechen", crh: "uvalamaq", pl: "łamać" },
        "break_pause": { en: "break", uk: "перерва", el: "διάλειμμα", nl: "pauze", de: "Pause", crh: "tenefüs", pl: "przerwa" },
        "watch_verb": { en: "watch", uk: "дивитися", el: "παρακολουθώ", nl: "kijken", de: "schauen", crh: "baqmaq", pl: "oglądać" },
        "watch_clock": { en: "watch", uk: "годинник", el: "ρολόι", nl: "horloge", de: "Uhr", crh: "saat", pl: "zegarek" }
    },
    "A1_food.json": {
        "orange_color": { en: "orange", uk: "помаранчевий", el: "πορτοκαλί", nl: "oranje", de: "orange", crh: "turuncu", pl: "pomarańczowy" },
        "orange_fruit": { en: "orange", uk: "апельсин", el: "πορτοκάλι", nl: "sinaasappel", de: "Orange", crh: "turunç", pl: "pomarańcza" }
    }
};

languages.forEach(lang => {
    for (const [file, keys] of Object.entries(newKeys)) {
        const filePath = path.join(baseDir, lang, "levels", file);
        if (fs.existsSync(filePath)) {
            const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
            for (const [key, translations] of Object.entries(keys)) {
                content[key] = translations[lang] || translations["en"];
            }
            // Видаляємо старі ключі якщо вони залишились
            delete content["break"];
            delete content["watch"];
            delete content["orange"];
            
            fs.writeFileSync(filePath, JSON.stringify(content, null, "\t"), "utf8");
            console.log(`Updated ${filePath}`);
        }
    }
});
