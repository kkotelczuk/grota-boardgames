import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  './',
  './en/',
  './gry/scythe/',
  './o-grocie/',
  './ulubione/',
  './generator/',
  './404.html',
];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`WCAG 2.2 AA (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const path of pages) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
      });
    }
  });
}

test('generator po podaniu hasła', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('grota:generator-access', '1'));
  await page.goto('./generator/');
  await page.getByRole('searchbox', { name: 'Szukaj gry z kolekcji' }).fill('scythe');
  await page
    .getByRole('button', { name: /^Scythe/ })
    .first()
    .click();
  // Panel „Wygląd”: sprawdzamy każdą zakładkę (nieaktywne panele są ukryte i axe ich nie widzi).
  for (const tab of ['Tło', 'Napis', 'Kafelki']) {
    await page.getByRole('tab', { name: tab }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map((v) => `${tab} – ${v.id}: ${v.nodes.length} × ${v.help}`),
    ).toEqual([]);
  }
});
