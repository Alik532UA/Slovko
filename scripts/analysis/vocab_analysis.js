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

    /*
     * Поріг, а не лише таблиця.
     *
     * `05_Validation_Pipeline.md` писав, що цей скрипт «контролює розмір JSON
     * файлів (оптимально до 1000 рядків)». У коді не було ні порогу, ні числа
     * 1000 — тільки відсортований звіт і завжди нульовий код виходу. Тобто
     * документація описувала гейт, а існував друкований список.
     *
     * Поріг — базове число, що лише спадає, а не бажані 1000: найбільший файл
     * зараз 1686 рядків (`words/levels/B2.json`), і червоніти на кожному
     * прогоні гейт не має права — такий гейт вимикають. Розбив файл — опусти
     * число.
     */
    const BASELINE_MAX_LINES = 1686;
    const over = results.filter((r) => r.lines > BASELINE_MAX_LINES);
    if (over.length > 0) {
        console.error(
            `Файли переросли базове число ${BASELINE_MAX_LINES} рядків:` +
                over.map((r) => ` ${r.lines} | ${r.path};`).join('')
        );
        process.exitCode = 1;
    } else {
        console.log(
            `Найбільший файл: ${results[0].lines} рядків (базове число ${BASELINE_MAX_LINES}, орієнтир — 1000).`
        );
    }
}

analyze();