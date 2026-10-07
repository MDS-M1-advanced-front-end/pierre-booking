import { render } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import Icon from './Icon.svelte';

it('applique la taille par défaut sans classe de taille', () => {
  const { container } = render(Icon, { name: 'pin' });
  expect(container.querySelector('svg')).toHaveClass('size-[1.25em]');
});

it("laisse la taille de l'appelant l'emporter", () => {
  const { container } = render(Icon, { name: 'building', class: 'size-10 p-2' });
  const svg = container.querySelector('svg');
  expect(svg).toHaveClass('size-10');
  expect(svg).not.toHaveClass('size-[1.25em]');
});
