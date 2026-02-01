# A2 Missing Translations Fix (2026-02-01)

This directory contains scripts and data used to identify and fix missing translations for Level A2 words.

## Files

- **find_missing_a2.js**: Scans `src/lib/data/words/levels/A2.json` and compares it with translation files to find missing keys.
- **missing_a2_report.json**: The output of `find_missing_a2.js`, listing missing words for each language.
- **missing_words_data_1.js**: First batch of manual translations and transcriptions for the missing words.
- **missing_words_data_2.js**: Second batch of manual translations.
- **apply_a2_fix.js**: Reads the data from `missing_words_data_*.js` and updates the actual JSON files in `src/lib/data/translations` and `src/lib/data/transcriptions`.

## Usage

To re-apply the fixes (e.g. if the data is updated):

```bash
node scripts/maintenance/fix_a2_missing/apply_a2_fix.js
```
