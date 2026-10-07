<!--
  Îlot de l'écran 06 (`client:only="svelte"`) : réservé aux clients connectés. Un visiteur est
  renvoyé vers `/connexion?redirect=%2Freservations`, un gestionnaire vers « Accès refusé ».
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import ReservationList from './ReservationList.svelte';
</script>

<RequireAuth roles={['CLIENT']}>
  {#snippet children(user)}
    <ReservationList {user} />
  {/snippet}
</RequireAuth>
