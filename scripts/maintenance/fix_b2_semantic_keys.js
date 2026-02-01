
import fs from 'fs';
import path from 'path';

const mapping = {
    "patient_1": "patient_medical",
    "patient_2": "patient_enduring",
    "cure_2": "cure_medicine",
    "medicine_1": "medicine_substance",
    "engine_1": "engine_motor",
    "party_1": "party_political",
    "state_2": "state_country",
    "serve_1": "serve_general",
    "trial_1": "trial_court",
    "accident_1": "accident_event",
    "accident_2": "accident_chance",
    "appeal_1": "appeal_request",
    "appeal_2": "appeal_attraction",
    "application_1": "application_software",
    "application_2": "application_request",
    "apply_1": "apply_use",
    "apply_2": "apply_job",
    "appointment_1": "appointment_meeting",
    "appointment_2": "appointment_job",
    "area_1": "area_place",
    "area_2": "area_subject",
    "argument_1": "argument_dispute",
    "argument_2": "argument_logic",
    "arm_1": "arm_body",
    "arm_2": "arm_weapon",
    "attraction_1": "attraction_feature",
    "attraction_2": "attraction_feeling",
    "authority_1": "authority_power",
    "authority_2": "authority_person",
    "actual_1": "actual_real",
    "actual_2": "actual_current",
    "action_1": "action_doing",
    "action_2": "action_legal",
    "argue_1": "argue_dispute",
    "argue_2": "argue_reason",
    "bear_1": "bear_animal",
    "bear_2": "bear_endure"
};

const ukFixes = {
    "patient_medical": "пацієнт",
    "patient_enduring": "терплячий",
    "cure_medicine": "лікування",
    "medicine_substance": "ліки",
    "engine_motor": "двигун",
    "party_political": "партія",
    "state_country": "держава",
    "serve_general": "служити",
    "trial_court": "судовий процес",
    "accident_event": "нещасний випадок",
    "accident_chance": "випадковість",
    "appeal_request": "апеляція",
    "appeal_attraction": "привабливість",
    "application_software": "додаток",
    "application_request": "заява",
    "apply_use": "застосовувати",
    "apply_job": "подавати заявку",
    "appointment_meeting": "зустріч",
    "appointment_job": "призначення на посаду",
    "area_place": "територія",
    "area_subject": "сфера",
    "argument_dispute": "суперечка",
    "argument_logic": "аргумент",
    "arm_body": "рука",
    "arm_weapon": "зброя",
    "attraction_feature": "атракціон/пам'ятка",
    "attraction_feeling": "потяг/симпатія",
    "authority_power": "влада",
    "authority_person": "авторитет (особа)",
    "actual_real": "фактичний",
    "actual_current": "теперішній",
    "action_doing": "дія",
    "action_legal": "позов",
    "argue_dispute": "сперечатися",
    "argue_reason": "аргументувати",
    "bear_animal": "ведмідь",
    "bear_endure": "терпіти"
};

// Files to update
const files = [
    'src/lib/data/words/levels/B2.json',
    'src/lib/data/transcriptions/levels/B2.json',
    'src/lib/data/translations/uk/levels/B2.json',
    'src/lib/data/translations/en/levels/B2.json',
    'src/lib/data/translations/de/levels/B2.json',
    'src/lib/data/translations/nl/levels/B2.json',
    'src/lib/data/translations/crh/levels/B2.json'
];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(content);

    if (filePath.includes('words/levels/')) {
        // Array of strings
        data.words = data.words.map(w => mapping[w] || w);
    } else {
        // Object keys
        const newData = {};
        for (const [key, value] of Object.entries(data)) {
            const newKey = mapping[key] || key;
            let newValue = value;
            
            // Apply UK fixes
            if (filePath.includes('translations/uk/')) {
                if (ukFixes[newKey]) {
                    newValue = ukFixes[newKey];
                }
            }
            
            // For other languages, if value was English and we renamed, keep it English for now but with new key
            // (Unless it's the English file itself)
            
            newData[newKey] = newValue;
        }
        data = newData;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Updated ${filePath}`);
});
