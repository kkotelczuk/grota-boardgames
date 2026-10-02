import { expect, test } from '@playwright/test';

/** Wyspy są interaktywne dopiero po hydratacji – Astro usuwa atrybut `ssr` z <astro-island>. */
/**
 * Karty mają `content-visibility: auto` – tuż po przewinięciu przeglądarka jeszcze ich nie
 * wyrenderowała (hit-testing trafia w <li>). Czekamy dwie klatki, jak zrobiłby to człowiek.
 */
async function nextFrames(page: import('@playwright/test').Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function waitForIslands(page: import('@playwright/test').Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

test('lista gier jest w HTML-u także bez JS', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.locator('article').count()).toBeGreaterThan(200);
  await context.close();
});

test('wyszukiwanie bez polskich znaków i filtr liczby graczy', async ({ page }) => {
  await page.goto('./');
  await waitForIslands(page);

  const status = page.getByRole('status').first();
  await page.getByRole('searchbox', { name: 'Szukaj gry' }).fill('sabotazysta');
  await expect(
    page.getByRole('heading', { level: 3, name: 'Sabotażysta', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/q=sabotazysta/);

  await page.getByRole('searchbox', { name: 'Szukaj gry' }).fill('');
  const before = await status.textContent();
  // Filtr „gramy w 8+” – w drawerze na mobile, w sidebarze na desktopie.
  const filtersButton = page.getByRole('button', { name: /Pokaż filtry/ });
  if (await filtersButton.isVisible()) await filtersButton.click();
  await page
    .getByRole('dialog')
    .or(page.getByRole('complementary'))
    .getByText('8+', { exact: true })
    .click();
  await expect(status).not.toHaveText(before ?? '');
  await expect(page).toHaveURL(/players=8/);
});

test('szczegóły gry, przełącznik języka i ulubione', async ({ page }) => {
  await page.goto('./gry/scythe/');
  await waitForIslands(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Scythe' })).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj do ulubionych' }).click();
  await expect(page.getByRole('button', { name: 'Usuń z ulubionych' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Ulubione przetrwają odświeżenie i są widoczne na liście ulubionych.
  await page.reload();
  await waitForIslands(page);
  await expect(page.getByRole('button', { name: 'Usuń z ulubionych' })).toBeVisible();
  await page.goto('./ulubione/');
  await expect(page.getByRole('heading', { level: 3, name: 'Scythe' })).toBeVisible();

  // Przełącznik języka prowadzi do odpowiednika bieżącej strony.
  await page.goto('./gry/scythe/');
  await page.getByRole('link', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL(/\/en\/games\/scythe\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('przekierowanie /discord/ ma link awaryjny', async ({ request }) => {
  const response = await request.get('./discord/');
  const html = await response.text();
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toMatch(/href="https:\/\/discord\.gg\//);
});

test.describe('karta gry', () => {
  // Bez animacji View Transition: w trakcie przejścia (np. po „wstecz”) kliknięcia trafiają
  // w nakładkę ::view-transition, co w teście dawałoby losowe wyniki.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('cała karta jest klikalna, a serduszko działa osobno', async ({ page }) => {
    await page.goto('./');
    await waitForIslands(page);
    const card = page.locator('article').filter({ hasText: 'Scythe' }).first();
    await card.scrollIntoViewIfNeeded();
    await nextFrames(page);

    // Serduszko leży nad warstwą linku – nie nawiguje.
    await card.getByRole('button', { name: /Dodaj do ulubionych/ }).click();
    await expect(page).toHaveURL(/\/grota-boardgames\/(\?.*)?$/);

    // Klik w statystyki (nie w tytuł) otwiera stronę gry. `force`, bo Playwright słusznie widzi,
    // że <dl> jest przykryte warstwą linku – klik we współrzędne trafia właśnie w nią.
    await nextFrames(page);
    await card.locator('dl').click({ force: true });
    await expect(page).toHaveURL(/\/gry\/scythe\/$/);

    // Klik w okładkę też.
    await page.goBack();
    await waitForIslands(page);
    const cover = page.locator('article').filter({ hasText: 'Scythe' }).first().locator('img');
    await cover.scrollIntoViewIfNeeded();
    await nextFrames(page);
    await cover.click({ force: true });
    await expect(page).toHaveURL(/\/gry\/scythe\/$/);
  });
});
