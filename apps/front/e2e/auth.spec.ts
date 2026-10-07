// Parcours d'authentification : connexion (03), inscription (04), profil (05).
// Le mock Prism est sans état : on vérifie les requêtes envoyées et l'affichage des réponses.
// Les cas d'erreur que le mock ne sait pas produire (401 à la connexion, 409 à l'inscription,
// 400 au changement de mot de passe) sont simulés en interceptant la requête (`page.route`).
import { expect, test, type Page } from '@playwright/test';

const CLIENT = {
  id: '00000000-0000-4000-8000-200000000001',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT',
  createdAt: '2026-02-11T09:00:00Z',
} as const;

/** Ouvre une session directement dans le localStorage (sans passer par la connexion). */
async function signIn(page: Page, user: object = CLIENT, persona = 'client-1'): Promise<void> {
  await page.addInitScript(
    ([storedUser, storedPersona]) => {
      localStorage.setItem(
        'quorum.session',
        JSON.stringify({
          accessToken: `mock-token-${storedPersona}`,
          user: storedUser,
          expiresAt: Date.now() + 3600_000,
        }),
      );
      localStorage.setItem('quorum.mockPersona', storedPersona);
    },
    [user, persona] as const,
  );
}

async function storedSession(page: Page): Promise<{ accessToken: string; user: { role: string } }> {
  const raw = await page.evaluate(() => localStorage.getItem('quorum.session'));
  expect(raw).not.toBeNull();
  return JSON.parse(raw ?? '{}') as { accessToken: string; user: { role: string } };
}

async function fillLogin(page: Page, email: string, password = 'motdepasse'): Promise<void> {
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test.describe('03 Connexion', () => {
  test('un client arrive sur ses réservations, session enregistrée', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page).toHaveTitle('Connexion · Quorum');
    await expect(page.getByRole('link', { name: /mot de passe oublié/i })).toHaveCount(0);

    // Corps non vérifié : en dev, `mockPersona` reconstruit la requête de connexion (corps en flux),
    // que Playwright ne sait pas relire (`postData()` vaut `null`).
    await fillLogin(page, 'client1@salles.example');
    await page.waitForURL('**/reservations');
    const session = await storedSession(page);
    expect(session.accessToken).toBe('mock-token-client-1');
    expect(session.user.role).toBe('CLIENT');
  });

  test('un gestionnaire arrive sur ses salles', async ({ page }) => {
    await page.goto('/connexion');
    await fillLogin(page, 'gestionnaire1@salles.example');
    await page.waitForURL('**/gestion/salles');
    expect((await storedSession(page)).user.role).toBe('GESTIONNAIRE');
  });

  test('le paramètre redirect est respecté et transmis à l’inscription', async ({ page }) => {
    await page.goto('/connexion?redirect=%2Fprofil');
    await expect(page.getByRole('link', { name: 'Créer un compte' }).last()).toHaveAttribute(
      'href',
      '/inscription?redirect=%2Fprofil',
    );
    await fillLogin(page, 'client1@salles.example');
    await page.waitForURL('**/profil');
  });

  test('une redirection vers un autre site est ignorée', async ({ page }) => {
    await page.goto('/connexion?redirect=%2F%2Fevil.com');
    await fillLogin(page, 'client1@salles.example');
    await page.waitForURL('http://localhost:4321/reservations');
  });

  test('401 : message générique, pas de session', async ({ page }) => {
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Invalid credentials' }),
      }),
    );
    await page.goto('/connexion');
    await fillLogin(page, 'client1@salles.example', 'mauvaismdp');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Connexion impossible');
    await expect(alert).toContainText('Adresse e-mail ou mot de passe incorrect.');
    await expect(page).toHaveURL(/\/connexion$/);
    expect(await page.evaluate(() => localStorage.getItem('quorum.session'))).toBeNull();
  });

  test('champs vides : messages sous les champs, sans envoi', async ({ page }) => {
    let sent = false;
    page.on('request', (r) => {
      if (r.url().endsWith('/auth/login')) sent = true;
    });
    await page.goto('/connexion');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText("L'adresse e-mail est obligatoire.")).toBeVisible();
    await expect(page.getByText('Le mot de passe est obligatoire.')).toBeVisible();
    await expect(page.getByLabel('Adresse e-mail')).toBeFocused();
    expect(sent).toBe(false);
  });

  test('un utilisateur déjà connecté est redirigé', async ({ page }) => {
    await signIn(page);
    await page.goto('/connexion?redirect=%2Fprofil');
    await page.waitForURL('**/profil');
  });
});

test.describe('04 Inscription', () => {
  test('erreurs : récapitulatif focalisé, liens vers les champs, correction à la sortie', async ({
    page,
  }) => {
    await page.goto('/inscription');
    await expect(page).toHaveTitle('Créer un compte · Quorum');
    await page.getByLabel('Prénom').fill('Léa');
    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Martin');
    await page.getByLabel('Adresse e-mail').fill('lea.martin@');
    await page.getByLabel('Mot de passe').fill('abc123');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    const summary = page.getByRole('alert');
    await expect(summary).toContainText('2 erreurs empêchent la création du compte');
    // Le focus est sur le conteneur focalisable (tabindex="-1") du récapitulatif.
    await expect(page.locator('[tabindex="-1"]:has([role="alert"])')).toBeFocused();
    await expect(summary.getByRole('link')).toHaveText([
      'Adresse e-mail : format invalide',
      'Mot de passe : 8 caractères minimum',
    ]);

    // Messages sous les champs, reliés par aria-describedby.
    const password = page.getByLabel('Mot de passe');
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription(
      '8 caractères minimum Le mot de passe contient 6 caractères, il en faut au moins 8.',
    );
    await expect(page.getByLabel('Adresse e-mail')).toHaveAccessibleDescription(
      'Saisissez une adresse e-mail valide, par exemple nom@domaine.fr',
    );

    // Un lien du récapitulatif mène au champ.
    await summary.getByRole('link', { name: /Mot de passe/ }).click();
    await expect(password).toBeFocused();

    // Correction à la sortie du champ : l'erreur disparaît, le récapitulatif suit.
    await password.fill('motdepasse');
    await password.blur();
    await expect(password).not.toHaveAttribute('aria-invalid');
    await expect(summary).toContainText('1 erreur empêche la création du compte');
  });

  test('succès : compte créé, connexion automatique, retour au catalogue', async ({ page }) => {
    await page.goto('/inscription');
    const register = page.waitForRequest(
      (r) => r.url().endsWith('/auth/register') && r.method() === 'POST',
    );
    await page.getByLabel('Prénom').fill(' Léa ');
    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Martin');
    await page.getByLabel('Adresse e-mail').fill('lea.martin@example.com');
    await page.getByLabel('Mot de passe').fill('motdepasse');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    expect((await register).postDataJSON()).toEqual({
      firstName: 'Léa',
      lastName: 'Martin',
      email: 'lea.martin@example.com',
      password: 'motdepasse',
    });
    await page.waitForURL('http://localhost:4321/');
    expect((await storedSession(page)).accessToken).toBeTruthy();
  });

  test('409 : e-mail déjà utilisé', async ({ page }) => {
    await page.route('**/auth/register', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'CONFLICT', message: 'Email already used' }),
      }),
    );
    await page.goto('/inscription');
    await page.getByLabel('Prénom').fill('Léa');
    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Martin');
    await page.getByLabel('Adresse e-mail').fill('client1@salles.example');
    await page.getByLabel('Mot de passe').fill('motdepasse');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Un compte existe déjà avec cette adresse e-mail.',
    );
    await expect(page).toHaveURL(/\/inscription$/);
  });
});

test.describe('05 Profil', () => {
  test('un visiteur est renvoyé vers la connexion', async ({ page }) => {
    await page.goto('/profil');
    await page.waitForURL('**/connexion?redirect=%2Fprofil');
  });

  test('client : bloc « Mon compte » et modification sans le champ role', async ({ page }) => {
    await signIn(page);
    await page.goto('/profil');
    await expect(page).toHaveTitle('Mon profil · Quorum');

    const account = page.getByRole('complementary', { name: 'Mon compte' });
    await expect(account).toContainText('Client');
    await expect(account).toContainText('11 février 2026');
    await expect(account.getByRole('link', { name: 'Voir mes réservations' })).toHaveAttribute(
      'href',
      '/reservations',
    );

    const firstName = page.getByLabel('Prénom');
    await expect(firstName).toHaveValue('Léa');
    await firstName.fill('Léonie');

    const request = page.waitForRequest(
      (r) => r.url().endsWith(`/users/${CLIENT.id}`) && r.method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    const body = (await request).postDataJSON() as Record<string, unknown>;
    expect(body).toEqual({
      firstName: 'Léonie',
      lastName: 'Martin',
      email: 'client1@salles.example',
    });
    expect(body).not.toHaveProperty('role');
    await expect(page.getByRole('status').filter({ hasText: 'enregistrées' })).toHaveText(
      'Vos informations ont été enregistrées.',
    );
  });

  test('gestionnaire : lien vers ses salles', async ({ page }) => {
    await signIn(
      page,
      {
        id: '00000000-0000-4000-8000-200000000004',
        firstName: 'Nadia',
        lastName: 'Benali',
        email: 'gestionnaire1@salles.example',
        role: 'GESTIONNAIRE',
      },
      'gestionnaire-1',
    );
    await page.goto('/profil');
    const account = page.getByRole('complementary', { name: 'Mon compte' });
    await expect(account).toContainText('Gestionnaire');
    await expect(account.getByRole('link', { name: 'Voir mes salles' })).toHaveAttribute(
      'href',
      '/gestion/salles',
    );
  });

  test('changement de mot de passe : confirmation vérifiée, corps envoyé, champs vidés', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/profil');
    const current = page.getByLabel('Mot de passe actuel');
    const next = page.getByLabel('Nouveau mot de passe', { exact: true });
    const confirm = page.getByLabel('Confirmer le nouveau mot de passe');

    await current.fill('motdepasse');
    await next.fill('nouveaumdp');
    await confirm.fill('autrechose');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    await expect(confirm).toHaveAccessibleDescription(
      'Les deux mots de passe ne sont pas identiques.',
    );
    await expect(confirm).toBeFocused();

    await confirm.fill('nouveaumdp');
    const request = page.waitForRequest(
      (r) => r.url().endsWith('/auth/password') && r.method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    expect((await request).postDataJSON()).toEqual({
      currentPassword: 'motdepasse',
      newPassword: 'nouveaumdp',
    });
    await expect(page.getByRole('status').filter({ hasText: 'mot de passe' })).toHaveText(
      'Votre mot de passe a été modifié.',
    );
    await expect(current).toHaveValue('');
    await expect(next).toHaveValue('');
    await expect(confirm).toHaveValue('');
  });

  test('changement de mot de passe : 400 → mot de passe actuel incorrect', async ({ page }) => {
    await page.route('**/auth/password', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ code: 'BAD_REQUEST', message: 'Wrong password' }),
          })
        : route.continue(),
    );
    await signIn(page);
    await page.goto('/profil');
    const current = page.getByLabel('Mot de passe actuel');
    await current.fill('mauvaismdp');
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('nouveaumdp');
    await page.getByLabel('Confirmer le nouveau mot de passe').fill('nouveaumdp');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    await expect(current).toHaveAccessibleDescription('Le mot de passe actuel est incorrect.');
    await expect(current).toBeFocused();
  });
});
