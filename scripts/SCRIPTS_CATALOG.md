# Scripts Catalog

Use these scripts to maintain, analyze, and generate data for the app.
Run with `node scripts/path/to/script.js`.

## 🛠️ Maintenance (Data Integrity)
*Located in `scripts/maintenance/`*

### Core Tools
- **`run_global_migration.js`**: Runs the full data migration pipeline (words -> translations -> transcriptions).
- **`translation_engine.js`**: Core logic for handling translations and semantic keys.
- **`sync_all_keys.cjs`**: Synchronizes all keys across levels and languages.
- **`global_fix_translations.js`**: Applies global fixes to translations based on predefined rules.
- **`auto_translate_mymemory.js`**: Uses MyMemory API for automatic translation (use with caution).
- **`cleanup_word_lists.cjs`**: Standardizes word list files.

### Specific Level Tools
- **`fix_b2_gaps_from_other_levels.js`**: Fills missing data in B2 using other levels as sources.
- **`fix_b2_semantic_keys.js`**: Updates B2 keys to follow the semantic naming convention.
- **`import_b2_translations.js`**: Imports translations from CSV-like text files.
- **`fill_remaining_b2.js`**: Fills empty slots with English keys (last resort).

### Topics & Phrases
- **`sync_topic_translations.js`**: Ensures topic translation files match topic word lists.
- **`cleanup_topics.js`**: Removes duplicate words within topics.
- **`fix_topic_keys.js`**: Normalizes keys in topic files.
- **`migrate_phrases.cjs`**: Handles migration of phrase data.
- **`generate_phrase_migration.js`**: Generates mapping for phrase migration.

## 🔍 Analysis (Debugging)
*Located in `scripts/analysis/`*

- **`analyze_all_translations.js`**: Comprehensive check for missing or incorrect translations across all levels and languages.
- **`vocab_analysis.js`**: Statistics and deep analysis of the vocabulary.
- **`find_missing_all.js`**: Project-wide scan for missing keys.
- **`analyze_polysemy.js`**: Detailed report on words with multiple meanings (polysemy).
- **`generate_md_report.js`**: Generates the `GLOBAL_TRANSLATION_REPORT.md`.
- **`test_ipa_rules.cjs`**: Validates phonetic transcription rules and IPA mapping.
- **`analyze_new_words.js`**: Analyzes newly added words for consistency.

## ⚙️ Generation (Content Creation)
*Located in `scripts/generation/`*

- **`add_words_batch.js`**: Adds a batch of words to a level.
- **`create_topics.js`**: Scaffolding for new topics.
- **`align_topics.js`**: Aligns topic files with master lists.
- **`build_translation_map.js`**: Builds a map of translations for faster processing.

## 📂 Root & Utility Scripts
- **`bump-version.js`**: Increases version in `package.json` and `static/app-version.json`.
- **`organize_scripts.js`**: (Internal) Helper to maintain this folder structure.

## 🏛️ Legacy Fixes
*Located in `scripts/maintenance/legacy_fixes/`*
Contains one-time migration scripts and old fixes that are kept for historical reference or potential re-runs if data is reverted.