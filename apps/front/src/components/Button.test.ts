import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Button from './Button.svelte';

// Une seule couleur de bordure par bouton : deux utilitaires `border-*` concurrents seraient
// départagés par l'ordre de la feuille générée par Tailwind (défaut constaté sur `secondary`).
const borderColors = (el: HTMLElement) =>
  [...el.classList].filter((c) => /^border-(transparent|border|border-strong)$/.test(c));

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'variante %s : une seule couleur de bordure',
    (variant) => {
      render(Button, { variant });
      expect(borderColors(screen.getByRole('button'))).toHaveLength(1);
    },
  );

  it('secondaire : bordure visible', () => {
    render(Button, { variant: 'secondary' });
    expect(screen.getByRole('button')).toHaveClass('border-border-strong');
  });

  it('désactivé : une seule couleur de bordure', () => {
    render(Button, { variant: 'secondary', disabled: true });
    expect(borderColors(screen.getByRole('button'))).toEqual(['border-border']);
  });

  it('rend un lien avec href', () => {
    render(Button, { href: '/salles' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/salles');
  });
});
