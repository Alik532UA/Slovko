import { test, expect } from '@playwright/test';

const PAGES = ['/'];

for (const path of PAGES) {
    test(`unique data-testid on ${path}`, async ({ page }) => {
        await page.goto(path);
        const ids = await page.$$eval('[data-testid]', els =>
            els.map(el => el.getAttribute('data-testid')).filter(Boolean)
        );
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes, `Duplicate data-testid: ${[...new Set(dupes)].join(', ')}`).toEqual([]);
    });
}
