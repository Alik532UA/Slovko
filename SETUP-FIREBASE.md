# Налаштувати викладення правил доступу — один раз

Правила доступу до бази (`firestore.rules`, `database.rules.json`) тепер
викладає CI на кожен пуш у `main`. Щоб він міг це робити, потрібні **ключ і
права до нього** — два різні налаштування, і жодне з них не замінює друге.
Доки немає ключа, прогін не падає: він пише попередження, а в базі лишаються
старі правила. Коли ключ є, а прав бракує — прогін падає з `403`.

**Перевірити, чи вже зроблено — ключ:**

```bash
gh secret list -R Alik532UA/Slovko
```

**і права:** останній прогін `publish-rules` зелений.

```bash
gh run list -R Alik532UA/Slovko --workflow deploy.yml --limit 1
```

Якщо і секрет `FIREBASE_SERVICE_ACCOUNT` у списку, і прогін зелений — усе
готово, далі читати не треба.

---

## Крок 1. Завантажити ключ сервісного акаунта

Сервісний акаунт — це «робот», від імені якого CI звертається до Firebase.
Ключ до нього Firebase генерує сам, нічого налаштовувати не треба.

1. відкрити
   <https://console.firebase.google.com/project/slovko-alik532/settings/serviceaccounts/adminsdk>
2. натиснути **Generate new private key** (укр. «Створити новий закритий ключ»);
3. підтвердити — браузер завантажить файл виду
   `slovko-alik532-firebase-adminsdk-xxxxx.json`.

> Цей файл — **ключ від бази**. Не кладіть його в репозиторій і не надсилайте
> нікому. Після кроку 2 його можна видалити з «Завантажень»: у секретах GitHub
> уже буде копія.

## Крок 2. Покласти ключ у секрети репозиторію

Одна команда. Підставте справжній шлях до завантаженого файлу:

```bash
gh secret set FIREBASE_SERVICE_ACCOUNT -R Alik532UA/Slovko < "$HOME/Downloads/slovko-alik532-firebase-adminsdk-xxxxx.json"
```

У Windows PowerShell шлях зазвичай такий:

```bash
gh secret set FIREBASE_SERVICE_ACCOUNT -R Alik532UA/Slovko < "C:/Users/alik5/Downloads/slovko-alik532-firebase-adminsdk-xxxxx.json"
```

Команда читає файл і відправляє вміст зашифрованим. Вставляти текст ключа
руками нікуди не треба.

## Крок 3. Видати сервісному акаунтові права

**Цей крок обовʼязковий.** Ключа замало: ключ каже, *хто* стукає, ролі кажуть,
*що* йому можна. Типовий ключ Firebase Admin SDK вміє читати правила, але
**не вміє їх викладати** — це виміряно, а не припущено: прогін
[35539801764](https://github.com/Alik532UA/Slovko/actions/runs/35539801764)
впав двічі поспіль, спершу на `serviceusage`, потім на `firebaserules`.

1. відкрити
   <https://console.cloud.google.com/iam-admin/iam?project=slovko-alik532>
2. знайти рядок, що закінчується на `@slovko-alik532.iam.gserviceaccount.com`;
3. олівець (**Edit principal**) праворуч;
4. **ADD ANOTHER ROLE** і додати всі чотири ролі зі стовпця «Роль» нижче
   (поле пошуку приймає і назву, і ідентифікатор);
5. **SAVE**.

Ролей саме чотири, бо стільки дій робить один рядок `firebase deploy --only
firestore:rules,firestore:indexes,database`. Кожна вимагає своєї:

| Що викладається | Роль у консолі | Ідентифікатор |
|---|---|---|
| `firestore.rules` | Firebase Rules Admin | `roles/firebaserules.admin` |
| `firestore.indexes.json` | Cloud Datastore Index Admin | `roles/datastore.indexAdmin` |
| `database.rules.json` | Firebase Realtime Database Admin | `roles/firebasedatabase.admin` |
| — (перевірка, що API увімкнені) | Service Usage Consumer | `roles/serviceusage.serviceUsageConsumer` |

Останній рядок виглядає зайвим, але без нього `firebase-tools` падає ще до
першого правила: перед викладенням він питає в Google, чи ввімкнено
`firestore.googleapis.com`, і саме це питання вимагає окремого дозволу.

> **Чому не одна роль на все.** `Owner` або `Editor` теж спрацюють — і саме
> тому їх тут немає. Ключ лежить у секретах GitHub; кожен, хто має доступ до
> воркфлоу, має доступ до того, що цей ключ уміє. Чотири вузькі ролі вміють
> рівно те, що робить CI, і нічого більше — не читають дані користувачів, не
> створюють ресурсів, не роздають прав далі.

---

## Крок 4. Перевірити

```bash
gh secret list -R Alik532UA/Slovko
```

У списку має з'явитися `FIREBASE_SERVICE_ACCOUNT`. Далі — будь-який пуш у
`main`; у прогоні має бути зелений джоб **publish-rules** із кроком «Викласти
правила й індекси», а не пропущений.

```bash
gh run list -R Alik532UA/Slovko --limit 1
gh run view -R Alik532UA/Slovko --log | grep -A5 "Викласти правила"
```

## Що з чого береться

| Значення | Звідки CI його бере | Чи треба щось робити |
|---|---|---|
| ключ сервісного акаунта | секрет `FIREBASE_SERVICE_ACCOUNT` | **так, кроки вище** |
| ідентифікатор проєкту | змінна `vars.VITE_FIREBASE_PROJECT_ID` | ні, вона вже стоїть (`slovko-alik532`) |

Окремого секрету під ідентифікатор проєкту НЕ заводьте: одне джерело на один
факт. Значення публічне за побудовою — воно лежить у бандлі, який віддається
кожному відвідувачу, тому змінна, а не секрет.
