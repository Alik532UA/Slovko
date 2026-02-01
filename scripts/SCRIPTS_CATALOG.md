# Scripts Catalog

Use these scripts to maintain, analyze, and generate data for the app.
Run with `node scripts/path/to/script.js`.

## 🛠️ Maintenance (Data Integrity)
*Located in `scripts/maintenance/`*

- **`fix_b2_gaps_from_other_levels.js`**: Critical tool. Fills missing translations/transcriptions in a target level (e.g., B2) by copying data from other levels (A1-C2) where the same word exists. Use this when a level has "placeholders" instead of translations.
- **`import_b2_translations.js`**: Parses a raw `word;translation` text file and populates JSONs.
- **`fill_remaining_b2.js`**: Fills empty slots with English keys to prevent app crashes (last resort).
- **`apply_b2_fix.js`**: Hardcoded fix for specific B2 verbs (older script).
- **`bump-version.js`** (Root or Maintenance): Increases `package.json` version and updates `static/version.json`. Runs on pre-commit.
- **`cleanup_topics.js`**: Removes duplicate words within topics.
- **`sync_topic_translations.js`**: Ensures topic translation files have the same keys as the topic word lists.

## 🔍 Analysis (Debugging)
*Located in `scripts/analysis/`*

- **`check_b2_missing.js`**: Checks a specific level for missing translations across all languages.
- **`find_missing_all.js`**: Deep scan of the entire project for missing keys.
- **`analyze_polysemy.js`**: detailed report on words appearing in multiple levels/topics.
- **`list_missing.js`**: Simple list of missing keys.

## ⚙️ Generation (Content Creation)
*Located in `scripts/generation/`*

- **`add_words_batch.js`**: Adds a batch of words to a level.
- **`create_topics.js`**: Scaffolding for new topics.
- **`align_topics.js`**: Aligns topic files with master lists.

## 📂 Root Scripts
- **`organize_scripts.js`**: Moves scripts into folders. **Warning:** Can displace `bump-version.js` if not configured correctly.
