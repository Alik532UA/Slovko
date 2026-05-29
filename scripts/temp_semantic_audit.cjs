/**
 * Semantic Correctness Audit
 * 
 * Strategy:
 * 1. Suffix validation: keys with _noun, _verb, _fruit etc. - check translations match the suffix
 * 2. Cross-language disagreement: if 5 langs agree on "noun" but 1 says "verb" 
 * 3. Polysemy detection: same EN word, wildly different translations suggest wrong meaning chosen
 * 4. Known confusables: bank, back, bat, match, etc.
 */

const fs = require('fs');
const path = require('path');

const langs = ['en', 'uk', 'el', 'nl', 'de', 'crh', 'pl'];
const baseDir = 'src/lib/data/translations';

// Load all data
const allData = {};
const fileMap = {};
for (const lang of langs) {
  allData[lang] = {};
  fileMap[lang] = {};
  const levelsDir = path.join(baseDir, lang, 'levels');
  if (!fs.existsSync(levelsDir)) continue;
  for (const file of fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'))) {
    let raw = fs.readFileSync(path.join(levelsDir, file), 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const data = JSON.parse(raw);
    for (const [k, v] of Object.entries(data)) {
      allData[lang][k] = v;
      fileMap[lang][k] = file;
    }
  }
}

const enKeys = Object.keys(allData.en);
console.log(`Total keys: ${enKeys.length}\n`);

// ==========================================
// CHECK 1: Suffix-based semantic validation
// ==========================================
console.log('=== CHECK 1: SUFFIX SEMANTIC VALIDATION ===\n');

// Map of suffixes to expected meaning context
const suffixMeanings = {
  '_noun': 'noun form',
  '_verb': 'verb form', 
  '_adj': 'adjective',
  '_adverb': 'adverb',
  '_fruit': 'fruit',
  '_color': 'color/adjective',
  '_river': 'river bank',
  '_finance': 'financial bank',
  '_body': 'body part',
  '_food': 'food item',
  '_animal': 'animal',
  '_music': 'music related',
  '_sport': 'sport',
  '_medical': 'medical',
  '_clothes': 'clothing',
  '_furniture': 'furniture',
  '_vehicle': 'vehicle',
  '_weather': 'weather',
  '_plant': 'plant',
  '_tool': 'tool',
  '_weapon': 'weapon',
  '_container': 'container',
  '_building': 'building',
  '_person': 'person/profession',
  '_place': 'place',
  '_time': 'time related',
  '_money': 'money/financial',
  '_court': 'court/legal',
  '_clock': 'timepiece',
  '_understand': 'comprehend',
  '_arrest': 'detain/arrest',
};

// Find keys where base and suffixed version have SAME translation (suffix not reflected)
const suffixIssues = [];
for (const key of enKeys) {
  // Find the base key for this suffixed key
  const lastUnderscore = key.lastIndexOf('_');
  if (lastUnderscore === -1) continue;
  const suffix = key.substring(lastUnderscore);
  if (!suffixMeanings[suffix]) continue;
  
  const baseKey = key.substring(0, lastUnderscore);
  
  // Check if base key exists and has same translation in some language
  for (const lang of langs) {
    if (lang === 'en') continue;
    const baseVal = allData[lang][baseKey];
    const suffixVal = allData[lang][key];
    if (!baseVal || !suffixVal) continue;
    
    // If base key has polysemy (/) but suffixed key ALSO has polysemy, that's suspicious
    if (suffixVal.includes(' / ') && suffixVal.length > 20) {
      suffixIssues.push({
        key, lang, suffix,
        baseKey, baseVal, suffixVal,
        reason: 'SUFFIX_STILL_POLYSEMIC'
      });
    }
  }
}

console.log(`Suffix keys still polysemic (should be resolved): ${suffixIssues.length}`);
for (const i of suffixIssues.slice(0, 20)) {
  console.log(`  [${i.lang}] ${i.key}: "${i.suffixVal}" (base "${i.baseKey}"="${i.baseVal}")`);
}
if (suffixIssues.length > 20) console.log(`  ... and ${suffixIssues.length - 20} more\n`);

// ==========================================
// CHECK 2: Cross-language semantic disagreement
// ==========================================
console.log('\n=== CHECK 2: CROSS-LANGUAGE SEMANTIC DISAGREEMENT ===\n');

// For polysemic English words, check if all languages chose the same meaning
// Strategy: if a word has known multiple meanings, check translations cluster into groups

// Known polysemic words and their meaning indicators
const polysemicChecks = {
  'bank': { meanings: { 'finance': ['банк', 'τράπεζα', 'bank', 'Bank', 'banka'], 'river': ['берег', 'όχθη', 'oever', 'Ufer', 'sahil', 'brzeg'] }},
  'bat': { meanings: { 'animal': ['кажан', 'νυχτερίδα', 'vleermuis', 'Fledermaus', 'yarasa', 'nietoperz'], 'sports': ['бита', 'ρόπαλο', 'knuppel', 'Schläger', 'sopa', 'kij'] }},
  'match': { meanings: { 'game': ['матч', 'αγώνας', 'wedstrijd', 'Spiel', 'maç', 'mecz'], 'fire': ['сірник', 'σπίρτο', 'lucifer', 'Streichholz', 'kibrit', 'zapałka'] }},
  'ring': { meanings: { 'jewelry': ['кільце', 'δαχτυλίδι', 'ring', 'Ring', 'yüzük', 'pierścionek'], 'sound': ['дзвінок', 'κουδούνισμα', 'bel', 'Klingeln', 'zıñ', 'dzwonek'] }},
  'spring': { meanings: { 'season': ['весна', 'άνοιξη', 'lente', 'Frühling', 'bahar', 'wiosna'], 'water': ['джерело', 'πηγή', 'bron', 'Quelle', 'bulaq', 'źródło'] }},
  'light': { meanings: { 'noun': ['світло', 'φως', 'licht', 'Licht', 'işıq', 'światło'], 'adj': ['легкий', 'ελαφρύς', 'licht', 'leicht', 'yeñil', 'lekki'] }},
  'fair': { meanings: { 'just': ['справедливий', 'δίκαιος', 'eerlijk', 'fair', 'adil', 'sprawiedliwy'], 'event': ['ярмарок', 'έκθεση', 'kermis', 'Messe', 'yarmarqa', 'jarmark'] }},
  'flat': { meanings: { 'apartment': ['квартира', 'διαμέρισμα', 'flat', 'Wohnung', 'kvartera', 'mieszkanie'], 'adj': ['плоский', 'επίπεδος', 'vlak', 'flach', 'yassu', 'płaski'] }},
  'novel': { meanings: { 'book': ['роман', 'μυθιστόρημα', 'roman', 'Roman', 'roman', 'powieść'], 'adj': ['новий', 'καινοτόμος', 'nieuw', 'neuartig', 'yañı', 'nowatorski'] }},
  'present': { meanings: { 'gift': ['подарунок', 'δώρο', 'cadeau', 'Geschenk', 'ediye', 'prezent'], 'time': ['теперішній', 'παρόν', 'huidig', 'gegenwärtig', 'azırğı', 'obecny'] }},
  'right': { meanings: { 'correct': ['правильний', 'σωστός', 'juist', 'richtig', 'doğru', 'prawidłowy'], 'direction': ['правий', 'δεξιά', 'rechts', 'rechts', 'sağ', 'prawy'] }},
  'watch': { meanings: { 'timepiece': ['годинник', 'ρολόι', 'horloge', 'Uhr', 'saat', 'zegarek'], 'verb': ['дивитися', 'παρακολουθώ', 'kijken', 'schauen', 'baqmaq', 'oglądać'] }},
  'sentence': { meanings: { 'grammar': ['речення', 'πρόταση', 'zin', 'Satz', 'cümle', 'zdanie'], 'legal': ['вирок', 'καταδίκη', 'straf', 'Strafe', 'ukm', 'wyrok'] }},
  'current': { meanings: { 'now': ['теперішній', 'τρέχων', 'huidig', 'aktuell', 'azırğı', 'obecny'], 'flow': ['течія', 'ρεύμα', 'stroom', 'Strom', 'aqıntı', 'prąd'] }},
  'issue': { meanings: { 'problem': ['проблема', 'ζήτημα', 'probleem', 'Problem', 'mesele', 'problem'], 'edition': ['випуск', 'τεύχος', 'uitgave', 'Ausgabe', 'nəşr', 'wydanie'] }},
};

console.log('Checking known polysemic words for cross-language meaning agreement:\n');

for (const [word, config] of Object.entries(polysemicChecks)) {
  // Find all keys related to this word
  const relatedKeys = enKeys.filter(k => k === word || k.startsWith(word + '_'));
  
  for (const key of relatedKeys) {
    const translations = {};
    for (const lang of langs) {
      translations[lang] = allData[lang][key] || null;
    }
    
    // Determine which meaning each language chose
    const langMeanings = {};
    for (const lang of langs.filter(l => l !== 'en')) {
      const val = translations[lang];
      if (!val) continue;
      
      let found = null;
      for (const [meaning, indicators] of Object.entries(config.meanings)) {
        if (indicators.some(ind => val.toLowerCase().includes(ind.toLowerCase()))) {
          found = meaning;
          break;
        }
      }
      langMeanings[lang] = found || 'unknown';
    }
    
    // Check if all languages agree
    const knownMeanings = Object.entries(langMeanings).filter(([, m]) => m !== 'unknown');
    const meaningSet = new Set(knownMeanings.map(([, m]) => m));
    
    if (meaningSet.size > 1) {
      console.log(`  ⚠️  ${key}: DISAGREEMENT`);
      for (const [lang, meaning] of Object.entries(langMeanings)) {
        console.log(`      ${lang}: ${meaning} ("${translations[lang]}")`);
      }
      console.log('');
    }
  }
}

// ==========================================
// CHECK 3: Translations that are suspiciously similar to wrong language
// ==========================================
console.log('\n=== CHECK 3: WRONG MEANING HEURISTICS ===\n');

// Check: key has a suffix indicating meaning A, but translation suggests meaning B
const wrongMeaningIssues = [];

// Helper: does the value look like a verb in the language?
function ukLooksLikeVerb(val) {
  return val && (val.endsWith('ти') || val.endsWith('тися') || val.endsWith('вати'));
}
function ukLooksLikeNoun(val) {
  // Nouns typically don't end in -ти
  return val && !val.endsWith('ти') && !val.endsWith('тися') && !val.endsWith('вати');
}

for (const key of enKeys) {
  const ukVal = allData.uk[key];
  if (!ukVal) continue;
  
  // Check noun-suffixed keys that got verb translations
  if (key.endsWith('_noun') && ukLooksLikeVerb(ukVal)) {
    wrongMeaningIssues.push({ key, lang: 'uk', val: ukVal, reason: 'NOUN_KEY_BUT_VERB_TRANSLATION' });
  }
  // Check verb-suffixed keys that got noun translations
  if (key.endsWith('_verb') && ukLooksLikeNoun(ukVal) && !ukVal.includes(' / ')) {
    // Only flag if it doesn't look like an infinitive
    if (!ukVal.endsWith('ння') && !ukVal.endsWith('ття')) { // these are verbal nouns
      wrongMeaningIssues.push({ key, lang: 'uk', val: ukVal, reason: 'VERB_KEY_BUT_NOUN_TRANSLATION' });
    }
  }
}

console.log(`Wrong part-of-speech (based on suffix): ${wrongMeaningIssues.length}`);
for (const i of wrongMeaningIssues.slice(0, 30)) {
  console.log(`  [${i.lang}] ${i.key}: "${i.val}" — ${i.reason}`);
}

// ==========================================
// CHECK 4: Duplicate translations suggesting wrong meaning
// ==========================================
console.log('\n\n=== CHECK 4: SAME TRANSLATION FOR DIFFERENT MEANINGS ===\n');

// If key_A and key_B have SAME translation in a language, but different EN values,
// one of them might be wrong
const ukTransMap = {};
for (const key of enKeys) {
  const uk = allData.uk[key];
  if (!uk || uk.includes(' / ')) continue;
  if (!ukTransMap[uk]) ukTransMap[uk] = [];
  ukTransMap[uk].push(key);
}

// Find UK translations that map to many different EN words (potential wrong meanings)
const suspiciousDuplicates = [];
for (const [ukWord, keys] of Object.entries(ukTransMap)) {
  if (keys.length > 3 && ukWord.length > 3) {
    // Check if EN words are actually different
    const enWords = keys.map(k => allData.en[k]);
    const uniqueEn = new Set(enWords);
    if (uniqueEn.size > 3) {
      suspiciousDuplicates.push({ ukWord, keys, enWords: [...uniqueEn] });
    }
  }
}

suspiciousDuplicates.sort((a, b) => b.keys.length - a.keys.length);
console.log(`UK words used for 4+ different EN concepts:`);
for (const item of suspiciousDuplicates.slice(0, 20)) {
  console.log(`  "${item.ukWord}" (${item.keys.length} keys): EN = ${item.enWords.slice(0, 6).join(', ')}${item.enWords.length > 6 ? '...' : ''}`);
}
console.log(`  Total: ${suspiciousDuplicates.length}`);
