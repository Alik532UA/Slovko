# Пропозиції для коміту / Commit Message Suggestions

## Українською (Ukrainian)

**Назва:**
Налаштування статичного деплою та GitHub Actions workflow

**Опис:**
- Додано конфігурацію пререндерингу та завершальних слешів у `src/routes/+layout.ts` для підготовки до статичного експорту.
- Оновлено конфігурацію GitHub Actions у `.github/workflows/deploy.yml`:
  - Додано `concurrency` для уникнення конфліктів при одночасному деплої.
  - Розділено процес на два окремі етапи: `build` (збірка) та `deploy` (розгортання).
  - Налаштовано використання офіційного екшена `actions/deploy-pages` для стабільної публікації на GitHub Pages.

---

## English

**Title:**
Configure static deployment and GitHub Actions workflow

**Description:**
- Enabled prerendering and trailing slashes in `src/routes/+layout.ts` for static site generation.
- Updated GitHub Actions configuration in `.github/workflows/deploy.yml`:
  - Added `concurrency` control to prevent deployment conflicts.
  - Split the workflow into distinct `build` and `deploy` jobs.
  - Configured the official `actions/deploy-pages` action for reliable publishing to GitHub Pages.
