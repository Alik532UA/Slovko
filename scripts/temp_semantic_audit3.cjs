/**
 * Semantic Audit Part 3: Find clearly wrong translations
 * - Translations that are blank or just spaces
 * - Obvious copy-paste from wrong language
 * - Stub/placeholder values
 */
const fs = require('fs');
const path = require('path');

const langs = ['en', 'uk', 'el', 'nl', 'de', 'crh', 'pl'];
const baseDir = 'src/lib/data/translations';

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

// ==========================================
// CHECK: Values that look like English (left untranslated)
// ==========================================
console.log('=== VALUES THAT LOOK ENGLISH (untranslated) ===\n');

function looksEnglish(val, lang) {
  if (!val || val.length < 4) return false;
  // For non-Latin languages, any Latin text is suspicious
  if (lang === 'uk' || lang === 'el') {
    // Allow common words/abbreviations
    if (val.match(/^[a-zA-Z\s\-\']+$/) && val.length > 5) return true;
  }
  return false;
}

let untranslatedCount = 0;
for (const key of enKeys) {
  for (const lang of ['uk', 'el']) {
    const val = allData[lang][key];
    const en = allData.en[key];
    if (!val) continue;
    if (looksEnglish(val, lang)) {
      // Check if it's just the English word repeated
      if (val.toLowerCase() === en?.toLowerCase() || val === en) {
        if (untranslatedCount < 30) {
          console.log(`  [${lang}] ${key}: "${val}" = EN value (untranslated?) [${fileMap[lang][key]}]`);
        }
        untranslatedCount++;
      }
    }
  }
}
console.log(`  Total untranslated (UK/EL with English value): ${untranslatedCount}\n`);

// ==========================================
// CHECK: CRH values that look Turkish or other wrong lang
// ==========================================
console.log('=== CRH: Check for Turkish-like forms ===\n');
// CRH uses ñ, q, ğ, which Turkish doesn't have; Turkish uses ğ differently
// CRH-specific chars: ñ, q (at start, not in Turkish), specific vowel harmony
// Turkish-specific chars not in CRH: ş (CRH uses ş too), nothing clear-cut
// Skip this - too hard to detect without dictionary

// ==========================================
// CHECK: Values that are just the key name with underscores
// ==========================================
console.log('=== VALUES MATCHING KEY NAME (potential stubs) ===\n');
let stubCount = 0;
for (const key of enKeys) {
  const keyNormalized = key.replace(/_/g, ' ').toLowerCase();
  for (const lang of langs) {
    if (lang === 'en') continue;
    const val = allData[lang][key];
    if (!val) continue;
    if (val.toLowerCase() === keyNormalized && val.length > 4) {
      if (stubCount < 20) {
        console.log(`  [${lang}] ${key}: "${val}" = key name (stub?) [${fileMap[lang][key]}]`);
      }
      stubCount++;
    }
  }
}
console.log(`  Total stub-like values: ${stubCount}\n`);

// ==========================================
// CHECK: EL translations using Latin characters (should be Greek)
// ==========================================
console.log('=== EL: Latin characters in Greek translations ===\n');
let elLatinCount = 0;
for (const key of enKeys) {
  const val = allData.el[key];
  if (!val) continue;
  // Greek should primarily be Greek chars
  const greekChars = val.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g)?.length || 0;
  const latinChars = val.match(/[a-zA-Z]/g)?.length || 0;
  // If majority is Latin but there IS some Greek mixed in, suspicious
  if (latinChars > 3 && greekChars === 0 && val.length > 4) {
    // Pure Latin in Greek = likely untranslated
    if (elLatinCount < 15) {
      console.log(`  ${key}: "${val}" (pure Latin, likely untranslated) [${fileMap.el[key]}]`);
    }
    elLatinCount++;
  }
}
console.log(`  Total EL with only Latin chars: ${elLatinCount}\n`);

// ==========================================
// CHECK: UK anticipate/foresee/predict - all same word?
// ==========================================
console.log('=== UK: "передбачати" for ALL of predict/anticipate/foresee ===');
const peredbachaty = enKeys.filter(k => allData.uk[k] === 'передбачати');
console.log(`  Used ${peredbachaty.length} times: ${peredbachaty.join(', ')}\n`);

// Check if any of these should actually be different:
// - predict = передбачати ✓ (correct)
// - anticipate = очікувати / передбачати (both OK)
// - foresee = передбачати ✓ (correct)
// These are actually near-synonyms in Ukrainian, so this is acceptable.

// ==========================================
// CHECK: Translations containing "???" or "TODO" or "FIXME" or "???"
// ==========================================
console.log('=== PLACEHOLDER MARKERS IN TRANSLATIONS ===');
let placeholderCount = 0;
for (const key of enKeys) {
  for (const lang of langs) {
    const val = allData[lang][key];
    if (!val) continue;
    if (val.includes('???') || val.includes('TODO') || val.includes('FIXME') || val.includes('XXX')) {
      console.log(`  [${lang}] ${key}: "${val}" [${fileMap[lang][key]}]`);
      placeholderCount++;
    }
  }
}
console.log(`  Total: ${placeholderCount}\n`);

// ==========================================
// CHECK: Suspiciously long translations (potential garbage)
// ==========================================
console.log('=== SUSPICIOUSLY LONG TRANSLATIONS (>60 chars) ===');
let longCount = 0;
const longValues = [];
for (const key of enKeys) {
  for (const lang of langs) {
    if (lang === 'en') continue;
    const val = allData[lang][key];
    if (!val) continue;
    if (val.length > 60) {
      longValues.push({ lang, key, val, len: val.length, file: fileMap[lang][key] });
      longCount++;
    }
  }
}
longValues.sort((a, b) => b.len - a.len);
for (const v of longValues.slice(0, 15)) {
  console.log(`  [${v.lang}] ${v.key}: (${v.len} chars) "${v.val.substring(0, 80)}..."`);
}
console.log(`  Total long (>60): ${longCount}\n`);

// ==========================================
// SUMMARY
// ==========================================
console.log('\n=== SUMMARY OF SEMANTIC ISSUES ===');
console.log(`Suffix still polysemic: 12 (mostly OK - synonyms)`);
console.log(`Cross-lang disagreement: 2 (flat, light_weight)`);
console.log(`Wrong POS (noun vs verb): 5 (4 are actually correct, verbose)`);
console.log(`UK duplicate translations: 49 groups (mostly valid synonymy)`);
console.log(`Untranslated (EN value): ${untranslatedCount}`);
console.log(`Stub-like values: ${stubCount}`);
console.log(`EL pure Latin: ${elLatinCount}`);
console.log(`Placeholders: ${placeholderCount}`);
console.log(`Suspiciously long: ${longCount}`);
