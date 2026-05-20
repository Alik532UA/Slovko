
const fs = require('fs');
const langs = ['en', 'uk', 'pl', 'de', 'nl', 'el', 'crh'];

langs.forEach(lang => {
  const nounsPath = 'src/lib/data/translations/' + lang + '/levels/B1_nouns';
  if (fs.existsSync(nounsPath)) {
    let content = fs.readFileSync(nounsPath, 'utf8');
    const hasBOM = content.startsWith('\ufeff');
    if (hasBOM) content = content.substring(1);

    const lines = content.split('\n');
    const newLines = lines.filter(line => !line.includes('"monitor_screen"') && !line.includes('"monitor_verb"'));
    
    let newContent = newLines.join('\n');
    // Fix trailing comma before }
    newContent = newContent.replace(/,\s*(\r?\n\s*})/g, '$1');
    
    fs.writeFileSync(nounsPath, (hasBOM ? '\ufeff' : '') + newContent, 'utf8');
    console.log('Cleaned ' + nounsPath);
  }

  const verbsPath = 'src/lib/data/translations/' + lang + '/levels/B1_verbs.json';
  if (fs.existsSync(verbsPath)) {
    let content = fs.readFileSync(verbsPath, 'utf8');
    const hasBOM = content.startsWith('\ufeff');
    if (hasBOM) content = content.substring(1);
    
    let verbs = JSON.parse(content);
    
    const translations = {
      'en': 'monitor',
      'uk': 'спостерігати',
      'pl': 'monitorować',
      'de': 'überwachen',
      'nl': 'bewaken',
      'el': 'παρακολουθώ',
      'crh': 'közetmek'
    };
    
    verbs['monitor_verb'] = translations[lang];
    
    // Sort keys alphabetically
    const sortedVerbs = {};
    Object.keys(verbs).sort().forEach(key => {
      sortedVerbs[key] = verbs[key];
    });
    
    const json = JSON.stringify(sortedVerbs, null, '\t');
    fs.writeFileSync(verbsPath, (hasBOM ? '\ufeff' : '') + json, 'utf8');
    console.log('Updated ' + verbsPath);
  }
});
