// Parcours gestionnaire des écrans 08 « Mes salles » et 09 « Ajouter / modifier une salle »
// (plan.md étapes 5.1, 5.2 et 5.6). Le mock Prism est sans état : on vérifie la requête envoyée
// et l'affichage de la réponse, pas la persistance.
import { expect, test, type Page, type Request } from '@playwright/test';

const API = 'http://localhost:4010';

const NADIA = {
  id: '00000000-0000-4000-8000-200000000004',
  firstName: 'Nadia',
  lastName: 'Benali',
  email: 'gestionnaire1@salles.example',
  role: 'GESTIONNAIRE',
  createdAt: '2026-05-11T09:00:00Z',
};

const LEA = {
  id: '00000000-0000-4000-8000-200000000001',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT',
  createdAt: '2026-02-11T09:00:00Z',
};

const VOLTAIRE_ID = '00000000-0000-4000-8000-100000000001';

/** Écrit la session dans le `localStorage` avant le chargement de la page. */
async function signIn(page: Page, user: typeof NADIA, persona: string, token: string) {
  await page.addInitScript(
    ({ user, persona, token }) => {
      localStorage.setItem(
        'quorum.session',
        JSON.stringify({ accessToken: token, user, expiresAt: Date.now() + 3600_000 }),
      );
      localStorage.setItem('quorum.mockPersona', persona);
    },
    { user, persona, token },
  );
}

const asManager = (page: Page) =>
  signIn(page, NADIA, 'gestionnaire-1', 'mock-token-gestionnaire-1');

function isApiCall(request: Request, method: string, path: string): boolean {
  return request.method() === method && request.url() === `${API}${path}`;
}

test.describe('Mes salles (08)', () => {
  test('affiche les 5 salles de Nadia Benali', async ({ page }) => {
    await asManager(page);
    await page.goto('/gestion/salles');

    await expect(page.getByRole('heading', { level: 1, name: 'Mes salles' })).toBeVisible();
    await expect(page.getByText('5 salles dont vous êtes gestionnaire.')).toBeVisible();
    const table = page.getByRole('table', { name: 'Mes salles' });
    await expect(table.locator('tbody tr')).toHaveCount(5);
    for (const name of [
      'Salle Voltaire',
      'Auditorium Bastille',
      'Bureau Oberkampf',
      'Salle Rhône',
      'Salle Saône',
    ]) {
      await expect(table.getByRole('link', { name, exact: true })).toBeVisible();
    }
    const voltaire = table.locator('tbody tr').first();
    await expect(voltaire).toContainText('12 pers.');
    await expect(voltaire).toContainText('45,00 € / h');
    await expect(voltaire).toContainText('Active');
    await expect(voltaire.getByRole('link', { name: 'Disponibilités' })).toHaveAttribute(
      'href',
      `/gestion/salles/${VOLTAIRE_ID}/disponibilites`,
    );
    await expect(voltaire.getByRole('link', { name: 'Modifier Salle Voltaire' })).toHaveAttribute(
      'href',
      `/gestion/salles/${VOLTAIRE_ID}/modifier`,
    );
  });

  test('supprime une salle après confirmation', async ({ page }) => {
    await asManager(page);
    await page.goto('/gestion/salles');

    await page.getByRole('button', { name: 'Supprimer Salle Voltaire' }).click();
    const dialog = page.getByRole('dialog', { name: 'Supprimer la salle Voltaire ?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('La salle disparaîtra du catalogue.');

    const deleteRequest = page.waitForRequest((request) =>
      isApiCall(request, 'DELETE', `/rooms/${VOLTAIRE_ID}`),
    );
    await dialog.getByRole('button', { name: 'Supprimer la salle' }).click();
    await deleteRequest;

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('status').filter({ hasText: 'La salle a été supprimée.' }),
    ).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(4);
    await expect(page.getByRole('link', { name: 'Salle Voltaire', exact: true })).toHaveCount(0);
  });

  test('un client est renvoyé vers « Accès refusé »', async ({ page }) => {
    await signIn(page, LEA, 'client-1', 'mock-token-client-1');
    await page.goto('/gestion/salles');
    await expect(page).toHaveURL(/\/acces-refuse$/);
  });
});

test.describe('Ajouter / modifier une salle (09)', () => {
  test('signale les erreurs dans un récapitulatif focalisé', async ({ page }) => {
    await asManager(page);
    await page.goto('/gestion/salles/nouvelle');

    await expect(page.getByRole('heading', { level: 1, name: 'Ajouter une salle' })).toBeVisible();
    await page.getByLabel('Capacité').fill('0');
    await page.getByLabel('Adresse de la photo').fill('photo.jpg');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const summary = page
      .getByRole('alert')
      .filter({ hasText: "erreurs empêchent l'enregistrement" });
    await expect(summary).toBeVisible();
    await expect(summary.locator('xpath=..')).toBeFocused();
    await expect(summary.getByRole('link')).toHaveText([
      'Nom : Le nom est obligatoire.',
      'Lieu : Le lieu est obligatoire.',
      "Capacité : La capacité doit être d'au moins 1 personne.",
      'Tarif horaire : Le tarif horaire est obligatoire.',
      'Adresse de la photo : Saisissez une adresse web complète, par exemple https://exemple.fr',
    ]);
    await expect(page.getByLabel('Capacité')).toHaveAttribute('aria-invalid', 'true');

    // Le lien du récapitulatif mène au champ ; corrigé puis quitté, le champ n'est plus en erreur.
    await summary.getByRole('link', { name: /^Nom/ }).click();
    await expect(page.getByLabel('Nom')).toBeFocused();
    await page.getByLabel('Nom').fill('Salle Test');
    await page.getByLabel('Nom').blur();
    await expect(page.getByLabel('Nom')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(summary.getByRole('link')).toHaveCount(4);
  });

  test('crée une salle avec un corps complet, puis revient à « Mes salles »', async ({ page }) => {
    await asManager(page);
    await page.goto('/gestion/salles/nouvelle');

    await page.getByLabel('Nom').fill('Salle Seine');
    await page.getByLabel('Description').fill('Salle claire au bord de l’eau.');
    await page.getByLabel('Lieu').fill('Paris 4e');
    await page.getByLabel('Capacité').fill('8');
    await page.getByLabel('Tarif horaire').fill('32.5');
    await page.getByLabel('Wi-Fi').check();
    await page.getByLabel('Paperboard').check();

    // Aperçu en direct
    const preview = page.getByRole('complementary', { name: 'Aperçu dans le catalogue' });
    await expect(preview.getByRole('heading', { name: 'Salle Seine' })).toBeVisible();
    await expect(preview).toContainText('Paris 4e');
    await expect(preview).toContainText('8 pers. max');
    await expect(preview).toContainText('32,50 €');

    const postRequest = page.waitForRequest((request) => isApiCall(request, 'POST', '/rooms'));
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    const request = await postRequest;
    expect(request.postDataJSON()).toEqual({
      name: 'Salle Seine',
      description: 'Salle claire au bord de l’eau.',
      location: 'Paris 4e',
      capacity: 8,
      pricePerHour: 32.5,
      equipment: ['Wi-Fi', 'Paperboard'],
    });

    await expect(page).toHaveURL(/\/gestion\/salles$/);
    await expect(
      page.getByRole('status').filter({ hasText: 'La salle a été enregistrée.' }),
    ).toBeVisible();
  });

  test('modifie une salle en envoyant l’objet complet', async ({ page }) => {
    await asManager(page);
    await page.goto(`/gestion/salles/${VOLTAIRE_ID}/modifier`);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Modifier la salle Voltaire' }),
    ).toBeVisible();
    await expect(page.getByLabel('Nom')).toHaveValue('Salle Voltaire');
    await expect(page.getByLabel('Capacité')).toHaveValue('12');
    await expect(page.getByLabel('Écran 65"')).toBeChecked();

    await page.getByLabel('Capacité').fill('14');
    await page.getByLabel('Wi-Fi').uncheck();
    await page.getByLabel('Vidéoprojecteur').check();

    const patchRequest = page.waitForRequest((request) =>
      isApiCall(request, 'PATCH', `/rooms/${VOLTAIRE_ID}`),
    );
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    const request = await patchRequest;
    expect(request.postDataJSON()).toEqual({
      name: 'Salle Voltaire',
      description: 'Salle lumineuse avec verrière, idéale pour les ateliers.',
      location: 'Paris 11e',
      capacity: 14,
      pricePerHour: 45,
      equipment: ['Écran 65"', 'Tableau blanc', 'Vidéoprojecteur'],
      imageUrl: 'https://picsum.photos/seed/room-01/800/600',
    });
    await expect(page).toHaveURL(/\/gestion\/salles$/);
  });

  test('propose aussi les équipements de la salle absents de la liste', async ({ page }) => {
    await asManager(page);
    await page.route(`${API}/rooms/${VOLTAIRE_ID}`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const response = await route.fetch();
      const room = (await response.json()) as Record<string, unknown>;
      await route.fulfill({ response, json: { ...room, equipment: ['Écran 32"', 'Wi-Fi'] } });
    });
    await page.goto(`/gestion/salles/${VOLTAIRE_ID}/modifier`);
    await expect(page.getByLabel('Écran 32"')).toBeChecked();
    await expect(
      page.getByRole('group', { name: 'Équipements' }).getByRole('checkbox'),
    ).toHaveCount(11);
  });

  test('refuse la modification d’une salle d’un autre gestionnaire', async ({ page }) => {
    await asManager(page);
    await page.route(`${API}/rooms/${VOLTAIRE_ID}`, async (route) => {
      const response = await route.fetch();
      const room = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        response,
        json: { ...room, ownerId: '00000000-0000-4000-8000-200000000005' },
      });
    });
    await page.goto(`/gestion/salles/${VOLTAIRE_ID}/modifier`);
    await expect(page.getByRole('heading', { level: 1, name: 'Accès refusé' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  });
});
