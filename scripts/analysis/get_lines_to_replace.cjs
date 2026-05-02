const fs = require('fs');
const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];
const filesWithOneDupe = [
  {file: 'A2_adverbs.json', key: 'above'},
  {file: 'B1_clothes.json', key: 'boot'},
  {file: 'B2_family.json', key: 'cousin'},
  {file: 'A2_family.json', key: 'married'},
  {file: 'B2_adverbs.json', key: 'next_to'},
  {file: 'A2_pronouns.json', key: 'no_one'},
  {file: 'A1_general.json', key: 'now'},
  {file: 'A2_home.json', key: 'painting'},
  {file: 'A2_colors.json', key: 'purple'},
  {file: 'A2_clothes.json', key: 'sweater'},
  {file: 'A2_cars.json', key: 'traffic'},
  {file: 'B1_home.json', key: 'tv'},
  {file: 'B1_animals.json', key: 'bat'},
  {file: 'B2_animals.json', key: 'bee'},
  {file: 'B1_nature.json', key: 'desert'},
  {file: 'B1_food.json', key: 'nut'},
  {file: 'B2_nature.json', key: 'ocean'},
  {file: 'B1_travel.json', key: 'reception'},
  {file: 'B2_abstract.json', key: 'magic'}
];

for (const {file, key} of filesWithOneDupe) {
  langs.forEach(lang => {
    const path = `src/lib/data/translations/${lang}/levels/${file}`;
    if (fs.existsSync(path)) {
      const lines = fs.readFileSync(path, 'utf8').split('\n');
      const line = lines.find(l => l.includes(`"${key}":`));
      if (line) {
        console.log(`${lang}|${file}|${line}`);
      }
    }
  });
}
