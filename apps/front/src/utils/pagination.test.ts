import { describe, expect, it } from 'vitest';
import { paginate } from './pagination';

describe('paginate', () => {
  it('première page du catalogue (6 salles par page, 11 au total)', () => {
    expect(paginate({ page: 1, pageSize: 6, total: 11 })).toEqual({
      page: 1,
      pageCount: 2,
      previous: null,
      next: 2,
      firstItem: 1,
      lastItem: 6,
      items: [1, 2],
    });
  });

  it('dernière page incomplète', () => {
    const result = paginate({ page: 2, pageSize: 6, total: 11 });
    expect(result).toMatchObject({ previous: 1, next: null, firstItem: 7, lastItem: 11 });
  });

  it('une seule page', () => {
    expect(paginate({ page: 1, pageSize: 6, total: 4 })).toMatchObject({
      pageCount: 1,
      previous: null,
      next: null,
      items: [1],
    });
  });

  it('aucun élément : une page vide', () => {
    expect(paginate({ page: 1, pageSize: 6, total: 0 })).toMatchObject({
      page: 1,
      pageCount: 1,
      firstItem: 0,
      lastItem: 0,
      items: [1],
    });
  });

  it('ramène une page hors limites entre 1 et la dernière', () => {
    expect(paginate({ page: 9, pageSize: 6, total: 11 }).page).toBe(2);
    expect(paginate({ page: 0, pageSize: 6, total: 11 }).page).toBe(1);
    expect(paginate({ page: -3, pageSize: 6, total: 11 }).page).toBe(1);
    expect(paginate({ page: Number.NaN, pageSize: 6, total: 11 }).page).toBe(1);
  });

  it('résiste à une taille de page nulle', () => {
    expect(paginate({ page: 1, pageSize: 0, total: 3 }).pageCount).toBe(3);
  });

  it('affiche toutes les pages quand il y en a peu', () => {
    expect(paginate({ page: 3, pageSize: 1, total: 5 }).items).toEqual([1, 2, 3, 4, 5]);
  });

  it('masque les pages éloignées par des « … »', () => {
    expect(paginate({ page: 10, pageSize: 1, total: 20 }).items).toEqual([
      1,
      'gap',
      9,
      10,
      11,
      'gap',
      20,
    ]);
    expect(paginate({ page: 1, pageSize: 1, total: 20 }).items).toEqual([1, 2, 'gap', 20]);
    expect(paginate({ page: 20, pageSize: 1, total: 20 }).items).toEqual([1, 'gap', 19, 20]);
  });

  it('remplace un trou d’une seule page par la page elle-même', () => {
    // 1 … 3 n'aurait pas de sens : on affiche 1 2 3 4 … 10
    expect(paginate({ page: 3, pageSize: 1, total: 10 }).items).toEqual([1, 2, 3, 4, 'gap', 10]);
  });

  it('accepte une fenêtre plus large', () => {
    expect(paginate({ page: 10, pageSize: 1, total: 20, siblings: 2 }).items).toEqual([
      1,
      'gap',
      8,
      9,
      10,
      11,
      12,
      'gap',
      20,
    ]);
  });
});
