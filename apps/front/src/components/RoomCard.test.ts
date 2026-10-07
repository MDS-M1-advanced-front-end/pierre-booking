import type { Room } from '@room-booking/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RoomCard from './RoomCard.svelte';

const room: Room = {
  id: 'abc',
  name: 'Salle Voltaire',
  capacity: 12,
  location: 'Paris 11e',
  equipment: ['Wi-Fi'],
  pricePerHour: 45,
  status: 'ACTIVE',
  imageUrl: 'https://example.com/voltaire.jpg',
};

describe('RoomCard', () => {
  it('n’a qu’un lien, sur le nom de la salle, vers sa fiche', () => {
    render(RoomCard, { room });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Salle Voltaire');
    expect(links[0]).toHaveAttribute('href', '/salles/abc');
    expect(screen.getByRole('heading', { level: 3 })).toContainElement(links[0]);
  });

  it('accepte une autre destination', () => {
    render(RoomCard, { room, href: '/gestion/salles/abc' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/gestion/salles/abc');
  });

  it('a une image décorative', () => {
    const { container } = render(RoomCard, { room });
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('n’affiche le badge « Inactive » que pour une salle inactive', () => {
    const { unmount } = render(RoomCard, { room });
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    unmount();

    render(RoomCard, { room: { ...room, status: 'INACTIVE' } });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
