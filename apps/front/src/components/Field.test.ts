import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FieldWithInput from './Field.test.svelte';

describe('Field + Input', () => {
  it('relie le libellé au contrôle et marque le champ obligatoire', () => {
    render(FieldWithInput);
    const input = screen.getByLabelText(/Adresse e-mail/);
    expect(input).toHaveAttribute('id', 'email');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    // L'astérisque est masqué aux technologies d'assistance.
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('expose aria-invalid et aria-describedby vers le message en erreur', () => {
    render(FieldWithInput, {
      error: 'Le mot de passe contient 6 caractères, il en faut au moins 8.',
      hint: '8 caractères minimum',
    });
    const input = screen.getByLabelText(/Adresse e-mail/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
    expect(input).toHaveAccessibleDescription(
      '8 caractères minimum Le mot de passe contient 6 caractères, il en faut au moins 8.',
    );
    expect(document.getElementById('email-error')).toHaveTextContent(
      'Le mot de passe contient 6 caractères, il en faut au moins 8.',
    );
  });

  it('décrit le contrôle par son suffixe', () => {
    render(FieldWithInput, { suffix: 'pers.' });
    const input = screen.getByLabelText(/Adresse e-mail/);
    expect(input).toHaveAttribute('aria-describedby', 'email-suffix');
    expect(input).toHaveClass('rounded-r-none');
  });

  it('transmet bind:value et calcule le message à la sortie du champ', async () => {
    const user = userEvent.setup();
    render(FieldWithInput);
    const input = screen.getByLabelText(/Adresse e-mail/);

    // Champ vide et obligatoire.
    await fireEvent.blur(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription("L'adresse e-mail est obligatoire.");

    await user.type(input, 'lea@');
    expect(screen.getByTestId('value')).toHaveTextContent('lea@');
    await fireEvent.blur(input);
    expect(input).toHaveAccessibleDescription(
      'Saisissez une adresse e-mail valide, par exemple nom@domaine.fr',
    );

    await user.type(input, 'quorum.fr');
    await fireEvent.blur(input);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById('email-error')).toBeNull();
  });
});
