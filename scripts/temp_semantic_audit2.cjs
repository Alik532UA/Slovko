/**
 * Semantic Audit Part 2: Deep cross-language validation
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
// CHECK: NL and DE - Find where NL/DE translation seems to be a different concept
// ==========================================
console.log('=== NL/DE: FLAT ===');
console.log('flat:', langs.map(l => `${l}="${allData[l]['flat']}"`).join(' | '));
console.log('flat_apartment:', langs.map(l => `${l}="${allData[l]['flat_apartment'] || 'MISSING'}"`).join(' | '));
console.log('flat_surface:', langs.map(l => `${l}="${allData[l]['flat_surface'] || 'MISSING'}"`).join(' | '));

console.log('\n=== LIGHT variants ===');
const lightKeys = enKeys.filter(k => k.startsWith('light'));
for (const k of lightKeys) {
  console.log(`${k}: ` + langs.map(l => `${l}="${allData[l][k] || '-'}"`).join(' | '));
}

// ==========================================
// BROAD POLYSEMY CHECK: Find ALL keys where same base word exists with/without suffix
// and check if the base key translation is wrong
// ==========================================
console.log('\n\n=== BASE vs SUFFIXED: Semantic consistency ===\n');

// Collect all base words that have suffixed variants
const baseWords = {};
for (const key of enKeys) {
  const parts = key.split('_');
  if (parts.length >= 2) {
    const possibleBase = parts[0];
    if (allData.en[possibleBase]) {
      if (!baseWords[possibleBase]) baseWords[possibleBase] = [];
      baseWords[possibleBase].push(key);
    }
  }
}

// For each base word with variants, check if NL/DE/PL chose the right meaning
console.log(`Base words with suffixed variants: ${Object.keys(baseWords).length}\n`);

const semanticIssues = [];
for (const [base, variants] of Object.entries(baseWords)) {
  // Check NL specifically (known to have issues)
  const nlBase = allData.nl[base];
  if (!nlBase) continue;
  
  for (const variant of variants) {
    const nlVariant = allData.nl[variant];
    if (!nlVariant) continue;
    
    // If base and variant have IDENTICAL NL translations, the variant's semantics isn't reflected
    if (nlBase === nlVariant && variants.length > 1) {
      // Check if other variants differ
      const otherVariantVals = variants
        .filter(v => v !== variant)
        .map(v => allData.nl[v])
        .filter(Boolean);
      
      if (otherVariantVals.length > 0 && otherVariantVals.some(v => v !== nlBase)) {
        semanticIssues.push({
          base, variant, nlBase, nlVariant,
          otherVariants: variants.filter(v => v !== variant).map(v => `${v}="${allData.nl[v] || '-'}"`)
        });
      }
    }
  }
}

console.log(`NL: base == variant (semantics not distinguished): ${semanticIssues.length}`);
for (const i of semanticIssues.slice(0, 25)) {
  console.log(`  "${i.base}"="${i.nlBase}" == "${i.variant}"="${i.nlVariant}"`);
  console.log(`    other variants: ${i.otherVariants.join(', ')}`);
}

// ==========================================
// CHECK: entail - from the cross_language_audit report
// "передбачати" used for both "predict" and "entail" - these are different!
// ==========================================
console.log('\n\n=== CHECK: UK "передбачати" overuse ===');
const peredbachaty = enKeys.filter(k => allData.uk[k] === 'передбачати');
for (const k of peredbachaty) {
  console.log(`  ${k}: EN="${allData.en[k]}" UK="${allData.uk[k]}" DE="${allData.de[k]}" NL="${allData.nl[k]}"`);
}

console.log('\n=== CHECK: UK "мати" confusion ===');
const maty = enKeys.filter(k => allData.uk[k] === 'мати');
for (const k of maty) {
  console.log(`  ${k}: EN="${allData.en[k]}" UK="${allData.uk[k]}" DE="${allData.de[k]}"`);
}

// ==========================================
// CHECK: Words where EN key doesn't match EN translation (potential wrong key assignment)
// ==========================================
console.log('\n\n=== EN KEY != EN VALUE (key/value mismatch) ===');
let mismatchCount = 0;
for (const key of enKeys) {
  const enVal = allData.en[key];
  // Simple keys (no underscore) should roughly match their value
  if (!key.includes('_') && enVal && key !== enVal && key.length > 3) {
    // Allow minor differences (plurals, etc)
    if (!enVal.toLowerCase().startsWith(key.toLowerCase().substring(0, 3))) {
      if (mismatchCount < 20) {
        console.log(`  ${key} -> "${enVal}" (file: ${fileMap.en[key]})`);
      }
      mismatchCount++;
    }
  }
}
console.log(`  Total key/value mismatches: ${mismatchCount}`);

// ==========================================
// CHECK: NL translations that are actually German
// ==========================================
console.log('\n\n=== NL values that look German (capitalized nouns) ===');
let germanInNl = 0;
for (const key of enKeys) {
  const nl = allData.nl[key];
  const de = allData.de[key];
  if (!nl || !de) continue;
  // German capitalizes nouns, Dutch doesn't (mostly)
  // If NL has a capitalized word (not start of sentence) that matches DE exactly
  if (nl === de && /^[A-Z][a-zäöüß]+$/.test(nl) && nl.length > 4) {
    if (germanInNl < 15) console.log(`  ${key}: NL="${nl}" DE="${de}" — might be German in NL`);
    germanInNl++;
  }
}
console.log(`  Total: ${germanInNl}`);
