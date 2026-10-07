import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ErrorSummary from './ErrorSummary.svelte';

const emailError = { id: 'reg-email', label: 'Adresse e-mail', message: 'format invalide' };
const passwordError = {
  id: 'reg-password',
  label: 'Mot de passe',
  message: '8 caractères minimum',
};
const errors = [emailError, passwordError];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ErrorSummary', () => {
  it("n'affiche rien sans erreur", () => {
    render(ErrorSummary, { errors: [] });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('liste les erreurs en liens « Libellé : message » vers les champs', () => {
    render(ErrorSummary, { errors, title: '2 erreurs empêchent la création du compte' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      '2 erreurs empêchent la création du compte',
    );
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'Adresse e-mail : format invalide',
      'Mot de passe : 8 caractères minimum',
    ]);
    expect(links[0]).toHaveAttribute('href', '#reg-email');
    expect(links[1]).toHaveAttribute('href', '#reg-password');
  });

  it('accorde le titre par défaut au nombre d’erreurs', async () => {
    const { rerender } = render(ErrorSummary, { errors: [emailError] });
    expect(screen.getByRole('alert')).toHaveTextContent("1 erreur empêche l'enregistrement");

    await rerender({ errors });
    expect(screen.getByRole('alert')).toHaveTextContent("2 erreurs empêchent l'enregistrement");
  });

  it('prend le focus quand des erreurs apparaissent', async () => {
    const { rerender } = render(ErrorSummary, { errors: [] });
    expect(document.activeElement).toBe(document.body);

    await rerender({ errors });
    const summary = screen.getByRole('alert').parentElement;
    expect(summary).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(summary);
  });

  it('ne reprend pas le focus quand la liste change sans se vider, sauf via focus()', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    const { rerender, component } = render(ErrorSummary, { errors });
    input.focus();

    await rerender({ errors: [passwordError] });
    expect(document.activeElement).toBe(input);

    (component as { focus: () => void }).focus();
    expect(document.activeElement).toBe(screen.getByRole('alert').parentElement);
  });

  it('un lien place le focus sur le champ correspondant', async () => {
    const input = document.createElement('input');
    input.id = 'reg-password';
    document.body.append(input);
    render(ErrorSummary, { errors });

    await userEvent.click(screen.getByRole('link', { name: /Mot de passe/ }));
    expect(document.activeElement).toBe(input);
  });
});
