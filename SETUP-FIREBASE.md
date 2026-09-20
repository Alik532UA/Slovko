# Налаштувати викладення правил доступу — один раз

Правила доступу до бази (`firestore.rules`, `database.rules.json`) тепер
викладає CI на кожен пуш у `main`. Щоб він міг це робити, потрібен **один
секрет**. Доки його немає, прогін не падає — він пише попередження, а в базі
лишаються старі правила.

**Перевірити, чи вже зроблено:**

```bash
gh secret list -R Alik532UA/Slovko
```

Якщо у списку є `FIREBASE_SERVICE_ACCOUNT` — усе готово, далі читати не треба.

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

## Крок 3. Перевірити

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

---

## Якщо крок викладення впав на правах

Типовий ключ Firebase Admin SDK має досить прав. Якщо все-таки прийшла
відмова виду `PERMISSION_DENIED`, акаунтові бракує ролі:

1. <https://console.cloud.google.com/iam-admin/iam?project=slovko-alik532>
2. знайти рядок, що закінчується на `@slovko-alik532.iam.gserviceaccount.com`;
3. олівець → **ADD ANOTHER ROLE** → `Firebase Rules Admin`;
4. ще раз те саме → `Firebase Realtime Database Admin`;
5. **SAVE**.

## Що з чого береться

| Значення | Звідки CI його бере | Чи треба щось робити |
|---|---|---|
| ключ сервісного акаунта | секрет `FIREBASE_SERVICE_ACCOUNT` | **так, кроки вище** |
| ідентифікатор проєкту | змінна `vars.VITE_FIREBASE_PROJECT_ID` | ні, вона вже стоїть (`slovko-alik532`) |

Окремого секрету під ідентифікатор проєкту НЕ заводьте: одне джерело на один
факт. Значення публічне за побудовою — воно лежить у бандлі, який віддається
кожному відвідувачу, тому змінна, а не секрет.
