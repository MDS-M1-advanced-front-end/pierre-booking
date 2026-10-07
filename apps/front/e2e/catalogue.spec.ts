import { expect, test } from '@playwright/test';

// Écran 01 Catalogue (cadrage.md § 4). Les données viennent du mock Prism, appelé par le serveur
// Astro : la requête n'est pas observable depuis le navigateur. On vérifie donc l'URL de la page
// et ce qu'elle affiche. Le mock ignore les filtres et la pagination (15 salles, toujours).

const results = (page: import('@playwright/test').Page) => page.getByRole('status');

test.describe('catalogue', () => {
  test('affiche les salles du mock', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Trouver une salle · Quorum');
    await expect(page.getByRole('heading', { level: 1, name: 'Trouver une salle' })).toBeVisible();
    await expect(results(page)).toHaveText('15 salles');
    const cards = page.getByRole('heading', { level: 3 });
    await expect(cards).toHaveCount(15);
    await expect(page.getByRole('link', { name: 'Salle Voltaire' })).toBeVisible();
  });

  test('le lieu choisi passe dans l’URL et dans le résumé', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('search', { name: 'Rechercher une salle' });
    // La liste des lieux est déduite des salles du mock.
    await expect(search.getByLabel('Lieu').locator('option')).toContainText([
      'Tous les lieux',
      'Bordeaux Chartrons',
      'Lyon Part-Dieu',
      'Paris 11e',
    ]);
    await search.getByLabel('Lieu').selectOption('Lyon Part-Dieu');
    await search.getByLabel('Minimum').fill('10');
    await search.getByRole('button', { name: 'Afficher les résultats' }).click();

    // Avec JavaScript, seuls les filtres renseignés restent dans l'URL.
    await expect(page).toHaveURL('/?location=Lyon+Part-Dieu&capacityMin=10');
    await expect(results(page)).toHaveText('15 salles à Lyon Part-Dieu pour 10 personnes ou plus');
    await expect(page.getByLabel('Lieu')).toHaveValue('Lyon Part-Dieu');
    await expect(page.getByLabel('Minimum')).toHaveValue('10');
  });

  test('construit la phrase de résultats à partir des filtres de l’URL', async ({ page }) => {
    await page.goto(
      '/?capacityMin=10&date=2026-11-16&startTime=15:00&endTime=18:00&available=true',
    );
    await expect(results(page)).toHaveText(
      '15 salles disponibles pour 10 personnes ou plus, le lundi 16 novembre 2026 de 15:00 à 18:00',
    );
    await expect(page.getByLabel('Uniquement les salles disponibles')).toBeChecked();
    await expect(page.getByLabel('De', { exact: true })).toHaveValue('15:00');
  });

  test('ignore les paramètres invalides', async ({ page }) => {
    await page.goto('/?capacityMin=abc&capacityMax=0&date=2026-02-30&startTime=25:00&page=-1');
    await expect(results(page)).toHaveText('15 salles');
    await expect(page.getByLabel('Minimum')).toHaveValue('');
    await expect(page.getByLabel('Date')).toHaveValue('');
  });

  test('la carte mène à la fiche de la salle', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: 'Salle Voltaire' });
    const href = (await link.getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/salles\/[\w-]+$/);
    // Toute la carte est cliquable : un clic hors du titre suit aussi le lien.
    await page
      .getByRole('article')
      .filter({ has: link })
      .click({ position: { x: 20, y: 100 } });
    await expect(page).toHaveURL(href);
  });

  test('« Réinitialiser les filtres » revient au catalogue sans filtre', async ({ page }) => {
    await page.goto('/?location=Paris+11e');
    await page.getByRole('link', { name: 'Réinitialiser les filtres' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByLabel('Lieu')).toHaveValue('');
  });
});

test.describe('catalogue en mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('les filtres sont repliés, avec le nombre de filtres actifs', async ({ page }) => {
    await page.goto('/?capacityMin=10&date=2026-11-16');
    const summary = page.locator('summary', { hasText: 'Filtres' });
    await expect(summary).toContainText('2 actifs');
    const location = page.getByLabel('Lieu');
    await expect(location).toBeHidden();
    await summary.click();
    await expect(location).toBeVisible();
  });
});

test.describe('catalogue sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('affiche les salles et filtre par formulaire GET', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(15);

    const search = page.getByRole('search', { name: 'Rechercher une salle' });
    await search.getByLabel('Lieu').selectOption('Paris 11e');
    await search.getByRole('button', { name: 'Afficher les résultats' }).click();

    // Sans JavaScript, le navigateur envoie tous les champs, même vides.
    await expect(page).toHaveURL(/[?&]location=Paris\+11e(&|$)/);
    await expect(results(page)).toHaveText('15 salles à Paris 11e');
    await expect(page.getByLabel('Lieu')).toHaveValue('Paris 11e');
  });
});
