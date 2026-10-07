import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DatePager from './DatePager.svelte';

function setup(props: { value: string; min?: string }) {
  const onchange = vi.fn();
  render(DatePager, { id: 'slot-date', label: 'Date', onchange, ...props });
  return {
    onchange,
    input: screen.getByLabelText<HTMLInputElement>('Date'),
    previous: screen.getByRole('button', { name: 'Jour précédent' }),
    next: screen.getByRole('button', { name: 'Jour suivant' }),
  };
}

describe('DatePager', () => {
  it('affiche un champ date libellé avec la valeur', () => {
    const { input } = setup({ value: '2026-11-16' });
    expect(input).toHaveAttribute('type', 'date');
    expect(input.value).toBe('2026-11-16');
  });

  it('passe au jour suivant, y compris au changement de mois', async () => {
    const user = userEvent.setup();
    const { input, next, onchange } = setup({ value: '2026-11-30' });
    await user.click(next);
    expect(onchange).toHaveBeenLastCalledWith('2026-12-01');
    expect(input.value).toBe('2026-12-01');
  });

  it('revient au jour précédent', async () => {
    const user = userEvent.setup();
    const { input, previous, onchange } = setup({ value: '2027-01-01' });
    await user.click(previous);
    expect(onchange).toHaveBeenLastCalledWith('2026-12-31');
    expect(input.value).toBe('2026-12-31');
  });

  it('ne recule pas avant min : bouton aria-disabled, focus conservé', async () => {
    const user = userEvent.setup();
    const { input, previous, onchange } = setup({ value: '2026-10-08', min: '2026-10-07' });
    expect(input).toHaveAttribute('min', '2026-10-07');

    await user.click(previous);
    expect(onchange).toHaveBeenLastCalledWith('2026-10-07');
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).toHaveFocus();

    await user.click(previous);
    expect(onchange).toHaveBeenCalledOnce();
    expect(input.value).toBe('2026-10-07');
  });

  it('propage une date saisie dans le champ, ignore un champ vidé', async () => {
    const user = userEvent.setup();
    const { input, onchange } = setup({ value: '2026-11-16' });

    await user.clear(input);
    expect(onchange).not.toHaveBeenCalled();

    await user.type(input, '2026-11-20');
    expect(onchange).toHaveBeenLastCalledWith('2026-11-20');
  });
});
