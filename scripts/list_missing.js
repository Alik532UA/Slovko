
import fs from 'fs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node scripts/list_missing.js <analysisFile> <outputFile>');
    process.exit(1);
}

const [analysisFile, outputFile] = args;

if (!fs.existsSync(analysisFile)) {
    console.error(`Analysis file not found: ${analysisFile}`);
    process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));

const trulyMissing = analysis.missing.filter(item => !item.candidates || item.candidates.length === 0);

fs.writeFileSync(outputFile, JSON.stringify(trulyMissing.map(i => ({en: i.en, uk: i.uk})), null, 2));
console.log(`Wrote ${trulyMissing.length} missing items to ${outputFile}`);
