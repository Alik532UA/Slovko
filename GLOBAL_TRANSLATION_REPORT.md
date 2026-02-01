# Загальний звіт про стан локалізації

## Статистика
- **Загальна кількість проблем:** 19140
- **За мовами:**
  - UK: 356
  - CRH: 4802
  - NL: 7417
  - DE: 6565

- **За типами:**
  - Non-semantic key (numeric suffix): 1360
  - English text in uk localization: 16
  - Potential missing translation (value equals key): 3897
  - English text in crh localization: 3448
  - English text in nl localization: 5903
  - English text in de localization: 5352

## Критичні помилки (Відсутній переклад)
Нижче наведено приклади файлів, де значення залишилися англійською мовою (перші 20 прикладів):

| Мова | Файл | Ключ | Значення |
| :--- | :--- | :--- | :--- |
| UK | B1.json | `wifi` | `wi-fi` |
| UK | B2.json | `drama_noun` | `drama` |
| UK | B2.json | `equivalent_noun` | `equivalent` |
| UK | B2.json | `separate_verb` | `separate` |
| UK | B2.json | `state_verb` | `state` |
| UK | B2.json | `support_verb` | `support` |
| UK | B2.json | `update_verb` | `update` |
| UK | B2.json | `approach_1` | `approach` |
| UK | B2.json | `claim_2` | `claim` |
| UK | B2.json | `explore_verb` | `explore` |
| UK | B2.json | `measure_2` | `measure` |
| UK | B2.json | `research_verb` | `research` |
| UK | B2.json | `review_verb` | `review` |
| UK | B2.json | `treat_1` | `treat` |
| UK | B2.json | `warn_verb` | `warn` |
| UK | C1.json | `appeasement` | `ubtkahedfyyz` |
| UK | adjectives.json | `id` | `adjectives` |
| UK | colors.json | `id` | `colors` |
| UK | numbers.json | `id` | `numbers` |
| UK | time.json | `id` | `time` |


*Примітка: Повний список критичних помилок налічує 18616 записів.*