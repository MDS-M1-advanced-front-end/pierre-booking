// Passe d'accessibilité automatique (plan.md étape 6.1) : axe-core, règles WCAG 2.2 A et AA,
// sur les 11 écrans et les pages d'erreur, en desktop et en mobile. axe ne remplace pas la
// vérification manuelle (clavier, lecteur d'écran) : il détecte les défauts mesurables
// (contrastes, noms accessibles, ARIA, structure).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LEA, NADIA, signIn, VOLTAIRE_ID, waitForContent } from './helpers';

const RESERVATION_ID = '00000000-0000-4000-8000-300000000001';

const pages: { path: string; user?: typeof LEA | typeof NADIA }[] = [
  { path: '/' },
  { path: `/salles/${VOLTAIRE_ID}` },
  { path: '/connexion' },
  { path: '/inscription' },
  { path: '/acces-refuse' },
  { path: '/page-inexistante' },
  { path: '/profil', user: LEA },
  { path: '/reservations', user: LEA },
  { path: `/reservations/${RESERVATION_ID}/modifier`, user: LEA },
  { path: '/gestion/salles', user: NADIA },
  { path: '/gestion/salles/nouvelle', user: NADIA },
  { path: `/gestion/salles/${VOLTAIRE_ID}/modifier`, user: NADIA },
  { path: `/gestion/salles/${VOLTAIRE_ID}/disponibilites`, user: NADIA },
  { path: '/gestion/demandes', user: NADIA },
];

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 800 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const { path, user } of pages) {
      test(`${path}${user ? ` (${user.role})` : ''}`, async ({ page }) => {
        if (user) await signIn(page, user);
        await page.goto(path);
        await waitForContent(page);

        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        const summary = violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
        }));
        expect(summary).toEqual([]);
      });
    }
  });
}
