const fs = require('fs');
const path = require('path');

const translationsDir = path.join(process.cwd(), 'src/lib/data/translations');

const keyMapping = {
    'adversity_1': 'adversity_misfortune',
    'adversity_2': 'adversity_hardship',
    'advocacy_2': 'advocacy_protection',
    'advocate_1': 'advocate_lawyer',
    'allowance__': 'allowance_money'
};

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.json') && fullPath.includes('levels')) {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            let changed = false;
            
            const newContent = {};
            for (const [key, value] of Object.entries(content)) {
                if (keyMapping[key]) {
                    newContent[keyMapping[key]] = value;
                    changed = true;
                    console.log(`Renaming ${key} to ${keyMapping[key]} in ${fullPath}`);
                } else {
                    newContent[key] = value;
                }
            }

            if (changed) {
                // Keep keys sorted or original order? JSON.stringify doesn't guarantee order,
                // but usually matches the order entries were added. Let's keep it simple.
                fs.writeFileSync(fullPath, JSON.stringify(newContent, null, '\t') + '\n');
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

processDir(translationsDir);
