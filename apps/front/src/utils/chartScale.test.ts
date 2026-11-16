import { describe, expect, it } from 'vitest';
import { labelIndices, niceCeil } from './chartScale';

describe('niceCeil', () => {
  it.each([
    [0, 0],
    [-5, 0],
    [1, 1],
    [7, 10],
    [12, 20],
    [45, 50],
    [180, 200],
    [1250, 2000],
    [5000, 5000],
    [0.3, 0.5],
  ])('%d → %d', (max, top) => {
    expect(niceCeil(max)).toBe(top);
  });
});

describe('labelIndices', () => {
  it('garde tout quand il y a de la place', () => {
    expect([...labelIndices(4, 8)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('espace les étiquettes et garde la dernière', () => {
    const indices = labelIndices(30, 6);
    expect(indices.size).toBeLessThanOrEqual(6);
    expect(indices.has(29)).toBe(true);
  });

  it('ne renvoie rien sans point', () => {
    expect(labelIndices(0, 6).size).toBe(0);
  });
});
