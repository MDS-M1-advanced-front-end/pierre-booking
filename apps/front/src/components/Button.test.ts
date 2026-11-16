import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { network } from '../data/offline/network.svelte';
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

  describe('needsNetwork', () => {
    afterEach(() => {
      network.online = true;
    });

    it('hors ligne : inactif, annoncé, et le clic est sans effet', async () => {
      network.online = false;
      const onclick = vi.fn();
      render(Button, { needsNetwork: true, onclick });
      const button = screen.getByRole('button', { name: /indisponible hors ligne/ });

      expect(button).toHaveAttribute('aria-disabled', 'true');
      await fireEvent.click(button);
      expect(onclick).not.toHaveBeenCalled();
    });

    it.each([
      [false, 0],
      [true, 1],
    ])('formulaire : en ligne %s → %i envoi', async (online, sent) => {
      network.online = online;
      const submit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      const form = document.createElement('form');
      form.addEventListener('submit', submit);
      document.body.append(form);
      render(Button, { target: form, props: { needsNetwork: true, type: 'submit' } });

      await fireEvent.click(screen.getByRole('button'));
      expect(submit).toHaveBeenCalledTimes(sent);
      form.remove();
    });

    it('en ligne : se comporte normalement', async () => {
      const onclick = vi.fn();
      render(Button, { needsNetwork: true, onclick });
      await fireEvent.click(screen.getByRole('button'));
      expect(onclick).toHaveBeenCalledOnce();
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });

    it('sans needsNetwork, reste actif hors ligne', async () => {
      network.online = false;
      const onclick = vi.fn();
      render(Button, { onclick });
      await fireEvent.click(screen.getByRole('button'));
      expect(onclick).toHaveBeenCalledOnce();
    });
  });
});
