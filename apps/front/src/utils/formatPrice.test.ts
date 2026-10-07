import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

// Intl sépare le montant et le symbole par une espace insécable fine (U+202F)
const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('formatPrice', () => {
  it('affiche un montant rond sans centimes', () => {
    expect(normalize(formatPrice(45))).toBe('45 €');
  });

  it('affiche toujours deux décimales sinon', () => {
    expect(normalize(formatPrice(35.5))).toBe('35,50 €');
  });

  it('sépare les milliers', () => {
    expect(normalize(formatPrice(1200))).toBe('1 200 €');
  });
});
