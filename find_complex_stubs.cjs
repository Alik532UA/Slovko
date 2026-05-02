const fs = require('fs');
const path = require('path');

const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
const stubs = {};

const whitelist = [
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
    'the', 'piston', 'federal', 'risk', 'grant', 'virtual', 'disk', 'tradition', 'amphitheater', 'rest', 'mine', 'race', 'strip', 'grave'
];

function walk(dir, lang) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p, lang);
        } else if (f.endsWith('.json')) {
            const contentStr = fs.readFileSync(p, 'utf8');
            let content;
            try {
                content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
            } catch (e) { return; }

            Object.entries(content).forEach(([k, v]) => {
                if (typeof v !== 'string') return;
                
                const cleanKey = k.toLowerCase().trim();
                const cleanVal = v.toLowerCase().trim();
                const baseKey = k.split('_')[0].split('(')[0].trim().toLowerCase();
                
                const isFullStub = (cleanVal === cleanKey);
                const isBaseStub = (cleanVal === baseKey);
                
                if (k.length <= 1) return; // Skip "a", "e" etc. for now as they are likely artifacts

                let isActuallyAStub = false;
                if (isFullStub || isBaseStub) {
                    if (!whitelist.includes(baseKey)) {
                        isActuallyAStub = true;
                    }
                    // For uk and el, base stubs are always stubs unless in a very small whitelist of acronyms
                    if ((lang === 'uk' || lang === 'el') && !['dvd', 'cd', 'usb', 'atm', 'tv', 'id', 'aids', 'euro', 'cent', 'internet', 'video', 'radio', 'blog', 'online', 'website', 'computer', 'hotel', 'taxi', 'pizza', 'bus', 'modern', 'sport', 'tennis', 'yoga', 'zebra', 'robot', 'safari', 'ski', 'opera', 'piano', 'plus', 'zebra', 'zero', 'atom', 'banana', 'camera', 'coffee', 'hamburger', 'lemon', 'mango', 'pasta', 'photo', 'salad', 'sandwich', 'soup', 'tea', 'ticket', 'tomato', 'tourist', 'university', 'actor', 'alphabet', 'apartment', 'artist', 'author', 'avenue', 'ballet', 'balloon', 'bar', 'base', 'battery', 'billion', 'bomb', 'bonus', 'box', 'bravo', 'broccoli', 'budget', 'cable', 'cactus', 'cafe', 'café', 'calendar', 'canal', 'cancer', 'canvas', 'capital', 'capsule', 'captain', 'caravan', 'carbon', 'card', 'cargo', 'cartoon', 'cash', 'casino', 'castle', 'catalog', 'catalogue', 'category', 'cell', 'cello', 'cement', 'center', 'centre', 'ceramic', 'champion', 'chaos', 'character', 'chart', 'chef', 'chemical', 'chess', 'chocolate', 'chorus', 'cigar', 'cigarette', 'cinema', 'circle', 'circus', 'civil', 'classic', 'classical', 'climate', 'clinic', 'code', 'collection', 'colony', 'column', 'comedy', 'comet', 'comfort', 'comic', 'command', 'comment', 'commerce', 'commercial', 'commission', 'committee', 'common', 'communication', 'community', 'compact', 'company', 'complex', 'component', 'composition', 'compound', 'concept', 'concert', 'concrete', 'condition', 'conference', 'conflict', 'congress', 'connection', 'consequence', 'conservative', 'consideration', 'consist', 'constant', 'constitution', 'construct', 'construction', 'consultant', 'contact', 'container', 'content', 'continent', 'contract', 'contrast', 'control', 'convention', 'conventional', 'conversation', 'convert', 'cook', 'cookie', 'cool', 'copy', 'copyright', 'coral', 'core', 'corner', 'corporation', 'corridor', 'cosmetic', 'cost', 'costume', 'cotton', 'couch', 'council', 'count', 'counter', 'country', 'couple', 'coupon', 'course', 'court', 'cousin', 'cover', 'cowboy', 'crack', 'craft', 'crash', 'cream', 'creative', 'creativity', 'credit', 'crew', 'crisis', 'critic', 'critical', 'criticism', 'crocodile', 'crystal', 'culture', 'curriculum', 'curtain', 'curve', 'custom', 'customer', 'cycle', 'cylinder'].includes(baseKey)) {
                        isActuallyAStub = true;
                    }
                }

                if (isActuallyAStub) {
                    if (!stubs[lang]) stubs[lang] = [];
                    stubs[lang].push({ file: f, key: k, val: v });
                }
            });
        }
    });
}

langs.forEach(l => {
    walk(path.join('src/lib/data/translations', l), l);
});

console.log(JSON.stringify(stubs));
