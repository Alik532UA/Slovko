
import fs from 'fs';
import path from 'path';

const baseDir = 'src/lib/data/translations';
const languages = ['uk', 'crh', 'nl', 'de'];
const report = [];

function scanDir(dir, lang) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath, lang);
        } else if (item.endsWith('.json')) {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            for (const [key, value] of Object.entries(content)) {
                const issues = [];
                
                // 1. Check for numeric suffixes
                if (key.match(/_\d+$/)) {
                    issues.push('Non-semantic key (numeric suffix)');
                }

                // 2. Check for missing translation (value matches English key)
                // This is a heuristic: if value is identical to key and key looks like English
                if (key.replace(/_\d+$/, '') === value && lang !== 'en') {
                    issues.push('Potential missing translation (value equals key)');
                }

                // 3. Check for English text in non-English files (simple regex for Latin letters only)
                if (lang !== 'en' && typeof value === 'string' && value.match(/^[a-zA-Z\s\-]+$/) && value.length > 0) {
                    // Filter out some common false positives if necessary, but for now list them
                    if (!issues.includes('Potential missing translation (value equals key)')) {
                         issues.push('English text in ' + lang + ' localization');
                    }
                }

                if (issues.length > 0) {
                    report.push({
                        file: fullPath,
                        lang: lang,
                        key: key,
                        value: value,
                        issues: issues
                    });
                }
            }
        }
    }
}

languages.forEach(lang => {
    const langDir = path.join(baseDir, lang);
    if (fs.existsSync(langDir)) {
        scanDir(langDir, lang);
    }
});

fs.writeFileSync('translation_issues_report.json', JSON.stringify(report, null, 2));
console.log(`Analysis complete. Found ${report.length} issues.`);
