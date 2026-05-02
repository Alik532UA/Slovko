const fs = require('fs');
const path = require('path');
const enLevelsPath = path.join(__dirname, '../../src/lib/data/translations/en/levels');
const files = fs.readdirSync(enLevelsPath).filter(f => f.endsWith('.json'));

const wordMap = {};
for (const file of files) {
  try {
    let contentStr = fs.readFileSync(path.join(enLevelsPath, file), 'utf8');
    if (contentStr.charCodeAt(0) === 0xFEFF) {
      contentStr = contentStr.slice(1);
    }
    const content = JSON.parse(contentStr);
    for (const key of Object.keys(content)) {
      if (!wordMap[key]) wordMap[key] = [];
      wordMap[key].push(file);
    }
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
  }
}

const duplicatesToRemove = {};
for (const [key, locs] of Object.entries(wordMap)) {
  if (locs.length > 1) {
    let toRemove = [];
    // Always prefer to remove from a higher level, or from a "general" file if level is the same.
    // Let's define priority: A1 > A2 > B1 > B2 > C1 > C2
    const levelScore = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    
    // Sort locations by priority (keep the best one)
    locs.sort((a, b) => {
      const aLvl = levelScore[a.substring(0, 2)] || 99;
      const bLvl = levelScore[b.substring(0, 2)] || 99;
      if (aLvl !== bLvl) return aLvl - bLvl;
      // If same level, 'general' is worst, so it goes last (higher index)
      if (a.includes('general') && !b.includes('general')) return 1;
      if (!a.includes('general') && b.includes('general')) return -1;
      return 0; // alphabetical
    });

    // locs[0] is the one we KEEP. The rest are removed.
    for (let i = 1; i < locs.length; i++) {
       const rm = locs[i];
       if (!duplicatesToRemove[rm]) duplicatesToRemove[rm] = [];
       duplicatesToRemove[rm].push(key);
    }
  }
}

fs.writeFileSync(path.join(__dirname, '../../.temp/duplicates_to_remove.json'), JSON.stringify(duplicatesToRemove, null, 2));
console.log("Wrote .temp/duplicates_to_remove.json");
