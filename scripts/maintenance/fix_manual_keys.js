import fs from 'fs';

const mapping = JSON.parse(fs.readFileSync('polysemy_migration.json', 'utf8'));

const manualFixes = {
    "to_1": "to_preposition",
    "to_2": "to_infinitive",
    "well_1": "well_adverb",
    "well_2": "well_water",
    "the_1": "the_definite",
    "the_2": "the_definite_alt",
    "the_3": "the_definite_alt2",
    "would_1": "would_auxiliary",
    "would_2": "would_auxiliary_alt",
    "without_1": "without_preposition",
    "without_2": "without_preposition_alt",
    "you_1": "you_singular",
    "you_2": "you_plural",
    "your_1": "your_singular",
    "your_2": "your_plural"
};

for (const [key, value] of Object.entries(manualFixes)) {
    mapping[key] = value;
}

// Видаляємо записи, де ключ дорівнює значенню (вони не дають міграції)
for (const [key, value] of Object.entries(mapping)) {
    if (key === value) {
        delete mapping[key];
    }
}

fs.writeFileSync('polysemy_migration.json', JSON.stringify(mapping, null, 4));
console.log('Fixed manual keys and removed no-op mappings.');
