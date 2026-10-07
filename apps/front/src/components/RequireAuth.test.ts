import type { User } from '@room-booking/core';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from './RequireAuth.svelte';

vi.mock('../data/client', () => ({ setAccessToken: vi.fn() }));

const lea: User = {
  id: 'u-1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea.martin@example.com',
  role: 'CLIENT',
};

const replace = vi.fn();

function storeSession(user: User): void {
  localStorage.setItem(
    'quorum.session',
    JSON.stringify({ accessToken: 'jeton', user, expiresAt: Date.now() + 3600_000 }),
  );
}

const children = createRawSnippet<[User]>((user) => ({
  render: () => `<p>Bonjour ${user().firstName}</p>`,
}));

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
  // `location` de jsdom n'est pas modifiable : on le remplace le temps du test.
  vi.stubGlobal('location', { pathname: '/reservations', search: '?status=PENDING', replace });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RequireAuth', () => {
  it('affiche le contenu avec l’utilisateur connecté', async () => {
    storeSession(lea);
    render(RequireAuth, { children });

    expect(await screen.findByText('Bonjour Léa')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('envoie un visiteur vers la connexion avec la page courante', () => {
    render(RequireAuth, { children });

    expect(replace).toHaveBeenCalledWith('/connexion?redirect=%2Freservations%3Fstatus%3DPENDING');
    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(screen.queryByText(/Bonjour/)).not.toBeInTheDocument();
  });

  it('refuse un rôle non autorisé', () => {
    storeSession(lea);
    render(RequireAuth, { roles: ['GESTIONNAIRE'], children });

    expect(replace).toHaveBeenCalledWith('/acces-refuse');
    expect(screen.queryByText(/Bonjour/)).not.toBeInTheDocument();
  });
});
