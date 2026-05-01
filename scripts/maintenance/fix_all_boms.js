import fs from 'fs';
import path from 'path';

function fixBOM(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            fixBOM(fullPath);
        } else if (item.endsWith(".json") || item.endsWith(".ts") || item.endsWith(".svelte") || item.endsWith(".js") || item.endsWith(".cjs")) {
            let buffer = fs.readFileSync(fullPath);
            let changed = false;
            
            // While we have a BOM at the start, remove it
            while (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                buffer = buffer.slice(3);
                changed = true;
            }
            
            if (changed || true) { // Always rewrite with a single BOM for consistency
                const newBuffer = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), buffer]);
                fs.writeFileSync(fullPath, newBuffer);
            }
        }
    }
}

console.log("Fixing double BOMs in src/ and scripts/...");
fixBOM("src");
fixBOM("scripts");
console.log("Done.");
