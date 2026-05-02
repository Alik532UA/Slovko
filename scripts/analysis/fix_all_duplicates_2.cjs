const fs = require('fs');

const duplicates = [
{key: 'agent', files: ['B1_general.json', 'B2_adjectives.json']},
{key: 'agreement', files: ['B1_general.json', 'B2_adjectives.json']},
{key: 'airline', files: ['A2_general.json', 'B2_travel.json']},
{key: 'alive', files: ['A2_general.json', 'B1_adjectives.json']},
{key: 'alternative', files: ['A2_general.json', 'B1_adjectives.json']},
{key: 'ambitious', files: ['B1_general.json', 'B2_adjectives.json']},
{key: 'ankle', files: ['A2_general.json', 'B1_body_health.json']},
{key: 'appeal', files: ['B1_general.json', 'B2_adjectives.json']},
{key: 'armchair', files: ['A2_general.json', 'B2_home.json']},
{key: 'arrangement', files: ['A2_general.json', 'B1_adjectives.json']},
{key: 'audio', files: ['A2_general.json', 'B2_it.json']},
{key: 'chip', files: ['A2_general.json', 'B1_it.json']},
{key: 'colleague', files: ['A2_general.json', 'B1_family.json']},
{key: 'communicate', files: ['A2_general.json', 'B1_verbs.json']},
{key: 'continent', files: ['A2_general.json', 'B2_travel.json']},
{key: 'creative', files: ['A2_general.json', 'B1_adjectives.json']},
{key: 'curtain', files: ['B1_general.json', 'B2_home.json']},
{key: 'definitely', files: ['A2_general.json', 'B1_adverbs.json']},
{key: 'dentist', files: ['A2_general.json', 'B1_body_health.json']},
{key: 'design', files: ['A1_general.json', 'A2_basic.json']},
{key: 'detail', files: ['A1_general.json', 'A2_abstract.json']},
{key: 'divorced', files: ['A2_general.json', 'B1_family.json']},
{key: 'email', files: ['A1_general.json', 'A2_it.json']},
{key: 'employee', files: ['A2_general.json', 'B1_education.json']},
{key: 'employer', files: ['A2_general.json', 'B1_education.json']},
{key: 'energy', files: ['A2_general.json', 'B1_abstract.json']},
{key: 'error', files: ['A2_general.json', 'B1_it.json']},
{key: 'exist', files: ['A2_general.json', 'B1_verbs.json']},
{key: 'explain', files: ['A1_general.json', 'A2_questions.json']},
{key: 'explanation', files: ['A2_general.json', 'B1_abstract.json']},
{key: 'extremely', files: ['A2_general.json', 'B1_adverbs.json']},
{key: 'flight', files: ['A1_general.json', 'A2_travel.json']},
{key: 'flu', files: ['A2_general.json', 'B1_body_health.json']},
{key: 'hardware', files: ['B1_general.json', 'B2_it.json']},
{key: 'however', files: ['A1_general.json', 'B1_adverbs.json']},
{key: 'jam', files: ['A2_general.json', 'B2_food.json']},
{key: 'journey', files: ['A1_general.json', 'A2_travel.json']},
{key: 'laughter', files: ['A2_general.json', 'B1_abstract.json']},
{key: 'mostly', files: ['A2_general.json', 'B1_adverbs.json']},
{key: 'nicely', files: ['A2_general.json', 'B1_adverbs.json']},
{key: 'opinion', files: ['A1_general.json', 'A2_abstract.json']},
{key: 'passport', files: ['A1_general.json', 'A2_travel.json']},
{key: 'pasta', files: ['A2_general.json', 'B2_food.json']},
{key: 'post', files: ['A1_general.json', 'A2_basic.json']},
{key: 'rather', files: ['A2_general.json', 'B1_adverbs.json']},
{key: 'realize', files: ['A2_general.json', 'B1_verbs.json']},
{key: 'recognize', files: ['A2_general.json', 'B1_verbs.json']},
{key: 'remove', files: ['A2_general.json', 'B1_verbs.json']},
{key: 'repeat', files: ['A1_general.json', 'A2_questions.json']},
{key: 'sheep', files: ['A1_general.json', 'A2_animals.json']},
{key: 'snake', files: ['A1_general.json', 'A2_animals.json']},
{key: 'website', files: ['A1_general.json', 'A2_it.json']}
];

const levelScore = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
const toRemove = {};

for (const d of duplicates) {
    let locs = d.files;
    locs.sort((a, b) => {
      const aLvl = levelScore[a.substring(0, 2)] || 99;
      const bLvl = levelScore[b.substring(0, 2)] || 99;
      if (aLvl !== bLvl) return aLvl - bLvl;
      if (a.includes('general') && !b.includes('general')) return 1;
      if (!a.includes('general') && b.includes('general')) return -1;
      return 0;
    });
    
    for (let i = 1; i < locs.length; i++) {
       const rm = locs[i];
       if (!toRemove[rm]) toRemove[rm] = [];
       toRemove[rm].push(d.key);
    }
}

const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];

Object.keys(toRemove).forEach(file => {
    langs.forEach(lang => {
        const filePath = `src/lib/data/translations/${lang}/levels/${file}`;
        if (!fs.existsSync(filePath)) return;
        const contentStr = fs.readFileSync(filePath, 'utf8');
        const hasBOM = contentStr.charCodeAt(0) === 0xFEFF;
        const content = JSON.parse(hasBOM ? contentStr.slice(1) : contentStr);
        let modified = false;
        toRemove[file].forEach(k => {
          if (k in content) {
            delete content[k];
            modified = true;
          }
        });
        if (modified) {
          const newJson = (hasBOM ? '\uFEFF' : '') + JSON.stringify(content, null, '\t') + '\n';
          fs.writeFileSync(filePath, newJson, 'utf8');
        }
    });
});
console.log('All remaining duplicates removed!');
