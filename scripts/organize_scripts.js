import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define category mappings
const categories = {
    'maintenance': [
        'fix_a2_missing', // directory
        'cleanup_topics.js',
        'fix_missing_numbers.js',
        'fix_topic_keys.js',
        'migrate_polysemy_a2.js',
        'run_global_migration.js',
        'sync_topic_translations.js',
        'bump-version.js',
        'polysemy_migration.json',
        'polysemy_report.md'
    ],
    'analysis': [
        'analyze_all_add.js',
        'analyze_levels_only.js',
        'analyze_new_words.js',
        'analyze_polysemy.js',
        'analyze_words.js',
        'find_missing_a1.js',
        'list_missing.js',
        'test_keys.js'
    ],
    'generation': [
        'add_words_batch.js',
        'align_topics.js',
        'build_translation_map.js',
        'create_topics.js',
        'finalize_topics.js',
        'get_all_words.js',
        'process_a2_append.js',
        'process_append.js'
    ]
};

// Create directories
Object.keys(categories).forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
        console.log(`Created directory: ${dir}`);
    }
});

// Move files
Object.entries(categories).forEach(([dir, files]) => {
    files.forEach(file => {
        const srcPath = path.join(__dirname, file);
        const destPath = path.join(__dirname, dir, file);

        if (fs.existsSync(srcPath)) {
            // Handle directory move differently or assume rename works for both
            try {
                fs.renameSync(srcPath, destPath);
                console.log(`Moved ${file} to ${dir}/`);
            } catch (err) {
                console.error(`Error moving ${file}: ${err.message}`);
            }
        } else {
            console.log(`Skipping ${file} (not found in root scripts)`);
        }
    });
});

console.log('Organization complete.');
