import { expect, test, type Page } from '@playwright/test';

// Écran 06 Mes réservations, avec le mock Prism (sans état) : on vérifie les requêtes envoyées
// et l'affichage des réponses, pas la persistance.

const API = 'http://localhost:4010';
const CLIENT_1 = {
  id: '00000000-0000-4000-8000-200000000001',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT',
  createdAt: '2026-02-11T09:00:00Z',
};
const VOLTAIRE_RESERVATION = '00000000-0000-4000-8000-300000000001';

/** Les dates du jeu de données sont fixes : on fige l'horloge au 7 octobre 2026. */
async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-07T10:00:00+02:00'));
}

/** Session de Léa Martin (client-1) écrite dans le stockage avant le chargement de la page. */
async function signInAsClient(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem(
      'quorum.session',
      JSON.stringify({
        accessToken: 'mock-token-client-1',
        user,
        expiresAt: Date.now() + 3600_000,
      }),
    );
    localStorage.setItem('quorum.mockPersona', 'client-1');
  }, CLIENT_1);
}

/**
 * `GET /rooms/{id}` du mock renvoie toujours la première salle (Salle Voltaire) : on demande
 * l'exemple de la bonne salle (`Prefer: example=room-NN`, NN = fin de l'UUID).
 */
async function serveRoomsById(page: Page) {
  await page.route(/localhost:4010\/rooms\/[0-9a-f-]{36}$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    await route.continue({
      headers: { ...route.request().headers(), prefer: `example=room-${id.slice(-2)}` },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await freezeClock(page);
});

test.describe('client connecté', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsClient(page);
    await serveRoomsById(page);
  });

  test('affiche ses réservations par section, avec les noms des salles', async ({ page }) => {
    const roomRequests: string[] = [];
    page.on('request', (req) => {
      if (/\/rooms\/[0-9a-f-]{36}$/.test(req.url()) && req.method() === 'GET') {
        roomRequests.push(req.url());
      }
    });
    await page.goto('/reservations');
    await expect(page).toHaveTitle('Mes réservations · Quorum');
    await expect(page.getByRole('heading', { level: 1, name: 'Mes réservations' })).toBeVisible();

    const upcoming = page.getByRole('region', { name: 'À venir' });
    await expect(upcoming.getByRole('heading', { level: 3 })).toHaveText([
      'Salle Voltaire',
      'Auditorium Bastille',
    ]);
    await expect(upcoming.getByRole('link', { name: 'Modifier' })).toHaveCount(2);
    await expect(upcoming.getByRole('link', { name: 'Modifier' }).first()).toHaveAttribute(
      'href',
      `/reservations/${VOLTAIRE_RESERVATION}/modifier`,
    );

    const past = page.getByRole('region', { name: 'Passées, refusées ou annulées' });
    await expect(past.getByRole('heading', { level: 3 })).toHaveText(['Salle Beffroi']);
    await expect(past.getByText('Refusée', { exact: true })).toBeVisible();
    await expect(past.getByRole('button')).toHaveCount(0);

    // Seules les 3 réservations de client-1 sont affichées (le mock renvoie tout le jeu).
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
    // Un seul `GET /rooms/{id}` par salle distincte (anomalie 8).
    expect(roomRequests).toHaveLength(3);
  });

  test('filtre par statut : URL, onglet courant et requête', async ({ page }) => {
    await page.goto('/reservations');
    const filters = page.getByRole('navigation', { name: 'Filtrer par statut' });
    await expect(filters.getByRole('link', { name: 'Toutes' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const request = page.waitForRequest(
      (req) => req.url().startsWith(`${API}/reservations?`) && req.method() === 'GET',
    );
    await filters.getByRole('link', { name: 'En attente' }).click();
    await expect(page).toHaveURL('/reservations?status=PENDING');
    expect(new URL((await request).url()).searchParams.get('status')).toBe('PENDING');

    await expect(filters.getByRole('link', { name: 'En attente' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Auditorium Bastille']);
  });

  test('statut sans réservation : état vide', async ({ page }) => {
    await page.goto('/reservations?status=COMPLETED');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Aucune réservation avec ce statut' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voir toutes mes réservations' })).toHaveAttribute(
      'href',
      '/reservations',
    );
  });

  test('annulation : Échap ferme la modale et rend le focus au bouton', async ({ page }) => {
    await page.goto('/reservations');
    const cancel = page.getByRole('button', { name: 'Annuler', exact: true }).first();
    await cancel.click();

    const dialog = page.getByRole('dialog', { name: 'Annuler cette réservation ?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Salle Voltaire, lundi 12 octobre 2026, de 11:00 à 14:00.');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(cancel).toBeFocused();
  });

  test('annulation : « Annuler la réservation » envoie DELETE et met la liste à jour', async ({
    page,
  }) => {
    await page.goto('/reservations');
    await page.getByRole('button', { name: 'Annuler', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Annuler cette réservation ?' });

    const request = page.waitForRequest((req) => req.method() === 'DELETE');
    await dialog.getByRole('button', { name: 'Annuler la réservation' }).click();
    expect((await request).url()).toBe(`${API}/reservations/${VOLTAIRE_RESERVATION}`);

    await expect(dialog).toBeHidden();
    // Le bouton déclencheur a disparu : le focus va sur le message de confirmation.
    await expect(
      page.locator('[tabindex="-1"]').filter({ hasText: 'La réservation a été annulée.' }),
    ).toBeFocused();
    await expect(
      page.getByRole('status').filter({ hasText: 'La réservation a été annulée.' }),
    ).toBeVisible();
    const past = page.getByRole('region', { name: 'Passées, refusées ou annulées' });
    await expect(past.getByRole('listitem').filter({ hasText: 'Salle Voltaire' })).toContainText(
      'Annulée',
    );
    await expect(page.getByRole('region', { name: 'À venir' }).getByRole('listitem')).toHaveCount(
      1,
    );
  });

  test('message après une réservation créée, retiré de l’URL', async ({ page }) => {
    await page.goto('/reservations?created=1');
    await expect(
      page.getByRole('status').filter({
        hasText: 'Votre demande de réservation a été envoyée au gestionnaire de la salle.',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL('/reservations');
    await page.reload();
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
    await expect(page.getByText('Votre demande de réservation a été envoyée')).toHaveCount(0);
  });

  test('erreur de chargement : message et « Réessayer »', async ({ page }) => {
    let calls = 0;
    await page.route(`${API}/reservations?*`, async (route) => {
      calls += 1;
      if (calls === 1) await route.fulfill({ status: 500, json: { code: 'INTERNAL' } });
      else await route.continue();
    });
    await page.goto('/reservations');
    await expect(
      page.getByRole('alert').filter({ hasText: "Vos réservations n'ont pas pu être chargées" }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  });
});

test('un visiteur est renvoyé vers la connexion', async ({ page }) => {
  await page.goto('/reservations');
  await expect(page).toHaveURL('/connexion?redirect=%2Freservations');
});
