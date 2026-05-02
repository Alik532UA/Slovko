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
            const baseKey = key.split('_')[0].split('(')[0].trim().toLowerCase();
            const cleanVal = val.toLowerCase().trim();
            const cleanKey = key.toLowerCase().trim();
            
            const ignored = [
                'cd', 'dvd', 'usb', 'atm', 'bluetooth', 'aids', 'pizza', 'taxi', 'film', 'bus', 'test', 'partner', 'baby', 'bank', 'baseball', 'blog', 'cent', 'club', 'radio', 'hotel', 'tennis', 'internet', 'monitor', 'museum', 'opera', 'piano', 'plus', 'robot', 'safari', 'ski', 'sport', 'yoga', 'zebra', 'zero',
                'in', 'arm', 'hand', 'job', 'butter', 'adj.', 'april', 'august', 'band', 'basketball', 'blond', 'college', 'detail', 'dollar', 'euro', 'festival', 'hey', 'hobby', 'meter', 'modern', 'name', 'november', 'oh', 'online', 'orange', 'problem', 'professional', 'video', 'virus', 'atom', 'banana', 'camera', 'coffee', 'computer', 'guitar', 'hamburger', 'lemon', 'mango', 'menu', 'pasta', 'photo', 'salad', 'sandwich', 'soup', 'tea', 'ticket', 'tomato', 'tourist', 'university',
                'actor', 'alphabet', 'apartment', 'artist', 'author', 'avenue', 'balance', 'ballet', 'balloon', 'bar', 'barrier', 'base', 'battery', 'billion', 'bomb', 'bonus', 'box', 'bravo', 'bridge', 'broccoli', 'budget', 'cable', 'cactus', 'cafe', 'café', 'calendar', 'canal', 'cancer', 'canvas', 'capital', 'capsule', 'captain', 'caravan', 'carbon', 'card', 'cargo', 'cartoon', 'case', 'cash', 'casino', 'castle', 'catalog', 'catalogue', 'category', 'cell', 'cello', 'cement', 'center', 'centre', 'ceramic', 'champion', 'chaos', 'character', 'chart', 'chef', 'chemical', 'chess', 'chocolate', 'chorus', 'cigar', 'cigarette', 'cinema', 'circle', 'circus', 'civil', 'classic', 'classical', 'climate', 'clinic', 'code', 'collection', 'colony', 'column', 'comedy', 'comet', 'comfort', 'comic', 'command', 'comment', 'commerce', 'commercial', 'commission', 'committee', 'common', 'communication', 'community', 'compact', 'company', 'complex', 'component', 'composition', 'compound', 'computer', 'concept', 'concert', 'concrete', 'condition', 'conference', 'conflict', 'congress', 'connection', 'consequence', 'conservative', 'consideration', 'consist', 'constant', 'constitution', 'construct', 'construction', 'consultant', 'contact', 'container', 'content', 'continent', 'contract', 'contrast', 'control', 'convention', 'conventional', 'conversation', 'convert', 'cook', 'cookie', 'cool', 'copy', 'copyright', 'coral', 'core', 'corner', 'corporation', 'corridor', 'cosmetic', 'cost', 'costume', 'cotton', 'couch', 'council', 'count', 'counter', 'country', 'couple', 'coupon', 'course', 'court', 'cousin', 'cover', 'cowboy', 'crack', 'craft', 'crash', 'cream', 'creative', 'creativity', 'credit', 'crew', 'crisis', 'critic', 'critical', 'criticism', 'crocodile', 'crystal', 'culture', 'curriculum', 'curtain', 'curve', 'custom', 'customer', 'cycle', 'cylinder',
                'park', 'plan', 'pool', 'routine', 'september', 'situation', 'team', 'teenager', 'text', 'tv', 'winter', 'million', 'minute', 'symbol', 'argument', 'digital', 'international', 'material', 'national', 'koala', 'panda', 'tiger', 'finger', 'gold', 'manager', 'phrase', 'professor', 'burger', 'steak', 'toast', 'alternative', 'campus', 'chat', 'chip', 'designer', 'dessert', 'drama', 'essay', 'experiment', 'instrument', 'kilometer', 'normal', 'penny', 'pilot', 'planet',
                'smartphone', 'app', 'laptop', 'modem', 'sofa', 'tablet', 't-shirt', 'ah', 'camping', 'formal', 'golf', 'hockey', 'ideal', 'jazz', 'pop', 'poster', 'pub', 'sneaker', 'stress', 'trainer', 'wild', 'wow', 'zoo', 'wind', 'option', 'system', 'tour', 'sport', 'tennis', 'v.',
                'patient', 'fit', 'gas', 'journalist', 'reporter', 'route', 'set', 'transport', 'emotion', 'horror', 'global', 'illegal', 'legal', 'mental', 'protest', 'giraffe', 'fitness', 'symptom', 'garage', 'pedal', 'signal', 'agent', 'album', 'episode', 'explosion', 'export', 'generation', 'import', 'marketing', 'medal', 'mission', 'negative', 'nuclear', 'opposition', 'option', 'organism', 'panel', 'parallel', 'pause', 'perspective', 'phase', 'phenomenon', 'philosophy', 'physical', 'portion', 'potential', 'potentially', 'precision', 'president', 'presidential', 'primary', 'prison', 'prisoner', 'privacy', 'private', 'probability', 'probable', 'probably', 'problem', 'procedure', 'process', 'processing', 'produce', 'producer', 'product', 'production', 'productive', 'professional', 'professor', 'profile', 'profit', 'profitable', 'program', 'programme', 'programming', 'progress', 'progressive', 'project',
                'medium', 'mild', 'n.', 'rugby', 'studio', 'trend', 'trick', 'shampoo', 'vase', 'hardware', 'scan', 'server', 'software', 'sand', 'alarm', 'basis', 'block', 'definition', 'link', 'statue', 'version', 'nation', 'expedition', 'humor',
                'emotional', 'wolf', 'organ', 'protein', 'absolution', 'alibi', 'alluvial', 'ambivalent', 'analyst', 'anathema', 'animation', 'apartheid', 'audio', 'clip', 'deck', 'depression', 'dominant', 'elegant', 'emission', 'evolution', 'expansion', 'expertise', 'format', 'formation', 'forum', 'fossil', 'fragment', 'gaming', 'genre',
                'gig', 'id', 'index', 'inflation', 'info', 'initiative', 'innovation', 'installation', 'institution', 'interpretation', 'invasion', 'investor', 'jet', 'junior', 'jury', 'logo', 'loyal', 'make-up', 'makeup', 'marathon', 'mineral', 'monster', 'motivation', 'motor', 'navigation', 'neutral', 'engagement', 'golden', 'hunger', 'illusion', 'kindergarten', 'nickel', 'norm', 'outfit', 'passage', 'prime', 'punk', 'seminar', 'senator', 'sexy', 'slogan', 'solar', 'status', 'super', 'tag', 'tank', 'terror', 'terrorist', 'timing', 'tonne', 'tsunami', 'tunnel', 'universal', 'variation', 'vision', 'vital',
                'parade', 'proportion', 'regional', 'revision', 'revolution', 'rival', 'rose', 'vitamin', 'zone', 'bitter', 'blind', 'minister', 'relevant', 'terminal', 'filter', 'absurd', 'administrator', 'adoption', 'aggression', 'aluminium', 'amateur', 'arena', 'auto', 'banner', 'bass', 'brutal', 'cluster', 'cocktail', 'delegation', 'desktop',
                'dilemma', 'dimension', 'diplomat', 'dual', 'duo', 'echo', 'ego', 'elite', 'enthusiast', 'erosion', 'extremist', 'fairness', 'fatal', 'feminist', 'franchise', 'frustration', 'fundraising', 'halt', 'horn', 'idiot', 'insider', 'inspiration', 'instrumental', 'integral', 'integration', 'intervention', 'irrelevant', 'isolation', 'laser', 'layout',
                'liberal', 'linear', 'liter', 'lobby', 'mainstream', 'manifest', 'manipulation', 'marginal', 'meditation', 'memo', 'mentor', 'migration', 'militant', 'minimal', 'nest', 'newsletter', 'parameter', 'pastor', 'patent', 'petition', 'pipeline', 'portfolio', 'premium', 'prominent', 'propaganda', 'radar', 'rational', 'rebellion', 'referendum', 'reform',
                'regime', 'rehabilitation', 'ritual', 'robust', 'rock', 'rotation', 'router', 'sack', 'segment', 'sensation', 'simulation', 'solo', 'spam', 'stark', 'suite', 'superintendent', 'transformation', 'transit', 'transparent', 'trauma', 'tribunal', 'trio', 'triumph', 'tumor', 'upgrade', 'variable', 'verbal', 'veteran', 'browser', 'eloquent',
                'warm', 'student', 'extra', 'land', 'station', 'theater', 'fruit', 'water', 'december', 'lunch', 'machine', 'model', 'object', 'pen', 'perfect', 'sorry', 'spelling',
                'start', 'website', 'intelligent', 'open', 'over', 'type', 'plant', 'man', 'later', 'week', 'weekend', 'effect', 'record', 'octopus', 'bumper', 'dashboard', 'printer', 'context', 'exact', 'expert', 'factor', 'god', 'is', 'item', 'jam', 'lab',
                'detective', 'lift', 'media', 'ring', 'tip', 'web', 'lamp', 'oven', 'document', 'login', 'storm', 'architect', 'coach', 'direct', 'talent', 'gadget', 'diagram', 'district', 'entertainment', 'immigrant', 'impact', 'indirect', 'label', 'lip', 'mix',
                'container', 'net', 'percentage', 'planning', 'plot', 'pot', 'script', 'supporter', 'tape', 'tent', 'ton', 'wifi', 'jungle', 'alcohol', 'element', 'respect', 'volume', 'brochure', 'hostel', 'souvenir', 'monument', 'rat', 'walrus', 'worm', 'ambulance', 'radiator', 'ham',
                'abstract', 'acre', 'anticlimax', 'cast', 'circuit', 'consistent', 'cruise', 'deadline', 'dealer', 'evident', 'extract', 'feedback', 'gallon', 'gender', 'graphics', 'habitat', 'inch', 'incident', 'input', 'interval', 'ladder', 'landing', 'lens', 'marker', 'opening', 'operator', 'output', 'prompt', 'prospect', 'racist',
                'rail', 'scenario', 'screening', 'sector', 'specialist', 'thesis', 'trigger', 'vast', 'via', 'workshop', 'database', 'agenda', 'aspect', 'discipline', 'senior', 'resort', 'activist', 'adolescent', 'alert', 'audit', 'buffer', 'columnist', 'commentator', 'communist', 'correspondent', 'counseling', 'dam', 'defect', 'demon', 'dictator',
                'dip', 'diploma', 'doctrine', 'donor', 'filmmaker', 'genocide', 'guerrilla', 'hint', 'horizon', 'indicator', 'inherent', 'instinct', 'intact', 'interface', 'manuscript', 'module', 'momentum', 'non-profit', 'outlet', 'precedent', 'premier', 'privilege', 'protocol', 'rebel', 'residue', 'sentiment', 'socialist', 'spectrum', 'spotlight', 'stereotype',
                'supervisor', 'transcript', 'consensus', 'decorum', 'french', 'gym', 'moment', 'ocean', 'ok', 'supermarket', 'melon', 'metal', 'parking', 'region', 'worse', 'plaster', 'sudden', 'folder', 'limit', 'port', 'standard', 'honor', 'amulet', 'era', 'gang', 'patrol', 'patron', 'ranking', 'regulator',
                'the', 'piston', 'federal', 'risk', 'grant', 'virtual', 'disk',
                'tradition', 'amphitheater', 'rest', 'mine', 'race', 'strip'
            ];
            
            const isStub = (cleanVal === cleanKey) || (cleanVal === baseKey);
            
            if (isStub && key.length > 1 && !ignored.includes(baseKey)) {
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
