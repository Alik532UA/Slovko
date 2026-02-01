# Scripts Directory

This folder contains various utility scripts for managing the dictionary data, translations, and topics.

## Directory Structure

### `maintenance/`
Scripts for fixing data inconsistencies, migrating keys, and version management.
- **fix_a2_missing/**: Tools to fix missing A2 translations.
- **fix_b1_missing/**: Tools to fix missing B1 translations.
- **fix_b2_missing/**: Tools to fix missing B2 translations.
- **cleanup_topics.js**: Removes unused or empty topics.
- **fix_missing_numbers.js**: Ensures numerical consistency in keys.
- **migrate_polysemy_a2.js**: Handles polysemy (multiple meanings) migration.
- **run_global_migration.js**: Master script for global data migration.
- **sync_topic_translations.js**: Synchronizes translations across different topic files.
- **bump-version.js**: Increases the app version.

### `analysis/`
Scripts for analyzing the current state of the dictionary data.
- **find_missing_all.js**: Comprehensive report on missing translations across all levels.
- **analyze_all_add.js**: Scans for words that need to be added from text files.
- **analyze_polysemy.js**: Detects words with multiple meanings that need splitting.
- **analyze_words.js**: General analysis of word usage and missing fields.
- **list_missing.js**: Lists missing keys or translations.
- **test_keys.js**: Validates key formats.

### `generation/`
Scripts for generating new data files or importing words.
- **add_words_batch.js**: Adds a batch of new words to the levels/topics.
- **create_topics.js**: Generates topic JSON files from source lists.
- **process_append.js**: Appends new words to existing levels based on analysis.
- **finalize_topics.js**: Final processing step for topic generation.

## Usage

**Check for missing translations:**
```bash
node scripts/analysis/find_missing_all.js
```

**Apply fixes (if needed):**
```bash
node scripts/maintenance/fix_a2_missing/apply_a2_fix.js
node scripts/maintenance/fix_b1_missing/apply_b1_fix.js
node scripts/maintenance/apply_b2_fix.js
```
