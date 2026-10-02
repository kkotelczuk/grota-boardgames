import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['./', './en/', './gry/scythe/', './o-grocie/', './ulubione/', './404.html'];

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
