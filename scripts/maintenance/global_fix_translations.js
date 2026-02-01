import fs from 'fs';
import path from 'path';

const mapping = {
    // B2
    "drama_noun": "drama_art",
    "equivalent_noun": "equivalent_thing",
    "separate_verb": "separate_split",
    "state_verb": "state_declare",
    "support_verb": "support_help",
    "update_verb": "update_info",
    "approach_1": "approach_method",
    "claim_2": "claim_state",
    "explore_verb": "explore_research",
    "measure_2": "measure_size",
    "research_verb": "research_study",
    "review_verb": "review_examine",
    "treat_1": "treat_medical",
    "warn_verb": "warn_caution",
    "trial_1": "trial_court",
    "appendix_1": "appendix_anatomy",
    "appendix_2": "appendix_document"
};

const ukFixes = {
    "drama_art": "драма",
    "equivalent_thing": "еквівалент",
    "separate_split": "розділяти",
    "state_declare": "стверджувати",
    "support_help": "підтримувати",
    "update_info": "оновлювати",
    "approach_method": "підхід",
    "claim_state": "заявляти",
    "explore_research": "досліджувати",
    "measure_size": "вимірювати",
    "research_study": "досліджувати",
    "review_examine": "оглядати",
    "treat_medical": "лікувати",
    "warn_caution": "попереджати",
    "appeasement": "умиротворення",
    "trial_court": "судовий процес",
    "appendix_anatomy": "апендикс",
    "appendix_document": "додаток/доповнення",
    "wifi": "Wi-Fi"
};

const baseDir = 'src/lib/data';

function updateFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            updateFiles(fullPath);
        } else if (item.endsWith('.json')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let data;
            try {
                data = JSON.parse(content);
            } catch (e) { return; }

            let changed = false;

            if (fullPath.includes('words/levels') || fullPath.includes('words\\levels')) {
                if (data.words) {
                    data.words = data.words.map(w => {
                        if (mapping[w]) {
                            changed = true;
                            return mapping[w];
                        }
                        return w;
                    });
                }
            } else {
                const newData = {};
                for (const [key, value] of Object.entries(data)) {
                    let newKey = mapping[key] || key;
                    if (newKey !== key) changed = true;
                    
                    let newValue = value;
                    if (fullPath.includes('translations/uk') || fullPath.includes('translations\\uk')) {
                        if (ukFixes[newKey]) {
                            newValue = ukFixes[newKey];
                            changed = true;
                        }
                    }
                    newData[newKey] = newValue;
                }
                data = newData;
            }

            if (changed) {
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 4));
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

updateFiles(baseDir);
console.log('Global fix completed.');
