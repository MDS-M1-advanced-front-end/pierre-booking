import type { ReservationStatus } from '@room-booking/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.svelte';

describe('StatusBadge', () => {
  it.each<[ReservationStatus, string]>([
    ['PENDING', 'En attente'],
    ['CONFIRMED', 'Confirmée'],
    ['REJECTED', 'Refusée'],
    ['CANCELLED', 'Annulée'],
    ['COMPLETED', 'Terminée'],
  ])('affiche le libellé de %s', (status, label) => {
    render(StatusBadge, { status });
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
