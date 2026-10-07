import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import Modal from './Modal.svelte';

/*
 * jsdom (30.x) connaît `<dialog>` mais n'implémente ni `showModal()` ni `close()`, ni la fermeture
 * par Échap (événement `cancel` puis `close`), ni le piège du focus. On remplace les deux méthodes
 * par l'équivalent minimal (attribut `open` + événement `close`) et on simule Échap comme le fait
 * le navigateur. Le focus piégé et le fond inerte ne sont donc vérifiables qu'en e2e (Playwright).
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>('button, [href], input')?.focus();
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  document.body.replaceChildren();
});

/** Comportement du navigateur sur Échap dans une modale : `cancel`, puis fermeture. */
function pressEscape(dialog: HTMLDialogElement) {
  const cancel = new Event('cancel', { cancelable: true });
  if (dialog.dispatchEvent(cancel)) dialog.close();
}

const body = createRawSnippet(() => ({
  render: () => '<p>Le créneau sera libéré pour d’autres personnes.</p>',
}));
const footer = createRawSnippet(() => ({
  render: () => '<button type="button">Annuler la réservation</button>',
}));

function setup(onclose = vi.fn()) {
  const trigger = document.createElement('button');
  trigger.textContent = 'Annuler';
  document.body.append(trigger);
  trigger.focus();

  const result = render(Modal, {
    open: false,
    title: 'Annuler cette réservation ?',
    children: body,
    footer,
    onclose,
  });
  const dialog = document.querySelector('dialog');
  if (!dialog) throw new Error('dialog absent');
  return { ...result, dialog, trigger, onclose };
}

describe('Modal', () => {
  it('est fermée par défaut puis s’ouvre avec showModal()', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const { dialog, rerender } = setup();
    expect(dialog.open).toBe(false);

    await rerender({ open: true });
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    showModal.mockRestore();
  });

  it('a pour nom accessible son titre et affiche corps et pied', async () => {
    const { rerender } = setup();
    await rerender({ open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Annuler cette réservation ?');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Annuler cette réservation ?',
    );
    expect(screen.getByText(/libéré/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler la réservation' })).toBeInTheDocument();
  });

  it('se ferme avec Échap, appelle onclose et rend le focus au déclencheur', async () => {
    const { dialog, trigger, onclose, rerender } = setup();
    await rerender({ open: true });
    expect(document.activeElement).not.toBe(trigger);

    pressEscape(dialog);
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it('se ferme avec le bouton « Fermer » et rend le focus', async () => {
    const user = userEvent.setup();
    const { dialog, trigger, onclose, rerender } = setup();
    await rerender({ open: true });

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it('se ferme quand le parent repasse open à false', async () => {
    const { dialog, onclose, rerender } = setup();
    await rerender({ open: true });
    await rerender({ open: false });
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
  });
});
