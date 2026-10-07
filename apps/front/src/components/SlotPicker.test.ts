import type { AvailabilitySlot } from '@room-booking/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EMPTY_SELECTION, type SlotSelection } from '../utils/slotSelection';
import SlotPicker from './SlotPicker.svelte';

// Journée du mock : 08:00 libre, 09:00 → 12:00 réservés, 12:00 et 13:00 libres, 14:00 réservé.
const slot = (start: number, available = true): AvailabilitySlot => ({
  startTime: `${String(start).padStart(2, '0')}:00:00`,
  endTime: `${String(start + 1).padStart(2, '0')}:00:00`,
  available,
});

const slots = [
  slot(8),
  slot(9, false),
  slot(10, false),
  slot(11, false),
  slot(12),
  slot(13),
  slot(14, false),
  slot(15),
  slot(16),
  slot(17),
];

const label = 'Créneaux du lundi 16 novembre 2026';

function setup(props: Partial<Parameters<typeof render<typeof SlotPicker>>[1]> = {}) {
  return render(SlotPicker, { slots, selection: EMPTY_SELECTION, label, ...props });
}

const slotButton = (name: RegExp) => screen.getByRole('button', { name });

describe('SlotPicker', () => {
  it('rend une grille nommée par le libellé, un bouton par créneau', () => {
    setup();
    const group = screen.getByRole('group', { name: label });
    expect(group.querySelectorAll('button')).toHaveLength(slots.length);
    expect(slotButton(/^08:00 à 09:00$/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Aucun créneau sélectionné');
  });

  it('sélectionne une plage par deux clics et annonce le statut', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(slotButton(/^15:00/));
    expect(slotButton(/^15:00/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Sélection : de 15:00 à 16:00 (1 heure)');

    await user.click(slotButton(/^17:00/));
    for (const time of [/^15:00/, /^16:00/, /^17:00/]) {
      expect(slotButton(time)).toHaveAttribute('aria-pressed', 'true');
    }
    expect(slotButton(/^12:00/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Sélection : de 15:00 à 18:00 (3 heures)');
  });

  it('met à jour la sélection liée (bind:selection)', async () => {
    const user = userEvent.setup();
    let selection: SlotSelection = EMPTY_SELECTION;
    render(SlotPicker, {
      slots,
      label,
      get selection() {
        return selection;
      },
      set selection(value) {
        selection = value;
      },
    });
    await user.click(slotButton(/^12:00/));
    await user.click(slotButton(/^13:00/));
    expect(selection).toEqual({ start: 4, end: 5 });
  });

  it('un créneau indisponible est barré, aria-disabled et ne se sélectionne pas', async () => {
    const user = userEvent.setup();
    setup();
    const booked = slotButton(/^09:00 Réservé$/);
    expect(booked).toHaveAttribute('aria-disabled', 'true');
    expect(booked).not.toHaveAttribute('aria-pressed');
    expect(booked).toHaveClass('line-through', 'border-dashed');

    await user.click(booked);
    expect(booked).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('status')).toHaveTextContent('Aucun créneau sélectionné');
  });

  it('ne crée pas de plage par-dessus un créneau indisponible : le second clic devient le début', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(slotButton(/^08:00/));
    await user.click(slotButton(/^12:00/));
    expect(slotButton(/^08:00/)).toHaveAttribute('aria-pressed', 'false');
    expect(slotButton(/^12:00/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('de 12:00 à 13:00 (1 heure)');
  });

  it('alsoSelectable rend sélectionnables des créneaux indisponibles (écran 07)', async () => {
    const user = userEvent.setup();
    setup({ alsoSelectable: (s: AvailabilitySlot) => s.startTime < '12:00' });
    const nine = slotButton(/^09:00 à 10:00$/);
    expect(nine).not.toHaveAttribute('aria-disabled');

    await user.click(slotButton(/^08:00/));
    await user.click(slotButton(/^11:00/));
    expect(screen.getByRole('status')).toHaveTextContent('de 08:00 à 12:00 (4 heures)');
    // Le créneau de 14:00 reste indisponible.
    expect(slotButton(/^14:00 Réservé$/)).toHaveAttribute('aria-disabled', 'true');
  });

  it('mode inert : grille inerte, sans statut ni légende, clics ignorés', async () => {
    const { container } = setup({ inert: true, selection: { start: 7, end: 8 } });
    const grid = container.querySelector<HTMLElement>('[role="group"]');
    // jsdom ne connaît pas `inert` : Svelte le pose en propriété (attribut dans un vrai navigateur).
    expect(grid?.inert).toBe(true);
    expect(slotButton(/^15:00/)).toHaveAttribute('aria-pressed', 'true');
    // pointer-events: none n'est pas vérifié par jsdom : on s'assure que le clic est sans effet.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(slotButton(/^12:00/));
    expect(slotButton(/^12:00/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.textContent).not.toContain('Libre');
  });

  it('affiche un squelette pendant le chargement', () => {
    const { container } = setup({ loading: true });
    expect(screen.queryByRole('group')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des créneaux');
  });

  it('indique une journée sans créneau', () => {
    setup({ slots: [] });
    expect(screen.getByText('Aucun créneau ce jour.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
