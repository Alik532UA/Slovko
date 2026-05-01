import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_B2 = path.join(ROOT_DIR, 'src/lib/data/words/levels/B2.json');
const TRANS_EN_DIR = path.join(ROOT_DIR, 'src/lib/data/translations/en/levels');

const CATEGORIES = {
    verbs: ['B2_verbs.json'],
    adjectives: ['B2_adjectives.json'],
    adverbs: ['B2_adverbs.json'],
    nouns_concrete: ['B2_nouns_concrete.json'],
    nouns_abstract: ['B2_nouns_abstract.json'],
    it: ['B2_it.json'],
    nature: ['B2_nature.json'],
    travel: ['B2_travel.json'],
    cars: ['B2_cars.json'],
    education_work: ['B2_education_work.json'],
    body_health: ['B2_body_health.json'],
    society_law: ['B2_society_law.json'],
    abstract_concepts: ['B2_abstract_concepts.json'],
    general: ['B2_general.json']
};

async function planDistribution() {
    const b2Data = JSON.parse(fs.readFileSync(MASTER_B2, 'utf8'));
    const allWords = b2Data.words;
    
    const existingKeys = new Set();
    fs.readdirSync(TRANS_EN_DIR).filter(f => f.startsWith('B2_')).forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(TRANS_EN_DIR, file), 'utf8'));
        Object.keys(data).forEach(k => existingKeys.add(k));
    });

    const missing = allWords.filter(w => !existingKeys.has(w));
    console.log(`Missing words: ${missing.length}`);

    // Simple heuristic for categorization
    const plan = {
        verbs: [],
        adjectives: [],
        adverbs: [],
        others: []
    };

    missing.forEach(word => {
        if (word.endsWith('_verb') || word.includes('_verb_')) {
            plan.verbs.push(word);
        } else if (word.endsWith('_adj') || word.includes('_adj_')) {
            plan.adjectives.push(word);
        } else if (word.endsWith('_adv')) {
            plan.adverbs.push(word);
        } else {
            plan.others.push(word);
        }
    });

    console.log(`\nHeuristic Plan (by suffixes):`);
    console.log(`Verbs: ${plan.verbs.length}`);
    console.log(`Adjectives: ${plan.adjectives.length}`);
    console.log(`Adverbs: ${plan.adverbs.length}`);
    console.log(`Uncategorized: ${plan.others.length}`);

    if (plan.others.length > 0) {
        console.log('\nSample of Uncategorized:', plan.others.slice(0, 50).join(', '));
    }
}

planDistribution();
