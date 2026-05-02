const fs = require('fs');
const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];
const files = [
  'A1_general.json', 'A2_general.json', 'B1_general.json', 'B2_general.json', 'C1_general.json',
  'A2_adverbs.json', 'B1_clothes.json', 'B2_family.json', 'A2_family.json', 'B2_adverbs.json',
  'A2_pronouns.json', 'A2_home.json', 'A2_colors.json', 'A2_clothes.json', 'A2_cars.json',
  'B1_home.json', 'B1_animals.json', 'B2_animals.json', 'B1_nature.json', 'B1_food.json',
  'B2_nature.json', 'B1_travel.json', 'B2_abstract.json', 'B2_nouns.json', 'B1_nouns.json',
  'A2_nouns.json', 'A2_adjectives.json', 'A2_education.json', 'A2_food.json'
];

const dupesAll = JSON.parse(fs.readFileSync('.temp/duplicates_to_remove.json', 'utf8'));

files.forEach(file => {
  const dupes = dupesAll[file] || [];
  if (dupes.length === 0) return;
  
  langs.forEach(lang => {
    const filePath = `src/lib/data/translations/${lang}/levels/${file}`;
    if (!fs.existsSync(filePath)) return;
    const contentStr = fs.readFileSync(filePath, 'utf8');
    const hasBOM = contentStr.charCodeAt(0) === 0xFEFF;
    const content = JSON.parse(hasBOM ? contentStr.slice(1) : contentStr);
    
    let modified = false;
    dupes.forEach(k => {
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
console.log('Duplicates removed from all files directly!');
