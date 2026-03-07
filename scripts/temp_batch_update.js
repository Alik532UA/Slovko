const fs = require('fs');
const path = require('path');

const languages = ['crh', 'de', 'el', 'en', 'nl', 'pl', 'uk'];

// Task 1: UI i18n updates
const uiFiles = ['crh.json', 'de.json', 'el.json', 'nl.json'];
const uiAdditions = {
  de: {
    limitHint: "To be seen by others, you need to reach {required} {unit}",
    unitDays: "days in a row",
    unitCorrect: "correct answers",
    unitAttempts: "answers",
    unitCorrectStreak: "correct answers in a row",
    unitActiveDays: "active days"
  },
  el: {
    limitHint: "To be seen by others, you need to reach {required} {unit}",
    unitDays: "days in a row",
    unitCorrect: "correct answers",
    unitAttempts: "answers",
    unitCorrectStreak: "correct answers in a row",
    unitActiveDays: "active days"
  },
  nl: {
    limitHint: "To be seen by others, you need to reach {required} {unit}",
    unitDays: "days in a row",
    unitCorrect: "correct answers",
    unitAttempts: "answers",
    unitCorrectStreak: "correct answers in a row",
    unitActiveDays: "active days"
  },
  crh: {
    limitHint: "Digerleri sizi körmesi içün {required} {unit} toplamañız kerek",
    unitDays: "sırasınen kün",
    unitCorrect: "doğru cevaplar",
    unitAttempts: "cevaplar",
    unitCorrectStreak: "sırasınen doğru cevaplar",
    unitActiveDays: "aktiv künler"
  }
};

uiFiles.forEach(file => {
  const filePath = path.join('src/lib/i18n/translations', file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const lang = file.replace('.json', '');
    data.leaderboard = { ...data.leaderboard, ...uiAdditions[lang] };
    fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n');
  }
});

// Task 2: Dictionary C1/C2 additions
const dictionaryAdditions = {
  uk: {
    C1: { abolish: "скасувати", accord: "угода", adjustment: "коригування" },
    C2: { aberration_sapuv: "аберація", aberration_verirrung: "аберація" }
  },
  en: {
    C1: { abolish: "abolish", accord: "accord", adjustment: "adjustment" },
    C2: { aberration_sapuv: "aberration", aberration_verirrung: "aberration" }
  },
  pl: {
    C1: { abolish: "znosić", accord: "porozumienie", adjustment: "regulacja" },
    C2: { aberration_sapuv: "aberracja", aberration_verirrung: "aberracja" }
  },
  de: {
    C1: { abolish: "abschaffen", accord: "Abkommen", adjustment: "Anpassung" },
    C2: { aberration_sapuv: "Aberration", aberration_verirrung: "Aberration" }
  },
  nl: {
    C1: { abolish: "afschaffen", accord: "akkoord", adjustment: "aanpassing" },
    C2: { aberration_sapuv: "aberratie", aberration_verirrung: "aberratie" }
  },
  el: {
    C1: { abolish: "καταργώ", accord: "συμφωνία", adjustment: "προσαρμογή" },
    C2: { aberration_sapuv: "παρέκκλιση", aberration_verirrung: "παρέκκλιση" }
  },
  crh: {
    C1: { abolish: "bitirmek", accord: "anlaşma", adjustment: "ayarlama" },
    C2: { aberration_sapuv: "sapuv", aberration_verirrung: "sapuv" }
  }
};

languages.forEach(lang => {
  const c1Path = path.join('src/lib/data/translations', lang, 'levels/C1_general.json');
  if (fs.existsSync(c1Path)) {
    const data = JSON.parse(fs.readFileSync(c1Path, 'utf8'));
    Object.assign(data, dictionaryAdditions[lang].C1);
    fs.writeFileSync(c1Path, JSON.stringify(data, null, '\t') + '\n');
  }
  const c2Path = path.join('src/lib/data/translations', lang, 'levels/C2_general.json');
  if (fs.existsSync(c2Path)) {
    const data = JSON.parse(fs.readFileSync(c2Path, 'utf8'));
    Object.assign(data, dictionaryAdditions[lang].C2);
    fs.writeFileSync(c2Path, JSON.stringify(data, null, '\t') + '\n');
  }
});

// Task 3: Duplicate removal
const removals = [
  { file: 'B1_nouns_concrete.json', keys: ['also_addition', 'also_too', 'so_degree'] },
  { file: 'B2_nouns_abstract.json', keys: ['argument_dispute'] },
  { file: 'A2_basic_verbs.json', keys: ['call_phone'] },
  { file: 'A2_adjectives.json', keys: ['free_liberty'] },
  { file: 'A2_general.json', keys: ['left_direction', 'so_conjunction', 'watch_clock'] },
  { file: 'B1_nouns_abstract.json', keys: ['point_dot'] }
];

languages.forEach(lang => {
  removals.forEach(rem => {
    const filePath = path.join('src/lib/data/translations', lang, 'levels', rem.file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      rem.keys.forEach(key => delete data[key]);
      fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n');
    }
  });
});

console.log('Batch updates completed successfully.');
