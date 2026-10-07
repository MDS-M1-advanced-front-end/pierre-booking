import type { User } from '@room-booking/core';
import { describe, expect, it } from 'vitest';
import {
  buildLoginUrl,
  decideAccess,
  homePathForRole,
  resolveRedirect,
  safeRedirectPath,
} from './redirect';

const client: User = {
  id: '1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@example.com',
  role: 'CLIENT',
};

describe('buildLoginUrl', () => {
  it('encode le chemin et la recherche', () => {
    expect(buildLoginUrl('/reservations')).toBe('/connexion?redirect=%2Freservations');
    expect(buildLoginUrl('/reservations?status=PENDING&x=1')).toBe(
      '/connexion?redirect=%2Freservations%3Fstatus%3DPENDING%26x%3D1',
    );
  });
});

describe('safeRedirectPath', () => {
  it('accepte un chemin interne', () => {
    expect(safeRedirectPath('/salles/42')).toBe('/salles/42');
    expect(safeRedirectPath('/reservations?status=PENDING#haut')).toBe(
      '/reservations?status=PENDING#haut',
    );
  });

  it.each([
    null,
    undefined,
    '',
    'reservations',
    '//evil.com',
    '//evil.com/reservations',
    '/\\evil.com',
    'https://evil.com',
    'http://localhost:4321/profil',
    'javascript:alert(1)',
    '/\t/evil.com',
    ' /reservations',
  ])('refuse %j', (target) => {
    expect(safeRedirectPath(target)).toBeNull();
  });
});

describe('homePathForRole', () => {
  it('envoie un client vers ses réservations, un gestionnaire vers ses salles', () => {
    expect(homePathForRole('CLIENT')).toBe('/reservations');
    expect(homePathForRole('GESTIONNAIRE')).toBe('/gestion/salles');
  });
});

describe('resolveRedirect', () => {
  it('garde une cible interne', () => {
    expect(resolveRedirect('/salles/3', 'CLIENT')).toBe('/salles/3');
  });

  it("revient à la page d'accueil du rôle si la cible est absente ou dangereuse", () => {
    expect(resolveRedirect(null, 'CLIENT')).toBe('/reservations');
    expect(resolveRedirect('//evil.com', 'GESTIONNAIRE')).toBe('/gestion/salles');
  });
});

describe('decideAccess', () => {
  it('envoie un visiteur vers la connexion avec la page courante', () => {
    expect(decideAccess(null, undefined, '/reservations')).toEqual({
      type: 'login',
      url: '/connexion?redirect=%2Freservations',
    });
  });

  it('refuse un rôle non autorisé', () => {
    expect(decideAccess(client, ['GESTIONNAIRE'], '/gestion/salles')).toEqual({
      type: 'forbidden',
      url: '/acces-refuse',
    });
  });

  it('laisse passer un utilisateur autorisé, ou tout connecté sans liste de rôles', () => {
    expect(decideAccess(client, ['CLIENT'], '/reservations')).toEqual({
      type: 'allow',
      user: client,
    });
    expect(decideAccess(client, [], '/profil')).toEqual({ type: 'allow', user: client });
    expect(decideAccess(client, undefined, '/profil')).toEqual({ type: 'allow', user: client });
  });
});
