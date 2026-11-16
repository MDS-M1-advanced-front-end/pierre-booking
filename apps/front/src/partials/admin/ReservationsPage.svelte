<!--
  Îlot de l'administration (toutes les réservations) : garde d'accès (administrateurs) autour de
  `ReservationList`. Monté en `client:only="svelte"` par `pages/admin/reservations.astro`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import ReservationList from './ReservationList.svelte';
</script>

<RequireAuth roles={['ADMINISTRATEUR']}>
  <ReservationList />
</RequireAuth>
