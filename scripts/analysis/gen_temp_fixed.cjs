const fs = require('fs');

const files = ['el', 'de', 'nl', 'pl', 'crh'];

files.forEach(lang => {
  const fileToFix = `src/lib/data/translations/${lang}/levels/B2_general.json`;
  const duplicatesToRemove = JSON.parse(fs.readFileSync('.temp/duplicates_to_remove.json', 'utf8'))['B2_general.json'] || [];
  
  const contentStr = fs.readFileSync(fileToFix, 'utf8');
  const hasBOM = contentStr.charCodeAt(0) === 0xFEFF;
  const content = JSON.parse(hasBOM ? contentStr.slice(1) : contentStr);
  
  duplicatesToRemove.forEach(key => delete content[key]);
  
  const newJson = (hasBOM ? '\uFEFF' : '') + JSON.stringify(content, null, '\t') + '\n';
  fs.writeFileSync(`src/${lang}_fixed.json`, newJson, 'utf8');
});

console.log('Fixed files generated in src/');
