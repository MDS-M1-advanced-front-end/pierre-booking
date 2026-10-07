import type { Reservation } from '@room-booking/core';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import ReservationItem from './ReservationItem.svelte';

const reservation: Reservation = {
  id: 'res-1',
  roomId: 'room-1',
  userId: 'user-1',
  startAt: '2026-10-12T09:00:00Z',
  endAt: '2026-10-12T12:00:00Z',
  status: 'CONFIRMED',
  numberOfParticipants: 8,
  totalAmount: 135,
  comment: 'Atelier UX',
};

/** Les textes produits par `Intl` contiennent des espaces insécables : on les normalise. */
const text = (element: Element | null) => element?.textContent.replace(/\s+/g, ' ').trim();

describe('ReservationItem', () => {
  it('affiche le nom de la salle en titre lien vers sa fiche', () => {
    render(ReservationItem, { reservation, roomName: 'Salle Voltaire' });
    const heading = screen.getByRole('heading', { level: 3, name: 'Salle Voltaire' });
    const link = screen.getByRole('link', { name: 'Salle Voltaire' });
    expect(heading).toContainElement(link);
    expect(link).toHaveAttribute('href', '/salles/room-1');
  });

  it('accepte une autre destination pour le lien', () => {
    render(ReservationItem, {
      reservation,
      roomName: 'Salle Voltaire',
      roomHref: '/gestion/salles/room-1',
    });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/gestion/salles/room-1');
  });

  it('affiche statut, horaire en heure de Paris, participants, montant et commentaire', () => {
    const { container } = render(ReservationItem, { reservation, roomName: 'Salle Voltaire' });
    const item = container.querySelector('li');
    expect(screen.getByText('Confirmée')).toBeInTheDocument();
    expect(text(item)).toContain('lun. 12 oct. 2026 · 11:00 – 14:00');
    expect(text(item)).toContain('8 participants');
    expect(text(item)).toContain('135 €');
    expect(screen.getByText('« Atelier UX »')).toBeInTheDocument();
  });

  it('a un bloc date décoratif (jour et mois)', () => {
    const { container } = render(ReservationItem, { reservation, roomName: 'Salle Voltaire' });
    const date = container.querySelector('[aria-hidden="true"]');
    expect(date?.tagName).toBe('P');
    expect(text(date)).toBe('12 oct.');
  });

  it('n’affiche ni commentaire ni participants absents, et accorde « participant »', () => {
    const { container } = render(ReservationItem, {
      reservation: { ...reservation, comment: undefined, numberOfParticipants: 1 },
      roomName: 'Salle Voltaire',
    });
    expect(text(container.querySelector('li'))).toContain('1 participant');
    expect(text(container.querySelector('li'))).not.toContain('participants');
    expect(screen.queryByText(/«/)).not.toBeInTheDocument();
  });

  it('affiche le demandeur si fourni', () => {
    render(ReservationItem, {
      reservation,
      roomName: 'Salle Voltaire',
      requesterName: 'Léa Martin',
    });
    expect(screen.getByText('Léa Martin').tagName).toBe('STRONG');
    expect(screen.getByText(/Demande de/)).toBeInTheDocument();
  });

  it('atténue une réservation passée', () => {
    const { container } = render(ReservationItem, {
      reservation,
      roomName: 'Salle Voltaire',
      past: true,
    });
    expect(container.querySelector('li')).toHaveClass('res-item--past');
  });

  it('rend la zone d’actions seulement si elle est fournie', () => {
    const actions = createRawSnippet(() => ({
      render: () => '<button type="button">Annuler</button>',
    }));
    const { unmount } = render(ReservationItem, { reservation, roomName: 'Salle Voltaire' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    render(ReservationItem, { reservation, roomName: 'Salle Voltaire', actions });
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });
});
