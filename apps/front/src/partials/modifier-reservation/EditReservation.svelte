<!--
  Îlot de l'écran 07 (`client:only="svelte"`) : garde d'accès (clients uniquement), puis le
  formulaire de modification de la réservation `reservationId`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import EditReservationForm from './EditReservationForm.svelte';

  interface Props {
    /** Identifiant de la réservation (paramètre de route). */
    reservationId: string;
  }

  let { reservationId }: Props = $props();
</script>

<RequireAuth roles={['CLIENT']}>
  <EditReservationForm {reservationId} />
</RequireAuth>
