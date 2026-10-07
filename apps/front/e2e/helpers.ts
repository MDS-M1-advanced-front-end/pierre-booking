// Aides partagées des tests de bout en bout : profils du jeu de données du mock et session.
import type { Page } from '@playwright/test';

export const LEA = {
  id: '00000000-0000-4000-8000-200000000001',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT',
  createdAt: '2026-02-11T09:00:00Z',
} as const;

export const NADIA = {
  id: '00000000-0000-4000-8000-200000000004',
  firstName: 'Nadia',
  lastName: 'Benali',
  email: 'gestionnaire1@salles.example',
  role: 'GESTIONNAIRE',
  createdAt: '2026-05-11T09:00:00Z',
} as const;

export const VOLTAIRE_ID = '00000000-0000-4000-8000-100000000001';

/** Écrit la session (et le profil du mock) dans le `localStorage` avant le chargement de la page. */
export async function signIn(page: Page, user: typeof LEA | typeof NADIA): Promise<void> {
  const persona = user.role === 'CLIENT' ? 'client-1' : 'gestionnaire-1';
  await page.addInitScript(
    ({ user, persona }) => {
      localStorage.setItem(
        'quorum.session',
        JSON.stringify({
          accessToken: `mock-token-${persona}`,
          user,
          expiresAt: Date.now() + 3600_000,
        }),
      );
      localStorage.setItem('quorum.mockPersona', persona);
    },
    { user, persona },
  );
}

/** Attend la fin des chargements : réseau au repos et plus aucune zone `aria-busy`. */
export async function waitForContent(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
}
