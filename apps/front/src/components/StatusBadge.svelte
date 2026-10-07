<script lang="ts" module>
  import type { ReservationStatus } from '@room-booking/core';

  /** Libellé français de chaque statut de réservation (maquette, composants.html § Badge). */
  export const statusLabel: Record<ReservationStatus, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    REJECTED: 'Refusée',
    CANCELLED: 'Annulée',
    COMPLETED: 'Terminée',
  };

  const statusVariant = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
  } as const satisfies Record<ReservationStatus, string>;
</script>

<script lang="ts">
  import Badge from './Badge.svelte';

  interface Props {
    status: ReservationStatus;
  }

  let { status }: Props = $props();
</script>

<Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
