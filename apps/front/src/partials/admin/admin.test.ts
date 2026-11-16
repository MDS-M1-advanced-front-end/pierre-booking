import { describe, expect, it } from 'vitest';
import {
  bucketLabels,
  fillTimeline,
  listHref,
  parseId,
  parsePage,
  parsePeriod,
  parseRole,
  parseStatus,
  periodRange,
} from './admin';

describe('paramètres d’adresse', () => {
  it('ignore un rôle ou un statut inconnu', () => {
    expect(parseRole('GESTIONNAIRE')).toBe('GESTIONNAIRE');
    expect(parseRole('ROOT')).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseStatus('PENDING')).toBe('PENDING');
    expect(parseStatus('toString')).toBeNull();
  });

  it.each([
    ['3', 3],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['abc', 1],
    [null, 1],
  ])('page %s → %i', (value, page) => {
    expect(parsePage(value)).toBe(page);
  });

  it('n’accepte qu’un UUID comme identifiant', () => {
    expect(parseId('00000000-0000-4000-8000-200000000001')).toBe(
      '00000000-0000-4000-8000-200000000001',
    );
    expect(parseId('abc')).toBeNull();
  });

  it('construit l’adresse sans valeur vide ni page 1', () => {
    expect(listHref('/admin/reservations', { statut: 'PENDING', page: 1, utilisateur: null })).toBe(
      '/admin/reservations?statut=PENDING',
    );
    expect(listHref('/admin/utilisateurs', { role: '', page: 3 })).toBe(
      '/admin/utilisateurs?page=3',
    );
    expect(listHref('/admin/utilisateurs', {})).toBe('/admin/utilisateurs');
  });
});

describe('périodes du tableau de bord', () => {
  const now = new Date('2026-11-16T10:00:00Z');

  it('prend 12 semaines par défaut', () => {
    expect(parsePeriod(null)).toBe('12s');
    expect(parsePeriod('30j')).toBe('30j');
  });

  it('se termine aujourd’hui (heure de Paris), bornes incluses', () => {
    expect(periodRange('30j', now)).toEqual({ from: '2026-10-18', to: '2026-11-16' });
    expect(periodRange('12s', now)).toEqual({ from: '2026-08-25', to: '2026-11-16' });
  });

  it('suit le jour de Paris juste après minuit', () => {
    expect(periodRange('30j', new Date('2026-11-15T23:30:00Z'))?.to).toBe('2026-11-16');
  });

  it('n’a pas de borne depuis le début', () => {
    expect(periodRange('tout', now)).toBeNull();
  });
});

describe('fillTimeline', () => {
  const empty = (date: string) => ({ date, revenue: 0 });

  it('ajoute les jours sans réservation sur la période', () => {
    const points = [{ date: '2026-11-03', revenue: 90 }];
    expect(
      fillTimeline(points, 'DAY', { from: '2026-11-01', to: '2026-11-04' }, empty).map(
        (p) => `${p.date}:${p.revenue}`,
      ),
    ).toEqual(['2026-11-01:0', '2026-11-02:0', '2026-11-03:90', '2026-11-04:0']);
  });

  it('part du lundi de la semaine du début', () => {
    const filled = fillTimeline([], 'WEEK', { from: '2026-11-04', to: '2026-11-16' }, empty);
    expect(filled.map((p) => p.date)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  });

  it('passe d’une année à l’autre par mois', () => {
    const filled = fillTimeline([], 'MONTH', { from: '2025-11-20', to: '2026-02-03' }, empty);
    expect(filled.map((p) => p.date)).toEqual([
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
    ]);
  });

  it('sans période, va du premier au dernier point', () => {
    const points = [
      { date: '2026-03-01', revenue: 5 },
      { date: '2026-01-01', revenue: 10 },
    ];
    expect(fillTimeline(points, 'MONTH', null, empty).map((p) => p.revenue)).toEqual([10, 0, 5]);
    expect(fillTimeline([], 'MONTH', null, empty)).toEqual([]);
  });
});

describe('bucketLabels', () => {
  it('nomme le jour, la semaine et le mois', () => {
    expect(bucketLabels('2026-11-09', 'DAY')).toEqual({ label: '9 nov.', detail: '9 nov.' });
    expect(bucketLabels('2026-11-09', 'WEEK')).toEqual({
      label: '9 nov.',
      detail: 'Semaine du 9 nov.',
    });
    expect(bucketLabels('2026-11-01', 'MONTH')).toEqual({
      label: 'nov. 26',
      detail: 'novembre 2026',
    });
  });
});
