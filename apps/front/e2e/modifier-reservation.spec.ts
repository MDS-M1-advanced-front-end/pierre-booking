// Écran 07 Modifier une réservation (plan 4.5).
//
// Le mock Prism n'a pas d'exemple pour `GET /reservations/{id}` : il renvoie une réservation
// générée (2019, salle inconnue). On sert donc la vraie réservation du jeu de données (lue dans
// `GET /reservations`) avec `page.route`. Le mock est sans état : on vérifie la requête envoyée.
import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:4010';
// Léa Martin, Salle Voltaire (12 pers., 45 €/h), lundi 12 octobre 2026 de 11:00 à 14:00 (Paris),
// CONFIRMED, 8 participants, « Atelier UX », 135 €.
const RESERVATION_ID = '00000000-0000-4000-8000-300000000001';
const PAGE_URL = `/reservations/${RESERVATION_ID}/modifier`;

async function signInAsClient(page: Page) {
  const response = await page.request.get(`${API}/auth/me`, {
    headers: { Authorization: 'Bearer mock-token-client-1', Prefer: 'example=client-1' },
  });
  const user: unknown = await response.json();
  await page.addInitScript((sessionUser) => {
    localStorage.setItem(
      'quorum.session',
      JSON.stringify({
        accessToken: 'mock-token-client-1',
        user: sessionUser,
        expiresAt: Date.now() + 3_600_000,
      }),
    );
    localStorage.setItem('quorum.mockPersona', 'client-1');
  }, user);
}

/** Sert la réservation du jeu de données sur `GET /reservations/{id}`, laisse passer le reste. */
async function serveReservation(page: Page) {
  const list = await page.request.get(`${API}/reservations`, {
    headers: { Authorization: 'Bearer mock-token-client-1' },
  });
  const { items } = (await list.json()) as { items: { id: string }[] };
  const reservation = items.find((item) => item.id === RESERVATION_ID);
  expect(reservation).toBeDefined();
  await page.route(`${API}/reservations/${RESERVATION_ID}`, (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: reservation }) : route.fallback(),
  );
}

const slot = (page: Page, time: string) =>
  page
    .getByRole('group', { name: 'Créneaux du lundi 12 octobre 2026' })
    .getByRole('button', { name: new RegExp(`^${time}`) });

test.beforeEach(async ({ page }) => {
  await signInAsClient(page);
});

test('la plage actuelle est présélectionnée et la modification envoie le bon PATCH', async ({
  page,
}) => {
  await serveReservation(page);
  await page.goto(PAGE_URL);

  await expect(page).toHaveTitle('Modifier ma réservation · Quorum');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Modifier ma réservation' }),
  ).toBeVisible();
  await expect(page.getByText('Salle Voltaire · Paris 11e · 12 personnes max')).toBeVisible();
  await expect(page.getByText('Confirmée')).toBeVisible();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-12');

  // Plage d'origine 11:00 → 14:00 : 11:00 revient « indisponible » du mock mais reste sélectionnable.
  for (const time of ['11:00', '12:00', '13:00']) {
    await expect(slot(page, time)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(slot(page, '14:00')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Sélection : de 11:00 à 14:00 (3 heures)')).toBeVisible();

  const summary = page.locator('dl');
  await expect(summary).toContainText('11:00 – 14:00 · 135 €');
  await expect(summary).toContainText('3 h · 45 € / heure');
  await expect(summary).not.toContainText(/prix estimé/i);
  await expect(page.getByLabel('Nombre de participants')).toHaveValue('8');
  await expect(page.getByLabel('Commentaire (facultatif)')).toHaveValue('Atelier UX');

  // Nouvelle plage : 15:00 → 18:00.
  await slot(page, '15:00').click();
  await slot(page, '17:00').click();
  await expect(page.getByText('Sélection : de 15:00 à 18:00 (3 heures)')).toBeVisible();
  await expect(summary).toContainText('15:00 – 18:00');
  await page.getByLabel('Nombre de participants').fill('10');

  const patch = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' && request.url() === `${API}/reservations/${RESERVATION_ID}`,
  );
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  expect((await patch).postDataJSON()).toEqual({
    startAt: '2026-10-12T13:00:00.000Z',
    endAt: '2026-10-12T16:00:00.000Z',
    numberOfParticipants: 10,
    comment: 'Atelier UX',
  });
  await page.waitForURL('**/reservations?updated=1');
});

test('un 409 affiche l’alerte et conserve la saisie', async ({ page }) => {
  await serveReservation(page);
  await page.route(`${API}/reservations/${RESERVATION_ID}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 409,
          json: { code: 'CONFLICT', message: 'Slot already booked' },
        })
      : route.fallback(),
  );
  await page.goto(PAGE_URL);
  await expect(slot(page, '11:00')).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('Nombre de participants').fill('11');
  await page.getByLabel('Commentaire (facultatif)').fill('Atelier UX, avec café');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

  const alert = page.getByRole('alert').filter({ hasText: "Ce créneau n'est plus disponible" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('vos autres modifications sont conservées');
  await expect(page.getByLabel('Nombre de participants')).toHaveValue('11');
  await expect(page.getByLabel('Commentaire (facultatif)')).toHaveValue('Atelier UX, avec café');
  await expect(page).toHaveURL(new RegExp(`${PAGE_URL}$`));
});

test('une réservation passée ne peut plus être modifiée', async ({ page }) => {
  // Sans interception, le mock renvoie une réservation générée de 2019.
  await page.goto(PAGE_URL);
  await expect(page.getByText('Cette réservation ne peut plus être modifiée.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour à mes réservations' })).toHaveAttribute(
    'href',
    '/reservations',
  );
});

test('un autre jour : sélection vidée et créneaux d’origine non sélectionnables', async ({
  page,
}) => {
  await serveReservation(page);
  await page.goto(PAGE_URL);
  await expect(slot(page, '11:00')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Jour suivant' }).click();
  const grid = page.getByRole('group', { name: 'Créneaux du mardi 13 octobre 2026' });
  await expect(grid).toBeVisible();
  await expect(grid.getByRole('button', { name: /^11:00/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(page.getByText('Aucun créneau sélectionné.', { exact: false })).toBeVisible();

  await grid.getByRole('button', { name: /^15:00/ }).click();
  await grid.getByRole('button', { name: /^16:00/ }).click();
  const summary = page.locator('dl');
  await expect(summary).toContainText('lun. 12 oct. 2026, 11:00 – 14:00 · 135 €');
  await expect(summary).toContainText('mar. 13 oct. 2026, 15:00 – 17:00');

  const patch = page.waitForRequest((request) => request.method() === 'PATCH');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  expect((await patch).postDataJSON()).toMatchObject({
    startAt: '2026-10-13T13:00:00.000Z',
    endAt: '2026-10-13T15:00:00.000Z',
  });
});
