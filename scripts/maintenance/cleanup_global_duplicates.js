import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');
const TSCR_DIR = path.join(ROOT_DIR, 'src/lib/data/transcriptions/en/levels');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function clean() {
    const langs = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());
    for (const lang of langs) {
        const seen = new Set();
        const lDir = path.join(TRANS_DIR, lang, 'levels');
        if (!fs.existsSync(lDir)) continue;
        for (const level of levels) {
            const files = fs.readdirSync(lDir).filter(f => f.startsWith(level + '_'));
            for (const file of files) {
                const p = path.join(lDir, file);
                const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                const nextData = {};
                let changed = false;
                for (const [k, v] of Object.entries(data)) {
                    if (seen.has(k)) changed = true;
                    else { nextData[k] = v; seen.add(k); }
                }
                if (changed) {
                    if (Object.keys(nextData).length === 0) fs.unlinkSync(p);
                    else fs.writeFileSync(p, JSON.stringify(nextData, null, '\t') + '\n');
                }
            }
        }
    }
    const seenT = new Set();
    for (const level of levels) {
        const files = fs.readdirSync(TSCR_DIR).filter(f => f.startsWith(level + '_'));
        for (const file of files) {
            const p = path.join(TSCR_DIR, file);
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            const nextData = {};
            let changed = false;
            for (const [k, v] of Object.entries(data)) {
                if (seenT.has(k)) changed = true;
                else { nextData[k] = v; seenT.add(k); }
            }
            if (changed) {
                if (Object.keys(nextData).length === 0) fs.unlinkSync(p);
                else fs.writeFileSync(p, JSON.stringify(nextData, null, '\t') + '\n');
            }
        }
    }
    console.log('Cleanup Done');
}
clean();