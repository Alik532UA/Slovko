const fs = require('fs');
const path = require('path');

const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
const stubs = {};

langs.forEach(lang => {
    const dir = path.join('src/lib/data/translations', lang, 'levels');
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.json')) return;
        const filePath = path.join(dir, file);
        const contentStr = fs.readFileSync(filePath, 'utf8');
        let content;
        try {
            content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
        } catch (e) {
            console.error(`Error parsing ${filePath}: ${e.message}`);
            return;
        }

        Object.entries(content).forEach(([key, val]) => {
            const cleanKey = key.split('_')[0].split('(')[0].trim().toLowerCase();
            const cleanVal = val.toLowerCase();
            
            const ignored = [
                'cd', 'dvd', 'usb', 'atm', 'bluetooth', 'aids', 'pizza', 'taxi', 'film', 'bus', 'test', 'partner', 'baby', 'bank', 'baseball', 'blog', 'cent', 'club', 'radio', 'hotel', 'tennis', 'internet', 'monitor', 'museum', 'opera', 'piano', 'plus', 'robot', 'safari', 'ski', 'sport', 'yoga', 'zebra', 'zero',
                'in', 'arm', 'hand', 'job', 'butter', 'adj.', 'april', 'august', 'band', 'basketball', 'blond', 'college', 'detail', 'dollar', 'euro', 'festival', 'hey', 'hobby', 'meter', 'modern', 'name', 'november', 'oh', 'online', 'orange', 'problem', 'professional', 'video', 'virus', 'atom', 'banana', 'camera', 'coffee', 'computer', 'guitar', 'hamburger', 'lemon', 'mango', 'menu', 'pasta', 'photo', 'salad', 'sandwich', 'soup', 'tea', 'ticket', 'tomato', 'tourist', 'university',
                'actor', 'alphabet', 'apartment', 'artist', 'author', 'avenue', 'balance', 'ballet', 'balloon', 'bar', 'barrier', 'base', 'battery', 'billion', 'bomb', 'bonus', 'box', 'bravo', 'bridge', 'broccoli', 'budget', 'cable', 'cactus', 'cafe', 'café', 'calendar', 'canal', 'cancer', 'canvas', 'capital', 'capsule', 'captain', 'caravan', 'carbon', 'card', 'cargo', 'cartoon', 'case', 'cash', 'casino', 'castle', 'catalog', 'catalogue', 'category', 'cell', 'cello', 'cement', 'center', 'centre', 'ceramic', 'champion', 'chaos', 'character', 'chart', 'chef', 'chemical', 'chess', 'chocolate', 'chorus', 'cigar', 'cigarette', 'cinema', 'circle', 'circus', 'civil', 'classic', 'classical', 'climate', 'clinic', 'code', 'collection', 'colony', 'column', 'comedy', 'comet', 'comfort', 'comic', 'command', 'comment', 'commerce', 'commercial', 'commission', 'committee', 'common', 'communication', 'community', 'compact', 'company', 'complex', 'component', 'composition', 'compound', 'computer', 'concept', 'concert', 'concrete', 'condition', 'conference', 'conflict', 'congress', 'connection', 'consequence', 'conservative', 'consideration', 'consist', 'constant', 'constitution', 'construct', 'construction', 'consultant', 'contact', 'container', 'content', 'continent', 'contract', 'contrast', 'control', 'convention', 'conventional', 'conversation', 'convert', 'cook', 'cookie', 'cool', 'copy', 'copyright', 'coral', 'core', 'corner', 'corporation', 'corridor', 'cosmetic', 'cost', 'costume', 'cotton', 'couch', 'council', 'count', 'counter', 'country', 'couple', 'coupon', 'course', 'court', 'cousin', 'cover', 'cowboy', 'crack', 'craft', 'crash', 'cream', 'creative', 'creativity', 'credit', 'crew', 'crisis', 'critic', 'critical', 'criticism', 'crocodile', 'crop', 'cross', 'crowd', 'crown', 'crucial', 'crystal', 'culture', 'cup', 'curious', 'currency', 'current', 'curriculum', 'curtain', 'curve', 'custom', 'customer', 'cycle', 'cylinder',
                'park', 'plan', 'pool', 'routine', 'september', 'situation', 'team', 'teenager', 'text', 'tv', 'winter', 'million', 'minute', 'symbol', 'argument', 'digital', 'international', 'material', 'national', 'koala', 'panda', 'tiger', 'finger', 'gold', 'manager', 'phrase', 'professor', 'burger', 'steak', 'toast', 'alternative', 'campus', 'chat', 'chip', 'designer', 'dessert', 'drama', 'essay', 'experiment', 'instrument', 'kilometer', 'normal', 'penny', 'pilot', 'planet',
                'smartphone', 'app', 'laptop', 'modem', 'sofa', 'tablet', 't-shirt', 'ah', 'camping', 'formal', 'golf', 'hockey', 'ideal', 'jazz', 'pop', 'poster', 'pub', 'sneaker', 'stress', 'trainer', 'wild', 'wow', 'zoo', 'wind', 'option', 'system', 'tour', 'sport', 'tennis', 'v.',
                'patient', 'fit', 'gas', 'journalist', 'reporter', 'route', 'set', 'transport', 'emotion', 'horror', 'global', 'illegal', 'legal', 'mental', 'protest', 'giraffe', 'fitness', 'symptom', 'garage', 'pedal', 'signal', 'agent', 'album', 'episode', 'explosion', 'export', 'generation', 'import', 'marketing', 'medal', 'mission', 'negative', 'nuclear', 'opposition', 'option', 'organism', 'panel', 'parallel', 'pause', 'perspective', 'phase', 'phenomenon', 'philosophy', 'physical', 'plus', 'portion', 'potential', 'potentially', 'precision', 'president', 'presidential', 'primary', 'prison', 'prisoner', 'privacy', 'private', 'probability', 'probable', 'probably', 'problem', 'procedure', 'process', 'processing', 'produce', 'producer', 'product', 'production', 'productive', 'professional', 'professor', 'profile', 'profit', 'profitable', 'program', 'programme', 'programming', 'progress', 'progressive', 'project',
                'medium', 'mild', 'n.', 'rugby', 'studio', 'trend', 'trick', 'shampoo', 'vase', 'hardware', 'scan', 'server', 'software', 'sand', 'alarm', 'basis', 'block', 'definition', 'link', 'statue', 'version', 'nation', 'expedition', 'humor'
            ];
            
            if (cleanKey === cleanVal && key.length > 1 && !ignored.includes(cleanKey)) {
                if (!stubs[lang]) stubs[lang] = [];
                stubs[lang].push({ file, key, val });
            }
        });
    });
});

fs.writeFileSync('.temp/current_stubs_report.json', JSON.stringify(stubs, null, 2));
console.log('Stubs report generated in .temp/current_stubs_report.json');
langs.forEach(l => {
    console.log(`${l}: ${stubs[l] ? stubs[l].length : 0} stubs`);
});
