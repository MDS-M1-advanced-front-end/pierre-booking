// Parcours gestionnaire : disponibilités (écran 10), demandes (écran 11) et compteur de l'en-tête.
// Le mock Prism est sans état : on vérifie les requêtes envoyées et l'affichage des réponses.
import { expect, test, type Page } from '@playwright/test';

const VOLTAIRE = '00000000-0000-4000-8000-100000000001'; // salle de Nadia Benali
const FOURVIERE = '00000000-0000-4000-8000-100000000006'; // salle d'un autre gestionnaire
const AUDITORIUM_REQUEST = '00000000-0000-4000-8000-300000000002'; // demande PENDING

const nadia = {
  id: '00000000-0000-4000-8000-200000000004',
  firstName: 'Nadia',
  lastName: 'Benali',
  email: 'gestionnaire1@salles.example',
  role: 'GESTIONNAIRE',
  createdAt: '2026-05-11T09:00:00Z',
};

/** Session du gestionnaire `gestionnaire-1`, écrite avant le chargement de chaque page. */
async function signInAsManager(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem(
      'quorum.session',
      JSON.stringify({
        accessToken: 'mock-token-gestionnaire-1',
        user,
        expiresAt: Date.now() + 3600_000,
      }),
    );
    localStorage.setItem('quorum.mockPersona', 'gestionnaire-1');
  }, nadia);
}

const hour = (h: number) => `${String(h).padStart(2, '0')}:00:00`;
const slots = (from: number, to: number, available: boolean) =>
  Array.from({ length: to - from }, (_, i) => ({
    startTime: hour(from + i),
    endTime: hour(from + i + 1),
    available,
  }));

test.beforeEach(async ({ page }) => {
  await signInAsManager(page);
});

test.describe('Disponibilités', () => {
  const url = `/gestion/salles/${VOLTAIRE}/disponibilites?date=2026-11-16`;

  test('charge la journée en plages éditables', async ({ page }) => {
    await page.goto(url);

    await expect(page).toHaveTitle('Disponibilités · Quorum');
    await expect(page.getByRole('heading', { level: 1, name: 'Disponibilités' })).toBeVisible();
    await expect(page.getByText('Salle Voltaire · Paris 11e')).toBeVisible();
    await expect(page.getByLabel('Journée')).toHaveValue('2026-11-16');
    const list = page.getByRole('group', { name: 'Créneaux du lundi 16 novembre 2026' });
    await expect(list.getByLabel('Début')).toHaveCount(5);
    await expect(list.getByLabel('Début').nth(1)).toHaveValue('09:00');
    await expect(list.getByLabel('Fin').nth(1)).toHaveValue('12:00');
    await expect(list.getByRole('checkbox', { name: 'Réservable' }).nth(1)).not.toBeChecked();
    await expect(
      list.getByRole('button', { name: 'Supprimer le créneau de 08:00 à 09:00' }),
    ).toBeVisible();
    await expect(
      page.getByText("L'enregistrement remplace tous les créneaux de cette journée."),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vue client' })).toBeVisible();
  });

  test("signale une plage qui chevauche, puis enregistre des créneaux d'une heure", async ({
    page,
  }) => {
    await page.goto(url);
    const list = page.getByRole('group', { name: 'Créneaux du lundi 16 novembre 2026' });
    await expect(list.getByLabel('Début')).toHaveCount(5);

    // Nouvelle plage 10:00–11:00 : chevauche 09:00–12:00 (deuxième ligne).
    await page.getByRole('button', { name: 'Ajouter un créneau' }).click();
    const newStart = list.getByLabel('Début').nth(5);
    const newEnd = list.getByLabel('Fin').nth(5);
    await expect(newStart).toBeFocused();
    await expect(newStart).toHaveValue('19:00');
    await newStart.fill('10:00');
    await newEnd.fill('11:00');
    await page.getByRole('button', { name: 'Enregistrer la journée' }).click();

    const message = 'Les créneaux de 09:00 à 12:00 et de 10:00 à 11:00 se chevauchent.';
    await expect(list.getByText(message)).toBeVisible();
    await expect(newStart).toBeFocused();
    await expect(newStart).toHaveAttribute('aria-invalid', 'true');
    await expect(newStart).toHaveAccessibleDescription(message);
    await expect(list.getByLabel('Début').nth(1)).not.toHaveAttribute('aria-invalid');

    // Correction : 19:00–21:00 non réservable.
    await newStart.fill('19:00');
    await newEnd.fill('21:00');
    await list.getByRole('checkbox', { name: 'Réservable' }).nth(5).uncheck();
    await expect(list.getByText(message)).toBeHidden();

    const request = page.waitForRequest(
      (req) => req.method() === 'PUT' && req.url().endsWith(`/rooms/${VOLTAIRE}/availability`),
    );
    await page.getByRole('button', { name: 'Enregistrer la journée' }).click();
    expect((await request).postDataJSON()).toEqual({
      date: '2026-11-16',
      slots: [
        ...slots(8, 9, true),
        ...slots(9, 12, false),
        ...slots(12, 14, true),
        ...slots(14, 15, false),
        ...slots(15, 19, true),
        ...slots(19, 21, false),
      ],
    });
    await expect(page.getByRole('status')).toContainText(
      'Les créneaux du lundi 16 novembre 2026 ont été enregistrés.',
    );
  });

  test("renvoie vers « Accès refusé » pour la salle d'un autre gestionnaire", async ({ page }) => {
    // Prism renvoie la même salle (Voltaire) pour tout identifiant : on sert la vraie.
    await page.route(`http://localhost:4010/rooms/${FOURVIERE}`, (route) =>
      route.fulfill({
        json: {
          id: FOURVIERE,
          name: 'Espace Fourvière',
          description: 'Salle de réception.',
          capacity: 60,
          location: 'Lyon 5e',
          equipment: [],
          pricePerHour: 90,
          status: 'ACTIVE',
          ownerId: '00000000-0000-4000-8000-200000000005',
        },
      }),
    );
    await page.goto(`/gestion/salles/${FOURVIERE}/disponibilites`);
    await expect(page).toHaveURL(/\/acces-refuse$/);
  });
});

test.describe('Demandes', () => {
  test('affiche les demandes en attente et traitées des salles du gestionnaire', async ({
    page,
  }) => {
    await page.goto('/gestion/demandes');

    await expect(page).toHaveTitle('Demandes de réservation · Quorum');
    const pending = page.getByRole('region', { name: /En attente/ });
    await expect(pending.getByRole('heading', { level: 2 })).toHaveText('En attente 1');
    await expect(pending.getByRole('heading', { name: 'Auditorium Bastille' })).toBeVisible();
    await expect(pending.getByText('Demande de')).toBeVisible();
    const handled = page.getByRole('region', { name: 'Traitées récemment' });
    await expect(handled.getByRole('listitem')).toHaveCount(3);
  });

  test('confirme une demande', async ({ page }) => {
    await page.goto('/gestion/demandes');
    const pending = page.getByRole('region', { name: /En attente/ });

    const request = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        req.url().endsWith(`/reservations/${AUDITORIUM_REQUEST}/confirm`),
    );
    await pending.getByRole('button', { name: 'Confirmer' }).click();
    await request;

    await expect(page.getByRole('status')).toHaveText(
      /Réservation de .+ confirmée \(Auditorium Bastille, 20 octobre\)\.$/,
    );
    await expect(page.getByText('Aucune demande en attente')).toBeVisible();
    const handled = page.getByRole('region', { name: 'Traitées récemment' });
    await expect(handled.getByRole('listitem').first()).toContainText('Auditorium Bastille');
    await expect(handled.getByRole('listitem').first()).toContainText('Confirmée');
  });

  test('refuse une demande avec un motif', async ({ page }) => {
    await page.goto('/gestion/demandes');
    await page
      .getByRole('region', { name: /En attente/ })
      .getByRole('button', { name: 'Refuser' })
      .click();

    const dialog = page.getByRole('dialog', { name: 'Refuser la demande ?' });
    await expect(dialog).toContainText(
      'Auditorium Bastille, mardi 20 octobre 2026, de 16:00 à 20:00, pour',
    );
    await dialog.getByLabel('Motif (facultatif)').fill('Salle en travaux ce jour-là.');

    const request = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && req.url().endsWith(`/reservations/${AUDITORIUM_REQUEST}/reject`),
    );
    await dialog.getByRole('button', { name: 'Refuser la demande' }).click();
    expect((await request).postDataJSON()).toEqual({ reason: 'Salle en travaux ce jour-là.' });

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status')).toHaveText(
      /Demande de .+ refusée \(Auditorium Bastille, 20 octobre\)\.$/,
    );
  });

  test("affiche le compteur de demandes dans l'en-tête", async ({ page }) => {
    await page.goto('/gestion/salles');
    await expect(
      page
        .getByRole('navigation', { name: 'Navigation principale' })
        .getByRole('link', { name: /^Demandes \(\d+ en attente\)$/ }),
    ).toBeVisible();
  });
});
