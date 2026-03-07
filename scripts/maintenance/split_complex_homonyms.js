import fs from "fs";
import path from "path";

const baseDir = "src/lib/data/translations";
const languages = ["en", "uk", "el", "nl", "de", "crh", "pl"];

const splitMap = {
    "A1_travel.json": {
        "bank": { 
            "bank_finance": { en: "bank", uk: "банк", el: "τράπεζα", nl: "bank", de: "Bank", crh: "banka", pl: "bank" }
        }
    },
    "A2_general.json": {
        "match": {
            "match_game": { en: "match", uk: "матч", el: "αγώνας", nl: "wedstrijd", de: "Spiel", crh: "yarış", pl: "mecz" },
            "match_fire": { en: "match", uk: "сірник", el: "σπίρτο", nl: "lucifer", de: "Streichholz", crh: "kibrit", pl: "zapałka" }
        },
        "fine": {
            "fine_good": { en: "fine", uk: "чудовий", el: "ωραίος", nl: "fijn", de: "fein", crh: "eyidir", pl: "świetny" },
            "fine_penalty": { en: "fine", uk: "штраф", el: "πρόστιμο", nl: "boete", de: "Strafe", crh: "ceza", pl: "mandat" }
        }
    },
    "B1_nouns_abstract.json": {
        "subject": {
            "subject_school": { en: "subject", uk: "предмет", el: "μάθημα", nl: "vak", de: "Fach", crh: "fen", pl: "przedmiot" },
            "subject_topic": { en: "subject", uk: "тема", el: "θέμα", nl: "onderwerp", de: "Thema", crh: "mevzu", pl: "temat" }
        }
    },
    "C2_general.json": {
        "annex": {
            "annex_territory": { en: "annex", uk: "анексувати", el: "προσαρτώ", nl: "annexeren", de: "annektieren", crh: "işğal etmek", pl: "anektować" },
            "annex_document": { en: "annex", uk: "додаток", el: "προσάρτημα", nl: "bijlage", de: "Anhang", crh: "ilâve", pl: "załącznik" }
        }
    }
};

languages.forEach(lang => {
    for (const [file, splitKeys] of Object.entries(splitMap)) {
        const filePath = path.join(baseDir, lang, "levels", file);
        if (fs.existsSync(filePath)) {
            const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
            for (const [oldKey, newKeyConfig] of Object.entries(splitKeys)) {
                for (const [newKey, translations] of Object.entries(newKeyConfig)) {
                    content[newKey] = translations[lang] || translations["en"];
                }
                delete content[oldKey];
            }
            fs.writeFileSync(filePath, JSON.stringify(content, null, "\t"), "utf8");
            console.log(`Updated ${filePath}`);
        }
    }
});

// Update Master Lists
const levelsDir = "src/lib/data/words/levels";
for (const [file, splitKeys] of Object.entries(splitMap)) {
    const levelFile = file.split("_")[0] + ".json";
    const levelPath = path.join(levelsDir, levelFile);
    if (fs.existsSync(levelPath)) {
        const levelContent = JSON.parse(fs.readFileSync(levelPath, "utf8"));
        for (const [oldKey, newKeyConfig] of Object.entries(splitKeys)) {
            const newKeys = Object.keys(newKeyConfig);
            const index = levelContent.words.indexOf(oldKey);
            if (index !== -1) {
                levelContent.words.splice(index, 1, ...newKeys);
            }
        }
        // Deduplicate
        levelContent.words = [...new Set(levelContent.words)];
        fs.writeFileSync(levelPath, JSON.stringify(levelContent, null, "\t"), "utf8");
        console.log(`Updated Master List ${levelPath}`);
    }
}
