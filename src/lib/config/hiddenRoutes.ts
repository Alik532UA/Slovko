/**
 * Маршрути, яких не мусить бути в пошуку (BETA-CHECKLIST-v8 § 4, § 4.1).
 *
 * Один перелік на три вимоги, а не три окремі правки:
 *
 * - `hooks.server.ts` не лишає для них `canonical` у зібраному HTML;
 * - сама сторінка друкує `noindex, nofollow`;
 * - `scripts/check-build.mjs` перевіряє обидві обіцянки над `build/`, і
 *   ПРОТИЛЕЖНЕ — для решти сторінок;
 * - `static/robots.txt` містить для них `Disallow`.
 *
 * Це **не** означає «неможливо знайти». Статичний сайт із відкритого
 * репозиторію таємниці не тримає, а довжина шляху додає до захисту приблизно
 * нічого. Адреса працює завжди, і її дають посиланням тому, хто згодився
 * допомогти; сенс приховування — не пускати службову сторінку в пошук, а не
 * зробити з неї секрет.
 */

/** Сегменти без слешів по краях: `beta-test-checklists`, не `/beta-…/`. */
export const HIDDEN_ROUTES: readonly string[] = ["beta-test-checklists"];

/** Чи належить шлях (`/Slovko/beta-test-checklists/`) прихованому маршруту. */
export function isHiddenRoute(pathname: string): boolean {
	return HIDDEN_ROUTES.some((route) => pathname.replace(/\/+$/, "").endsWith(`/${route}`));
}
