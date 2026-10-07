import { expect, test, type Page } from '@playwright/test';

// Écran 02 Fiche salle. Le mock Prism est sans état : on vérifie la requête envoyée et l'affichage.
// Créneaux du mock (toute date) : 08:00 libre, 09:00 → 12:00 réservés, 12:00 et 13:00 libres,
// 14:00 réservé, 15:00 → 19:00 libres.
const ROOM_ID = '00000000-0000-4000-8000-100000000001';
const DATE = '2026-11-16'; // heure d'hiver à Paris : UTC+1
const ROOM_URL = `/salles/${ROOM_ID}?date=${DATE}`;

const client = {
  id: '00000000-0000-4000-8000-200000000001',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT',
  createdAt: '2026-02-11T09:00:00Z',
};

/** Session de Léa Martin (client) écrite dans le localStorage avant le chargement de la page. */
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
  }, client);
}

const slotGrid = (page: Page) =>
  page.getByRole('group', { name: 'Créneaux du lundi 16 novembre 2026' });

test('affiche la fiche d’une salle rendue par le serveur', async ({ page }) => {
  await page.goto(ROOM_URL);
  await expect(page).toHaveTitle('Salle Voltaire · Quorum');
  await expect(page.getByRole('heading', { level: 1, name: 'Salle Voltaire' })).toBeVisible();
  await expect(page.getByText('45 € / heure').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour aux résultats' })).toHaveAttribute(
    'href',
    '/',
  );
  const equipment = page.getByRole('region', { name: 'Équipements' });
  await expect(equipment.getByRole('listitem')).toHaveText(['Écran 65"', 'Tableau blanc', 'Wi-Fi']);

  // Créneaux chargés dans le navigateur.
  await expect(slotGrid(page).getByRole('button')).toHaveCount(11);
  await expect(slotGrid(page).getByRole('button', { name: '09:00 Réservé' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('un identifiant inexistant renvoie la page introuvable (404)', async ({ page }) => {
  const response = await page.goto('/salles/inexistant');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeVisible();
});

test('un visiteur est invité à se connecter, avec retour sur la fiche et la date', async ({
  page,
}) => {
  await page.goto(ROOM_URL);
  const login = page.getByRole('link', { name: 'Se connecter pour réserver' });
  await expect(login).toBeVisible();
  const href = await login.getAttribute('href');
  const url = new URL(href ?? '', 'http://localhost');
  expect(url.pathname).toBe('/connexion');
  expect(url.searchParams.get('redirect')).toBe(ROOM_URL);
  await expect(page.getByRole('button', { name: 'Demander la réservation' })).toHaveCount(0);
});

test('un client demande une réservation : requête en UTC, redirection', async ({ page }) => {
  await signInAsClient(page);
  await page.goto(ROOM_URL);

  const submit = page.getByRole('button', { name: 'Demander la réservation' });
  await expect(submit).toHaveAttribute('aria-disabled', 'true');

  await slotGrid(page)
    .getByRole('button', { name: /^15:00/ })
    .click();
  await slotGrid(page)
    .getByRole('button', { name: /^16:00/ })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Sélection' })).toHaveText(
    'Sélection : de 15:00 à 17:00 (2 heures)',
  );
  const summary = page.getByRole('complementary', { name: 'Votre réservation' });
  await expect(summary.getByRole('definition')).toHaveText([
    'lun. 16 nov. 2026',
    '15:00 – 17:00',
    '2 h · 45 € / heure',
  ]);
  await expect(submit).toHaveAttribute('aria-disabled', 'false');

  await page.getByLabel('Nombre de participants').fill('8');
  await page.getByLabel('Commentaire (facultatif)').fill('Atelier UX');

  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/reservations'),
  );
  await submit.click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toEqual({
    roomId: ROOM_ID,
    startAt: '2026-11-16T14:00:00.000Z',
    endAt: '2026-11-16T16:00:00.000Z',
    numberOfParticipants: 8,
    comment: 'Atelier UX',
  });
  await page.waitForURL('**/reservations?created=1');
});

test('nombre de participants obligatoire et limité à la capacité', async ({ page }) => {
  await signInAsClient(page);
  await page.goto(ROOM_URL);
  await slotGrid(page)
    .getByRole('button', { name: /^18:00/ })
    .click();

  const participants = page.getByLabel('Nombre de participants');
  await page.getByRole('button', { name: 'Demander la réservation' }).click();
  await expect(page.getByText('Le nombre de participants est obligatoire.')).toBeVisible();
  await expect(participants).toBeFocused();

  await participants.fill('13');
  await page.getByRole('button', { name: 'Demander la réservation' }).click();
  await expect(
    page.getByText("Le nombre de participants doit être d'au plus 12 personnes."),
  ).toBeVisible();
});

test('409 : créneau plus disponible, la saisie est conservée', async ({ page }) => {
  await signInAsClient(page);
  await page.route('**/reservations', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'CONFLICT', message: 'Slot taken' }),
        })
      : route.fallback(),
  );
  await page.goto(ROOM_URL);
  await slotGrid(page)
    .getByRole('button', { name: /^12:00/ })
    .click();
  await page.getByLabel('Nombre de participants').fill('4');
  await page.getByRole('button', { name: 'Demander la réservation' }).click();

  await expect(page.getByRole('alert')).toContainText("Ce créneau n'est plus disponible");
  await expect(page).toHaveURL(new RegExp(`/salles/${ROOM_ID}`));
  await expect(page.getByLabel('Nombre de participants')).toHaveValue('4');
  await expect(slotGrid(page).getByRole('button', { name: /^12:00/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
