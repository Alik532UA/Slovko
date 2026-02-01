# Загальний звіт про стан локалізації

## Статистика
- **Загальна кількість проблем:** 14860
- **За мовами:**
  - UK: 110
  - CRH: 3439
  - NL: 6086
  - DE: 5225

- **За типами:**
  - Non-semantic key (numeric suffix): 408
  - English text in uk localization: 8
  - English text in crh localization: 3331
  - Potential missing translation (value equals key): 389
  - English text in nl localization: 5791
  - English text in de localization: 5178

## Критичні помилки (Відсутній переклад)
Нижче наведено приклади файлів, де значення залишилися англійською мовою (перші 20 прикладів):

| Мова | Файл | Ключ | Значення |
| :--- | :--- | :--- | :--- |
| UK | B1.json | `wifi_connection` | `Wi-Fi` |
| UK | B1.json | `wifi` | `Wi-Fi` |
| UK | adjectives.json | `id` | `adjectives` |
| UK | colors.json | `id` | `colors` |
| UK | it.json | `wifi` | `Wi-Fi` |
| UK | it.json | `wifi_connection` | `Wi-Fi` |
| UK | numbers.json | `id` | `numbers` |
| UK | time.json | `id` | `time` |
| CRH | A1.json | `yes` | `e` |
| CRH | A1.json | `no` | `yoq` |
| CRH | A1.json | `water` | `suv` |
| CRH | A1.json | `apple` | `alma` |
| CRH | A1.json | `house` | `ev` |
| CRH | A1.json | `cat` | `pisik` |
| CRH | A1.json | `moon` | `ay` |
| CRH | A1.json | `night` | `gece` |
| CRH | A1.json | `friend` | `dost` |
| CRH | A1.json | `book` | `kitap` |
| CRH | A1.json | `mother` | `ana` |
| CRH | A1.json | `father` | `baba` |


*Примітка: Повний список критичних помилок налічує 14697 записів.*