const fs = require('fs');
const path = require('path');

const trans = {
    "set_(group)": { uk: "набір", el: "σετ", de: "Set", nl: "set", pl: "zestaw", crh: "taqım" },
    "set_(put)": { uk: "встановлювати", el: "θέτω", de: "setzen", nl: "zetten", pl: "ustawiać", crh: "qoymaq" }
};

function walk(dir) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (f.endsWith('.json')) {
            let content = fs.readFileSync(p, 'utf8');
            let changed = false;
            
            Object.entries(trans).forEach(([key, langs]) => {
                const stub = `"${key}": "${key}"`;
                const lang = p.split(path.sep).reverse().find(part => ['uk', 'el', 'de', 'nl', 'pl', 'crh'].includes(part));
                
                if (lang && langs[lang]) {
                    const replacement = `"${key}": "${langs[lang]}"`;
                    if (content.includes(stub)) {
                        content = content.split(stub).join(replacement);
                        changed = true;
                        console.log(`Fixed stub ${key} in ${p}`);
                    }
                }
            });
            
            if (changed) {
                fs.writeFileSync(p, content, 'utf8');
            }
        }
    });
}

walk('src/lib/data/translations');
