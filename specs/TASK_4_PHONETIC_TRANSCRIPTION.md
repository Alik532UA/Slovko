# Task 4: Phonetic Transcription System (IPA-based)

## Objective

Implement a robust phonetic transcription system using IPA (International Phonetic Alphabet) as an intermediate layer to support accurate pronunciation guides for any language pair (e.g., Dutch -> Crimean Tatar).

## Architecture

1.  **Data Source**: IPA Dictionaries per language.
    - `src/lib/data/transcriptions/[lang]/[category]/[id].json`
    - Contains `wordKey` -> `IPA string` mapping.
2.  **Mapping Layer**: IPA to Target Alphabet Mappers.
    - `src/lib/data/ipa-maps/`
    - Maps IPA symbols to target language letters/sounds.
3.  **Service**: `phoneticsService.ts`
    - Orchestrates the conversion.

## Steps

1.  **Refactor Data Structure**:
    - Move existing `transcriptions/levels/*.json` to `transcriptions/en/levels/`.
    - Create `transcriptions/nl/levels/A1.json` with IPA data.
2.  **Implement IPA Mappers**:
    - `map-ipa-to-uk.ts`: IPA -> Ukrainian Cyrillic.
    - `map-ipa-to-crh.ts`: IPA -> Crimean Tatar Latin.
    - `map-ipa-to-nl.ts`: IPA -> Dutch (Latin) - optional, fallback.
    - `map-ipa-to-de.ts`: IPA -> German (Latin) - optional.
3.  **Update Services**:
    - `wordService.ts`: Update `loadTranscriptions` to accept language.
    - `transcriptionService.ts`: Integrate `phoneticsService`.
4.  **Update Game State**:
    - Load IPA transcriptions for Source and Target languages.
    - Generate display transcription using Mappers.

## IPA Mapping Strategy (Draft)

### Vowels

- `/iː/` -> UK: `і`, CRH: `i`
- `/ɪ/` -> UK: `и`, CRH: `i`
- `/e/` -> UK: `е`, CRH: `e`
- `/æ/` -> UK: `е` (а/е mix), CRH: `ä`
- `/ɑː/` -> UK: `а`, CRH: `a`
- `/ɔː/` -> UK: `о`, CRH: `o`
- `/ʊ/` -> UK: `у`, CRH: `u`
- `/uː/` -> UK: `у`, CRH: `ü/u`
- `/ʌ/` -> UK: `а`, CRH: `a`
- `/ə/` -> UK: `е/а`, CRH: `e`

### Consonants

- `/p/` -> `п`, `p`
- `/b/` -> `б`, `b`
- `/t/` -> `т`, `t`
- `/d/` -> `д`, `d`
- `/k/` -> `к`, `k`
- `/ɡ/` -> `ґ`, `g`
- `/f/` -> `ф`, `f`
- `/v/` -> `в`, `v`
- `/θ/` -> `с` (th), `s`
- `/ð/` -> `з` (th), `z`
- `/s/` -> `с`, `s`
- `/z/` -> `з`, `z`
- `/ʃ/` -> `ш`, `ş`
- `/ʒ/` -> `ж`, `j`
- `/h/` -> `х`, `h`
- `/m/` -> `м`, `m`
- `/n/` -> `н`, `n`
- `/ŋ/` -> `н`, `ñ`
- `/l/` -> `л`, `l`
- `/r/` -> `р`, `r`
- `/j/` -> `й`, `y`
- `/w/` -> `в`, `w/v`

This system allows scalable addition of languages.
