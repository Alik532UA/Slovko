import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'src/lib/data');

/**
 * Скрипт для аналізу розміру JSON-файлів словника.
 * Допомагає знайти файли, які потребують розбиття.
 */

function getAllJsonFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getAllJsonFiles(name, fileList);
        } else if (file.endsWith('.json')) {
            fileList.push(name);
        }
    }
    return fileList;
}

function analyze() {
    console.log('📊 Аналіз розміру файлів даних...\n');
    
    const files = getAllJsonFiles(DATA_DIR);
    const results = files.map(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        const relPath = path.relative(ROOT_DIR, file);
        return { path: relPath, lines };
    });

    // Сортуємо за кількістю рядків (спадний порядок)
    results.sort((a, b) => b.lines - a.lines);

    console.log('Рядки | Шлях до файлу');
    console.log('---------------------');
    results.forEach(res => {
        const lineStr = String(res.lines).padEnd(5, ' ');
        console.log(`${lineStr} | ${res.path}`);
    });

    console.log(`\n✅ Всього проаналізовано файлів: ${results.length}`);
}

analyze();