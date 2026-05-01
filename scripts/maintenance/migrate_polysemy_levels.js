import fs from 'fs';
import path from 'path';

const semanticsPath = 'src/lib/data/semantics.ts';
const levelsDir = 'src/lib/data/words/levels';

// Суфікси, які ми вважаємо технічним боргом (полісемією)
const techSuffixes = [
    '_conjunction', '_pronoun', '_possessive', '_verb', '_noun', '_adj', 
    '_fruit', '_animal', '_member', '_part', '_direction', '_brightness', 
    '_area', '_clock', '_abstract', '_digit', '_item', '_photo', '_painting',
    '_older', '_younger', '_male', '_female', '_formal', '_informal', 
    '_singular', '_plural', '_accusative', '_dative', '_gratis', '_liberty',
    '_foot', '_vehicle', '_verb_alt', '_legal', '_doing', '_real', '_current',
    '_arrest', '_understand', '_matter', '_romance', '_law', '_system',
    '_insult', '_misuse', '_chance', '_event', '_living', '_yerleme',
    '_agreement', '_harmony', '_artuv', '_buyv', '_ac', '_herb',
    '_receipt', '_recognize', '_confirmation', '_recognition',
    '_knowledge', '_obtain', '_auv', '_yamanlq', '_inat', '_qatt',
    '_change', '_setting', '_justice', '_manage', '_expect', '_future',
    '_attraction', '_request', '_arrival', '_look', '_anatomy', '_document',
    '_software', '_job', '_use', '_meeting', '_alamaq', '_yaqalamaq',
    '_method', '_field', '_place', '_subject', '_territory', '_dispute',
    '_reason', '_logic', '_body', '_weapon', '_speech', '_claim', '_rights',
    '_eval', '_tax', '_role', '_task', '_emotion', '_file', '_feature',
    '_feeling', '_quality', '_source', '_maternal', '_paternal', '_expert',
    '_person', '_power', '_foundation', '_military', '_artillery', '_electric',
    '_life', '_endure', '_position', '_time', '_profit', '_object', '_dark',
    '_light', '_council', '_wood', '_economy', '_increase', '_office',
    '_tak', '_tree', '_damage', '_pause', '_personality', '_fiction',
    '_fee', '_state', '_statement', '_explain', '_events', '_happen',
    '_instruction', '_order', '_ceremony', '_start', '_loss', '_pay',
    '_inclusive', '_thorough', '_evidence', '_hide', '_admit', '_defeat',
    '_care', '_worry', '_action', '_criticize', '_term', '_assurance',
    '_trust', '_limit', '_obey', '_standards', '_face', '_issue',
    '_win', '_energy', '_protect', '_form', '_majority', '_build',
    '_theory', '_lawyer', '_think', '_shrink', '_donate', '_help',
    '_awesome', '_temp', '_bravery', '_manliness', '_calendar', '_romantic',
    '_with', '_certainly', '_exactly', '_show', '_skill', '_describe',
    '_from', '_pleasure', '_plan', '_style', '_mark', '_official',
    '_error', '_find', '_crime', '_prevent', '_conclusion', '_other',
    '_various', '_between', '_distinguish', '_decrease', '_influence',
    '_info', '_secret', '_image', '_truth', '_attention', '_traffic',
    '_market', '_outline', '_sketch', '_wind', '_goal', '_sleep',
    '_narcotic', '_expected', '_copy', '_ground', '_planet', '_yer',
    '_detail', '_remove', '_waste', '_appear', '_stronger', '_difficulty',
    '_meet', '_candidate', '_support', '_betrothal', '_involvement',
    '_improve', '_augmentation', '_nature', '_imagine', '_confidence',
    '_founding', '_institution', '_assess', '_impact', '_overstate',
    '_art', '_failure', '_drop', '_out', '_obese', '_oil', '_blame',
    '_defect', '_penalty', '_surface', '_surface', '_cost', '_liberty',
    '_origin', '_basic', '_essential', '_orchard', '_yard', '_fuel',
    '_along_with', '_away', '_by', '_off_transport', '_on_transport',
    '_over_illness', '_rid_of', '_up', '_in_surrender', '_up_habit',
    '_up_quit', '_up_surrender', '_material', '_on', '_up_mature',
    '_up_physical', '_development', '_physical', '_difficult', '_solid',
    '_tough', '_holiday', '_vacation', '_know', '_see', '_case',
    '_front_of', '_order_to', '_spite_of', '_fruit', '_hold', '_store',
    '_nice', '_type', '_noble', '_behind', '_depart', '_remaining',
    '_false', '_elevator', '_brightness', '_exist', '_reside', '_after',
    '_at', '_for', '_forward_to', '_up_word', '_mechanism', '_angry',
    '_insane', '_main', '_grade', '_sign', '_sound', '_stone', '_small',
    '_wurst', '_rescue', '_digital', '_medical', '_ord', '_ordinal',
    '_meaning', '_duty', '_service', '_business', '_collection',
    '_off_journey', '_view', '_scenery', '_location', '_web', '_sense',
    '_gas', '_adv', '_degree', '_that', '_kind', '_cosmos', '_shape',
    '_phase', '_theater', '_stop', '_transport', '_inventory', '_share',
    '_shop', '_things', '_school', '_topic', '_after_relative',
    '_off_clothes', '_up_hobby', '_demonstrative', '_sequence',
    '_abstract', '_be', '_do', '_have', '_infinitive', '_preposition',
    '_also', '_excessive', '_much', '_behave', '_court', '_test',
    '_pipe', '_subway', '_direction', '_down_volume', '_into',
    '_off_device', '_on_device', '_water', '_about', '_color',
    '_future', '_bos', '_forest', '_holz', '_auxiliary', '_auxiliary_alt'
];

function migrate() {
    console.log('--- Starting Polysemy Migration ---');

    // 1. Читаємо semantics.ts
    let semanticsContent = fs.readFileSync(semanticsPath, 'utf8');
    
    // Витягуємо об'єкт semanticHierarchy
    const startMatch = semanticsContent.indexOf('export const semanticHierarchy');
    const braceStart = semanticsContent.indexOf('{', startMatch);
    
    // Ми не будемо парсити JSON, бо це TS, ми будемо працювати з об'єктом в пам'яті
    // Для цього ми завантажимо його через eval або просто будемо шукати regex-ом
    // Але надійніше - прочитати всі файли рівнів і подивитися що треба додати
    
    let levels = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));
    let changesMade = false;

    // Словник для швидкого пошуку існуючих специфічних ключів
    // Будуємо його з поточного вмісту semantics.ts
    let specificToBase = {};
    const regex = /(\w+):\s*{\s*base:\s*["'](\w+)["'],\s*specific:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(semanticsContent)) !== null) {
        const base = match[2];
        const specifics = match[3].split(',').map(s => s.trim().replace(/["']/g, ''));
        specifics.forEach(s => {
            specificToBase[s] = base;
        });
    }

    levels.forEach(levelFile => {
        const filePath = path.join(levelsDir, levelFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const originalCount = data.words.length;
        
        let newWords = [];
        data.words.forEach(word => {
            if (word.includes('_')) {
                // Це кандидат на рефакторинг
                let base = null;
                
                // Перевіряємо чи він вже є в semantics
                if (specificToBase[word]) {
                    base = specificToBase[word];
                } else {
                    // Пробуємо відрізати відомі суфікси
                    for (const suffix of techSuffixes) {
                        if (word.endsWith(suffix)) {
                            base = word.substring(0, word.length - suffix.length);
                            break;
                        }
                    }
                }

                if (base) {
                    console.log(`[${levelFile}] Mapping: ${word} -> ${base}`);
                    newWords.push(base);
                    
                    // Додаємо в semantics якщо треба
                    if (!specificToBase[word]) {
                        addSpecificToSemantics(base, word);
                        specificToBase[word] = base;
                        changesMade = true;
                    }
                } else {
                    // Якщо не знайшли базу (наприклад, t_shirt), залишаємо як є
                    newWords.push(word);
                }
            } else {
                newWords.push(word);
            }
        });

        // Дедуплікація
        data.words = [...new Set(newWords)];
        
        if (data.words.length !== originalCount) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n');
            console.log(`[${levelFile}] Updated. Words: ${originalCount} -> ${data.words.length}`);
        }
    });

    if (changesMade) {
        // Записуємо оновлений semantics.ts
        // (addSpecificToSemantics вже модифікує глобальну змінну або файл)
    }
}

function addSpecificToSemantics(base, specific) {
    let content = fs.readFileSync(semanticsPath, 'utf8');
    
    // Перевіряємо чи є вже така база
    const baseRegex = new RegExp(`(\\s*)${base}:\\s*{\\s*base:\\s*["']${base}["'],\\s*specific:\\s*\\[([^\\]]*)\\]\\s*}`, 's');
    const match = content.match(baseRegex);

    if (match) {
        // База є, додаємо специфік
        let specifics = match[2].split(',').map(s => s.trim()).filter(s => s);
        if (!specifics.includes(`"${specific}"`) && !specifics.includes(`'${specific}'`)) {
            specifics.push(`"${specific}"`);
            specifics.sort();
            const newEntry = `${match[1]}${base}: {\n\t\tbase: "${base}",\n\t\tspecific: [${specifics.join(', ')}]\n\t}`;
            content = content.replace(match[0], newEntry);
            fs.writeFileSync(semanticsPath, content);
            console.log(`Added specific "${specific}" to base "${base}" in semantics.ts`);
        }
    } else {
        // Бази немає, створюємо нову групу
        // Шукаємо кінець об'єкта
        const lastBraceIndex = content.lastIndexOf('};');
        const newEntry = `\t${base}: {\n\t\tbase: "${base}",\n\t\tspecific: ["${specific}"]\n\t},\n`;
        content = content.slice(0, lastBraceIndex) + newEntry + content.slice(lastBraceIndex);
        fs.writeFileSync(semanticsPath, content);
        console.log(`Created new base "${base}" with specific "${specific}" in semantics.ts`);
    }
}

migrate();
