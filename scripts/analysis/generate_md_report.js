import fs from 'fs';

const reportData = JSON.parse(fs.readFileSync('translation_issues_report.json', 'utf8'));

const stats = {
    totalIssues: reportData.length,
    byType: {},
    byLang: {},
    missingTranslations: []
};

reportData.forEach(item => {
    // Count by type
    item.issues.forEach(type => {
        stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    // Count by lang
    stats.byLang[item.lang] = (stats.byLang[item.lang] || 0) + 1;

    // Track missing translations specifically
    if (item.issues.some(i => i.includes('Potential missing translation') || i.includes('English text'))) {
        stats.missingTranslations.push(item);
    }
});

let md = "# Загальний звіт про стан локалізації\n\n";
md += `## Статистика\n`;
md += `- **Загальна кількість проблем:** ${stats.totalIssues}\n`;
md += `- **За мовами:**\n`;
for (const [lang, count] of Object.entries(stats.byLang)) {
    md += `  - ${lang.toUpperCase()}: ${count}\n`;
}
md += `\n- **За типами:**\n`;
for (const [type, count] of Object.entries(stats.byType)) {
    md += `  - ${type}: ${count}\n`;
}

md += `\n## Критичні помилки (Відсутній переклад)\n`;
md += `Нижче наведено приклади файлів, де значення залишилися англійською мовою (перші 20 прикладів):\n\n`;
md += `| Мова | Файл | Ключ | Значення |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;

stats.missingTranslations.slice(0, 20).forEach(item => {
    const fileName = item.file.split('\\').pop();
    md += `| ${item.lang.toUpperCase()} | ${fileName} | \`${item.key}\` | \`${item.value}\` |\n`;
});

md += `\n\n*Примітка: Повний список критичних помилок налічує ${stats.missingTranslations.length} записів.*`;

fs.writeFileSync('GLOBAL_TRANSLATION_REPORT.md', md);
console.log('Final MD report generated.');
