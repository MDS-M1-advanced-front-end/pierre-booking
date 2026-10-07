import type { User } from '@room-booking/core';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from '../data/auth/auth.queries';
import SiteHeader from './SiteHeader.svelte';

vi.mock('../data/client', () => ({ setAccessToken: vi.fn() }));
vi.mock('../data/auth/auth.queries', () => ({ logout: vi.fn() }));

const lea: User = {
  id: 'u-1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea.martin@example.com',
  role: 'CLIENT',
};

const nadia: User = {
  id: 'u-2',
  firstName: 'Nadia',
  lastName: 'Benali',
  email: 'gestionnaire1@salles.example',
  role: 'GESTIONNAIRE',
};

function storeSession(user: User): void {
  localStorage.setItem(
    'quorum.session',
    JSON.stringify({ accessToken: 'jeton', user, expiresAt: Date.now() + 3600_000 }),
  );
}

/** Navigation de bureau (la navigation mobile en est une copie). */
function desktopNav(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Navigation principale' });
}

function linkTexts(nav: HTMLElement): string[] {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent.replace(/\s+/g, ' ').trim());
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(logout).mockClear();
});

describe('SiteHeader', () => {
  it('a un lien vers le catalogue sur la marque', () => {
    render(SiteHeader, { currentPath: '/' });
    expect(screen.getByRole('link', { name: 'Quorum' })).toHaveAttribute('href', '/');
  });

  it('affiche la navigation du visiteur', () => {
    render(SiteHeader, { currentPath: '/' });
    const nav = desktopNav();

    expect(linkTexts(nav)).toEqual(['Catalogue', 'Se connecter', 'Créer un compte']);
    expect(within(nav).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion',
    );
    expect(within(nav).getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/inscription',
    );
    expect(within(nav).queryByRole('button', { name: /déconnecter/ })).not.toBeInTheDocument();
  });

  it('affiche la navigation du client', async () => {
    storeSession(lea);
    render(SiteHeader, { currentPath: '/reservations' });
    const nav = desktopNav();

    expect(await within(nav).findByRole('link', { name: 'Léa Martin' })).toHaveAttribute(
      'href',
      '/profil',
    );
    expect(linkTexts(nav)).toEqual(['Catalogue', 'Mes réservations', 'LM Léa Martin']);
    expect(within(nav).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });

  it('affiche la navigation du gestionnaire', async () => {
    storeSession(nadia);
    render(SiteHeader, { currentPath: '/gestion/salles' });
    const nav = desktopNav();

    await within(nav).findByRole('link', { name: 'Nadia Benali' });
    expect(linkTexts(nav)).toEqual(['Catalogue', 'Mes salles', 'Demandes', 'NB Nadia Benali']);
    expect(within(nav).getByRole('link', { name: 'Mes salles' })).toHaveAttribute(
      'href',
      '/gestion/salles',
    );
    expect(within(nav).getByRole('link', { name: 'Demandes' })).toHaveAttribute(
      'href',
      '/gestion/demandes',
    );
  });

  it('annonce le nombre de demandes en attente', async () => {
    storeSession(nadia);
    render(SiteHeader, { currentPath: '/', pendingCount: 3 });
    expect(
      await within(desktopNav()).findByRole('link', { name: 'Demandes (3 en attente)' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['/', 'Catalogue'],
    ['/salles/42', 'Catalogue'],
    ['/reservations', 'Mes réservations'],
    ['/reservations/7/modifier', 'Mes réservations'],
    ['/profil', 'Léa Martin'],
  ])('marque la page courante pour %s', async (currentPath, label) => {
    storeSession(lea);
    render(SiteHeader, { currentPath });
    const nav = desktopNav();
    await within(nav).findByRole('link', { name: 'Léa Martin' });

    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(label);
  });

  it('déconnecte puis revient au catalogue', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    storeSession(lea);
    render(SiteHeader, { currentPath: '/reservations' });

    await fireEvent.click(
      await within(desktopNav()).findByRole('button', { name: 'Se déconnecter' }),
    );

    expect(logout).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('propose un menu mobile dans un <details>', () => {
    render(SiteHeader, { currentPath: '/' });
    const mobile = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(mobile.closest('details')).not.toBeNull();
    expect(linkTexts(mobile)).toEqual(['Catalogue', 'Se connecter', 'Créer un compte']);
  });
});
